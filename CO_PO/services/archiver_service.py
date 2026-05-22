from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from models import Session, COHistory

async def archive_session(session_id: str, db: AsyncSession):
    result = await db.execute(
        select(Session)
        .options(
            selectinload(Session.course_outcomes),
            selectinload(Session.co_attainments),
            selectinload(Session.mappings)
        )
        .where(Session.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session or not session.subject_id:
        return False
        
    for co in session.course_outcomes:
        if not co.is_current:
            continue
            
        attainment = next((a for a in session.co_attainments if a.co_id == co.co_id), None)
        
        # Determine if weak. Typically achieved_level 1 is weak.
        was_weak = False
        achieved = None
        avg_att = None
        if attainment:
            achieved = attainment.achieved_level
            avg_att = attainment.avg_percentage
            if achieved == 1 or avg_att < 60:
                was_weak = True
                
        # Find contributing POs
        po_ids = [m.po_id for m in session.mappings if m.co_id == co.co_id]
        
        history_entry = COHistory(
            subject_id=session.subject_id,
            academic_year=session.academic_year,
            co_id=co.co_id,
            statement=co.statement,
            blooms_level=co.blooms_level,
            avg_attainment=avg_att,
            achieved_level=achieved,
            was_weak=was_weak,
            contributing_po_ids=po_ids
        )
        db.add(history_entry)
        
    await db.commit()
    return True
