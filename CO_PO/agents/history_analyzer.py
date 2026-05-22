import asyncio
from tools.llm_client import call_llm_json
from sqlalchemy import select

async def get_historical_insights(subject_id: str, db) -> dict:
    from models import COHistory
    
    result = await db.execute(
        select(COHistory)
        .where(COHistory.subject_id == subject_id, COHistory.was_weak == True)
        .order_by(COHistory.academic_year.desc())
    )
    history_records = result.scalars().all()
    if not history_records:
        return {"insights": [], "message": "No weak historical outcomes found for this subject."}
        
    SYSTEM = "You are an academic advisor analyzing past weaknesses in course outcomes."
    
    context = "\n".join([f"Year {r.academic_year}: CO {r.co_id} '{r.statement}' (Avg: {r.avg_attainment}%)" for r in history_records])
    
    prompt = f"""
Based on the following weak historical outcomes for this subject, suggest 2-3 specific pedagogical or curriculum improvements for the new syllabus.
Return JSON format:
{{
  "insights": [
    {{"topic": "Brief topic title", "suggestion": "Specific actionable suggestion"}}
  ]
}}

Data:
{context}
"""
    data = await asyncio.to_thread(call_llm_json, prompt, SYSTEM)
    return data
