from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from database import get_db
from models import Session, Subject, Teacher, StudentBatch, ProgramOutcome
from schemas.deps import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class CreateSessionRequest(BaseModel):
    subject_name: str
    subject_code: Optional[str] = None
    academic_year: str
    year_of_study: str  # FY | SY | TY
    level1_threshold: float = 55.0
    level2_threshold: float = 65.0
    level3_threshold: float = 75.0


class UpdateSessionRequest(BaseModel):
    level1_threshold: Optional[float] = None
    level2_threshold: Optional[float] = None
    level3_threshold: Optional[float] = None
    academic_year: Optional[str] = None
    year_of_study: Optional[str] = None


def session_to_dict(s: Session) -> dict:
    return {
        "id": str(s.id),
        "academic_year": s.academic_year,
        "year_of_study": s.year_of_study,
        "status": s.status,
        "current_phase": s.current_phase,
        "level1_threshold": s.level1_threshold,
        "level2_threshold": s.level2_threshold,
        "level3_threshold": s.level3_threshold,
        "syllabus_text": s.syllabus_text,
        "teaching_philosophy": s.teaching_philosophy,
        "is_locked": s.is_locked,
        "excel_report_path": s.excel_report_path,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        "subject_id": str(s.subject_id) if s.subject_id else None,
        "teacher_id": str(s.teacher_id) if s.teacher_id else None,
        "cos": [
            {
                "co_id": c.co_id, "statement": c.statement,
                "blooms_level": c.blooms_level, "blooms_keyword": c.blooms_keyword,
                "confidence_score": c.confidence_score,
                "validation_status": c.validation_status,
                "rejection_reason": c.rejection_reason,
                "version": c.version, "is_current": c.is_current,
            }
            for c in (s.course_outcomes or []) if c.is_current
        ],
        "pos": [
            {"po_id": p.po_id, "statement": p.statement}
            for p in (s.program_outcomes or [])
        ],
        "mappings": [
            {
                "co_id": m.co_id, "po_id": m.po_id, "strength": m.strength,
                "reasoning": m.reasoning, "confidence": m.confidence,
                "validated": m.validated, "manually_overridden": m.manually_overridden,
                "override_reason": m.override_reason,
            }
            for m in (s.mappings or [])
        ],
        "batches": [
            {
                "id": str(b.id), "name": b.name,
                "co_attainments": [
                    {
                        "co_id": a.co_id, "avg_percentage": a.avg_percentage,
                        "level_1_students_pct": a.level_1_students_pct,
                        "level_2_students_pct": a.level_2_students_pct,
                        "level_3_students_pct": a.level_3_students_pct,
                        "achieved_level": a.achieved_level,
                        "threshold_used": a.threshold_used,
                    } for a in (b.co_attainments or [])
                ],
                "po_attainments": [
                    {
                        "po_id": a.po_id, "weighted_attainment": a.weighted_attainment,
                        "contributing_cos": a.contributing_cos,
                        "is_weak": a.is_weak, "weakness_reason": a.weakness_reason,
                    } for a in (b.po_attainments or [])
                ]
            } for b in (s.batches or [])
        ],
        "recommendations": [
            {
                "id": str(r.id), "target": r.target, "issue": r.issue,
                "suggestion": r.suggestion, "priority": r.priority,
                "accepted": r.accepted, "teacher_note": r.teacher_note,
                "implemented": r.implemented,
            }
            for r in (s.recommendations or [])
        ],
    }


@router.post("")
async def create_session(
    body: CreateSessionRequest,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    subject = None
    if body.subject_code and current_user.department_id:
        result = await db.execute(
            select(Subject).where(
                Subject.department_id == current_user.department_id,
                Subject.code == body.subject_code
            )
        )
        subject = result.scalar_one_or_none()

    if not subject:
        subject = Subject(
            name=body.subject_name,
            code=body.subject_code,
            department_id=current_user.department_id,
        )
        db.add(subject)
        await db.flush()

    session = Session(
        teacher_id=current_user.id,
        subject_id=subject.id,
        academic_year=body.academic_year,
        year_of_study=body.year_of_study,
        level1_threshold=body.level1_threshold,
        level2_threshold=body.level2_threshold,
        level3_threshold=body.level3_threshold,
    )
    db.add(session)
    await db.flush()
    await db.refresh(session)
    return {"id": str(session.id), "subject_name": subject.name, "subject_id": str(subject.id)}


@router.get("")
async def list_sessions(
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session, Subject)
        .join(Subject, Session.subject_id == Subject.id, isouter=True)
        .where(Session.teacher_id == current_user.id)
        .order_by(Session.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": str(s.id),
            "subject_name": sub.name if sub else "Unknown",
            "subject_code": sub.code if sub else None,
            "academic_year": s.academic_year,
            "year_of_study": s.year_of_study,
            "status": s.status,
            "current_phase": s.current_phase,
            "is_locked": s.is_locked,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s, sub in rows
    ]


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.refresh(session, ["course_outcomes", "program_outcomes", "mappings", "recommendations", "batches"])
    # Need to load nested attainments within batches
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Session)
        .options(
            selectinload(Session.batches).selectinload(StudentBatch.co_attainments),
            selectinload(Session.batches).selectinload(StudentBatch.po_attainments)
        )
        .where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()

    sub_result = await db.execute(select(Subject).where(Subject.id == session.subject_id))
    subject = sub_result.scalar_one_or_none()

    data = session_to_dict(session)
    data["subject_name"] = subject.name if subject else "Unknown"
    data["subject_code"] = subject.code if subject else None
    
    if session.current_phase in [1, 2] and subject:
        from agents.history_analyzer import get_historical_insights
        insights = await get_historical_insights(str(subject.id), db)
        data["historical_insights"] = insights.get("insights", [])
        
    return data


@router.patch("/{session_id}")
async def update_session(
    session_id: str,
    body: UpdateSessionRequest,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.is_locked:
        raise HTTPException(status_code=400, detail="Session is locked")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(session, field, value)
    session.updated_at = datetime.utcnow()
    db.add(session)
    await db.commit()
    return {"ok": True}


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    return {"ok": True}


@router.get("/{session_id}/status")
async def get_status(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session.status, Session.current_phase, Session.is_locked)
        .where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": row[0], "current_phase": row[1], "is_locked": row[2]}

class UpdatePORequest(BaseModel):
    statement: str

@router.post("/{session_id}/lock")
async def lock_session(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.is_locked = True
    session.updated_at = datetime.utcnow()
    await db.commit()
    return {"ok": True, "message": "Curriculum framework locked"}

@router.put("/{session_id}/pos/{po_id}")
async def update_po(
    session_id: str,
    po_id: str,
    body: UpdatePORequest,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.is_locked:
        raise HTTPException(status_code=403, detail="Session is locked. Cannot modify curriculum.")
        
    po_result = await db.execute(
        select(ProgramOutcome).where(ProgramOutcome.session_id == session_id, ProgramOutcome.po_id == po_id)
    )
    po = po_result.scalar_one_or_none()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
        
    po.statement = body.statement
    await db.commit()
    return {"ok": True, "message": "PO updated successfully"}
