import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Session, Teacher
from schemas.deps import get_current_user

router = APIRouter()
OUTPUT_DIR = "data/output"

@router.get("/{session_id}/download")
async def download_report(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if not session.excel_report_path:
        raise HTTPException(404, "Report not generated yet")

    path = session.excel_report_path
    if not os.path.exists(path):
        raise HTTPException(404, "Report file missing — re-run pipeline")

    filename = f"COPO_Report_{session_id[:8]}.xlsx"
    return FileResponse(path, filename=filename, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@router.get("/{session_id}/preview")
async def get_report_preview(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")

    await db.refresh(session, ["co_attainments", "po_attainments", "recommendations", "course_outcomes"])

    return {
        "session_id": session_id,
        "co_attainments": [
            {
                "co_id": a.co_id,
                "avg_percentage": a.avg_percentage,
                "achieved_level": a.achieved_level,
                "level_1_pct": a.level_1_students_pct,
                "level_2_pct": a.level_2_students_pct,
                "level_3_pct": a.level_3_students_pct,
            }
            for a in (session.co_attainments or [])
        ],
        "po_attainments": [
            {
                "po_id": a.po_id,
                "weighted_attainment": a.weighted_attainment,
                "is_weak": a.is_weak,
                "contributing_cos": a.contributing_cos,
            }
            for a in (session.po_attainments or [])
        ],
        "weak_pos": [a.po_id for a in (session.po_attainments or []) if a.is_weak],
        "recommendations": [
            {
                "id": str(r.id),
                "target": r.target,
                "issue": r.issue,
                "suggestion": r.suggestion,
                "priority": r.priority,
                "accepted": r.accepted,
            }
            for r in (session.recommendations or [])
        ],
    }
