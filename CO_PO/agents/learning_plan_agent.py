import json
from core.state import AgentState
from core.schemas import Assignment
from tools.llm_client import call_llm
import asyncio

SYSTEM_PROMPT = "You are an expert AI Instructional Designer for NBA Accreditation."

async def run(state: AgentState) -> AgentState:
    state.log("LearningPlanAgent", "start", "Generating AI-suggested assignments mapped to COs and POs.")
    
    # We pass the syllabus, COs, and Mappings to the AI
    co_text = "\n".join([f"{c.co_id}: {c.statement}" for c in state.cos])
    
    mapping_text = "\n".join([
        f"{m.co_id} -> {m.po_id} (Strength: {m.strength}) Reason: {m.reasoning}"
        for m in state.co_po_mapping if m.strength > 0
    ])

    prompt = f"""
You are an expert AI Instructional Designer for NBA Accreditation.
Based on the following Course Outcomes and their Mappings to Program Outcomes, design a comprehensive Learning Plan consisting of 4-6 Assignments/Assessments.
These assignments should effectively measure the COs and POs targeted in this course.

Subject: {state.subject_name}
Syllabus Context:
{state.syllabus_text[:1000]}...

Course Outcomes:
{co_text}

CO-PO Mappings:
{mapping_text}

Generate a JSON list of assignments. Each assignment must have:
- "title": Short descriptive title (e.g., "Midterm Exam", "Mini Project")
- "description": Brief instructions or what it measures.
- "target_co_ids": List of CO IDs it measures (e.g., ["CO1", "CO2"]).
- "target_po_ids": List of PO IDs it contributes to.
- "max_marks": Total marks for this assignment (e.g., 20, 50, 100).

Return ONLY the raw JSON array (no markdown code blocks).
"""

    response = await asyncio.to_thread(call_llm, prompt=prompt, system=SYSTEM_PROMPT, expect_json=True)
    
    try:
        data = json.loads(response.strip("` \n").replace("json\n", ""))
        state.assignments = []
        for item in data:
            state.assignments.append(
                Assignment(
                    title=item.get("title", "Untitled Assignment"),
                    description=item.get("description", ""),
                    target_co_ids=item.get("target_co_ids", []),
                    target_po_ids=item.get("target_po_ids", []),
                    max_marks=float(item.get("max_marks", 100))
                )
            )
            
        state.log("LearningPlanAgent", "complete", f"Generated {len(state.assignments)} structured assignments.")
    except Exception as e:
        state.log("LearningPlanAgent", "error", f"Failed to parse LLM response: {str(e)}")
        
    return state
