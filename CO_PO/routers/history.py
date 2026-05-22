from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Teacher, COHistory, Subject, AuditLog, CourseOutcome, COPOMapping
from schemas.deps import get_current_user

router = APIRouter()

@router.get("/subject/{subject_id}/analysis")
async def get_subject_history(
    subject_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub_result = await db.execute(select(Subject).where(Subject.id == subject_id))
    subject = sub_result.scalar_one_or_none()
    if not subject:
        raise HTTPException(404, "Subject not found")

    history_result = await db.execute(
        select(COHistory)
        .where(COHistory.subject_id == subject_id)
        .order_by(COHistory.academic_year, COHistory.co_id)
    )
    records = history_result.scalars().all()

    co_map = {}
    years_seen = set()
    for r in records:
        years_seen.add(r.academic_year)
        if r.co_id not in co_map:
            co_map[r.co_id] = {
                "co_id": r.co_id,
                "statements_by_year": {},
                "attainment_by_year": {},
                "achieved_level_by_year": {},
                "was_weak_by_year": {},
            }
        co_map[r.co_id]["statements_by_year"][r.academic_year] = r.statement
        co_map[r.co_id]["attainment_by_year"][r.academic_year] = r.avg_attainment
        co_map[r.co_id]["achieved_level_by_year"][r.academic_year] = r.achieved_level
        co_map[r.co_id]["was_weak_by_year"][r.academic_year] = r.was_weak

    sorted_years = sorted(years_seen)
    co_trends = []
    for co in co_map.values():
        attainments = [
            co["attainment_by_year"].get(y)
            for y in sorted_years
            if co["attainment_by_year"].get(y) is not None
        ]
        if len(attainments) >= 2:
            delta = attainments[-1] - attainments[-2]
            trend = "declining" if delta < -5 else ("improving" if delta > 5 else "stable")
        else:
            trend = "unknown"

        co["trend"] = trend
        co["alert"] = trend == "declining" or co.get("was_weak_by_year", {}).get(sorted_years[-1] if sorted_years else "", False)
        co_trends.append(co)

    return {
        "subject_name": subject.name,
        "subject_code": subject.code,
        "years": sorted_years,
        "co_trends": co_trends,
    }

@router.post("/subject/{subject_id}/suggest")
async def get_auto_suggestions(
    subject_id: str,
    body: dict,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from agents.history_analyzer import get_historical_insights
    data = await get_historical_insights(subject_id, db)
    return {"suggestions": data.get("insights", [])}

@router.post("/session/{session_id}/archive")
async def archive_session_to_history(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from services.archiver_service import archive_session
    success = await archive_session(session_id, db)
    if not success:
        raise HTTPException(400, "Failed to archive session")
    return {"ok": True}

@router.get("/session/{session_id}/versions")
async def get_session_versions(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.session_id == session_id, AuditLog.agent == "Mediator")
        .order_by(AuditLog.created_at.desc())
    )
    logs = result.scalars().all()
    
    return [
        {
            "id": str(log.id),
            "action": log.action,
            "detail": log.detail,
            "metadata": log.log_metadata,
            "created_at": log.created_at.isoformat() if log.created_at else None
        }
        for log in logs
    ]

@router.post("/session/{session_id}/rollback/{audit_id}")
async def rollback_to_version(
    session_id: str,
    audit_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(AuditLog).where(AuditLog.id == audit_id, AuditLog.session_id == session_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(404, "Audit log not found")
        
    meta = log.log_metadata
    if not meta or "old_value" not in meta:
        raise HTTPException(400, "Cannot rollback this action (no old_value stored)")
        
    old_value = meta["old_value"]
    field = meta["field"]
    
    if log.action in ["update_co", "rollback_co"]:
        co_id = meta["co_id"]
        co_res = await db.execute(select(CourseOutcome).where(CourseOutcome.session_id == session_id, CourseOutcome.co_id == co_id, CourseOutcome.is_current == True))
        co = co_res.scalar_one_or_none()
        if co and hasattr(co, field):
            current_value = getattr(co, field)
            setattr(co, field, old_value)
            db.add(co)
            
            # Log the rollback itself
            db.add(AuditLog(
                session_id=session_id, agent="Mediator", action="rollback_co",
                detail=f"Rolled back {co_id} {field} to {old_value}",
                log_metadata={"co_id": co_id, "field": field, "old_value": current_value, "new_value": old_value, "rollback_of": str(log.id)}
            ))
            
    elif log.action in ["update_mapping", "rollback_mapping"]:
        co_id = meta["co_id"]
        po_id = meta["po_id"]
        map_res = await db.execute(select(COPOMapping).where(COPOMapping.session_id == session_id, COPOMapping.co_id == co_id, COPOMapping.po_id == po_id))
        mapping = map_res.scalar_one_or_none()
        if mapping and hasattr(mapping, field):
            current_value = getattr(mapping, field)
            setattr(mapping, field, old_value)
            db.add(mapping)
            
            db.add(AuditLog(
                session_id=session_id, agent="Mediator", action="rollback_mapping",
                detail=f"Rolled back Mapping {co_id}-{po_id} {field} to {old_value}",
                log_metadata={"co_id": co_id, "po_id": po_id, "field": field, "old_value": current_value, "new_value": old_value, "rollback_of": str(log.id)}
            ))
            
    await db.commit()
    return {"ok": True, "message": "Rolled back successfully"}

