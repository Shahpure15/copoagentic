from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Teacher, COHistory, Subject
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
    # Mocking historical suggestions
    # from agents.history_advisor import generate_suggestions
    # suggestions = await generate_suggestions(subject_id, body.get("academic_year"), db)
    suggestions = [
        {
            "co_id": "CO3",
            "type": "simplify_blooms",
            "reason": "CO3 attainment was 41% and 38% in the last two years — students are struggling",
            "suggested_change": "Reduce Bloom's level from L5 (Evaluate) to L3 (Apply)",
            "confidence": 0.87
        }
    ]
    return {"suggestions": suggestions}

@router.post("/session/{session_id}/archive")
async def archive_session_to_history(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Mocking archive action
    # from agents.archiver import archive_session
    # await archive_session(session_id, db)
    return {"ok": True}
