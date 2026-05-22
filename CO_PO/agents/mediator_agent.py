import json
import asyncio
from tools.llm_client import call_llm_json

async def get_mediator_response(session, history, message: str, phase: int) -> dict:
    SYSTEM = """You are an academic mediator helping a teacher refine Course Outcomes (Phase 1) or CO-PO Mappings (Phase 2).
You must analyze their request and generate the appropriate change plan.
    
Return a JSON object with this exact structure:
{
  "reply": "Your conversational reply acknowledging the request and explaining the proposed changes.",
  "pending_changes": {
    "type": "update_co" | "update_mapping" | "delete_co" | "add_co",
    "description": "Brief description of the changes",
    "changes": [
      {
        "id": "CO1", 
        "field": "statement" | "blooms_level" | "strength",
        "new_value": "new value here"
      }
    ]
  }
}
If the request is just conversational and requires no actual modifications to the DB, omit "pending_changes" or set it to null.
"""

    context = ""
    if phase == 1:
        context = "Current COs:\n"
        if session.course_outcomes:
            for co in session.course_outcomes:
                if co.is_current:
                    context += f"- {co.co_id}: {co.statement} (Level {co.blooms_level})\n"
    elif phase == 2:
        context = "Current Mappings:\n"
        if session.mappings:
            for m in session.mappings:
                context += f"- {m.co_id} to {m.po_id}: Strength {m.strength}\n"
                
    history_text = "\n".join([f"{m.role}: {m.content}" for m in history[-5:]])

    prompt = f"""
Context:
{context}

Recent History:
{history_text}

User Request:
{message}
"""
    # call_llm_json is synchronous, run it in a thread
    data = await asyncio.to_thread(call_llm_json, prompt, SYSTEM)
    return data
