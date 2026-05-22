import json
from core.state import AgentState
from core.schemas import Assignment
from tools.llm_client import call_llm_json
import asyncio
import os
import base64
import re

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
Based on the following Course Outcomes and their Mappings to Program Outcomes, design a comprehensive Learning Plan consisting of EXACTLY {state.num_assignments} Assignments/Assessments.
These assignments should effectively measure the COs and POs targeted in this course.

Subject: {state.subject_name}
Syllabus Context:
{state.syllabus_text[:1000]}...

Course Outcomes:
{co_text}

CO-PO Mappings:
{mapping_text}

Generate a JSON list of assignments. Each assignment must have:
- "title": Short descriptive title (e.g., "Assignment 1: Database Design", "Mini Project")
- "description": Instructions or what it measures. **CRITICAL: Use rich markdown formatting (bullet points, bold text) to make this description look highly engaging and readable in the UI! Do NOT just return a plain text block.**
- "content": The ACTUAL full assignment content that the faculty can directly download and give to students. Use markdown formatting. **CRITICAL: Do NOT explicitly mention 'This maps to CO1' or 'Target POs' inside the text. Just provide the raw problem statement and tasks.** You MUST use double newlines (\n\n) to separate paragraphs and steps!
- "target_co_ids": List of CO IDs it measures (e.g., ["CO1", "CO2"]).
- "target_po_ids": List of PO IDs it contributes to.
- "max_marks": Total marks for this assignment (e.g., 20, 50, 100).

CRITICAL INSTRUCTIONS FOR "content" FIELD:
Write the complete assignment using markdown. 
DO NOT include any HTML headers or tables at the top of your markdown content (I will prepend the official college template programmatically). Just start directly with the Assignment Sections:

### Objective
[Clear, single-paragraph statement of what the student will achieve and which COs/POs this maps to]

### Assignment Details & Instructions
[Provide a realistic, in-depth problem statement. If it's a coding/lab assignment, provide database schemas, code snippets, or architecture requirements. If it's a theory/report assignment, provide specific analytical questions. MAKE IT DETAILED AND INTERESTING.]

### Step-by-Step Tasks
**Step 1: [Task Name]**
[Detailed instructions for step 1. Include expected output or constraints.]

**Step 2: [Task Name]**
[Detailed instructions for step 2...]

*(Add more steps as needed for a comprehensive assignment)*

### Expected Deliverables
[What exactly should the student submit? (e.g., SQL scripts, Java files, a 5-page PDF report, screenshots of outputs)]

### Conclusion
[A brief concluding remark on the skills acquired from completing this assignment.]

Return ONLY the raw JSON array (no markdown code blocks surrounding the array).
"""

    data = await asyncio.to_thread(call_llm_json, prompt=prompt, system=SYSTEM_PROMPT)
    
    try:
        if not isinstance(data, list):
            data = data.get("assignments", data) if isinstance(data, dict) else []
            
        logo_img = '<img src="http://127.0.0.1:8000/data/mit_logo.jpg" style="max-height: 60px;" alt="MIT Logo" />'
            
        state.assignments = []
        for idx, item in enumerate(data):
            title = item.get("title", f"Assignment {idx+1}")
            
            # Extract assignment number from title if possible to avoid desync
            match = re.search(r'Assignment\s+(\d+)', title, re.IGNORECASE)
            assignment_num = match.group(1) if match else str(idx + 1)
            
            target_cos = item.get("target_co_ids", [])
            target_pos = item.get("target_po_ids", [])
            marks = item.get("max_marks", 100)
            
            # Programmatically inject the HTML template with zero indentation to avoid markdown code blocks
            html_header = f"""
<div style="font-family: 'Times New Roman', Times, serif; width: 100%; border: 2px solid #000; box-sizing: border-box; margin-bottom: 10px; page-break-inside: avoid;">
<!-- Top Header Row -->
<div style="display: flex; border-bottom: 2px solid #000;">
<div style="flex: 1; border-right: 2px solid #000; padding: 5px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
{logo_img}
<p style="margin: 2px 0 0; font-size: 10px;">(An Autonomous Institute Affiliated to Savitribai Phule Pune University)</p>
</div>
<div style="flex: 1; display: flex; align-items: center; justify-content: center;">
<h2 style="margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">COURSE ASSIGNMENT {assignment_num}</h2>
</div>
</div>
<!-- Info Grid -->
<table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 13px; margin: 0; border: none; font-family: 'Times New Roman', Times, serif;">
<tr>
<td style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px; font-weight: bold; width: 50%;">
SCHOOL OF <br/> COMPUTER ENGINEERING & TECHNOLOGY
</td>
<td style="border-bottom: 1px solid #000; padding: 6px; width: 50%; display: flex; justify-content: space-between;">
<strong>W.E.F</strong>
<span>AY: {state.academic_year}</span>
</td>
</tr>
<tr>
<td style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 10px 6px; font-weight: bold; text-transform: uppercase;" rowspan="3">
SECOND YEAR BACHELOR OF TECHNOLOGY <br/><br/> INFORMATION TECHNOLOGY
</td>
<td style="border-bottom: 1px solid #000; padding: 6px; text-align: left;">
<strong>COURSE NAME:</strong> {state.subject_name}
</td>
</tr>
<tr>
<td style="border-bottom: 1px solid #000; padding: 6px; text-align: left;">
<strong>COURSE CODE:</strong> {state.subject_code}
</td>
</tr>
<tr>
<td style="border-bottom: 1px solid #000; padding: 6px; text-align: left;">
<strong>ASSIGNMENT TITLE:</strong> {title}
</td>
</tr>
</table>
</div>
"""
            
            final_content = html_header + "\n\n" + item.get("content", "")
            
            state.assignments.append(
                Assignment(
                    title=title,
                    description=item.get("description", ""),
                    content=final_content,
                    target_co_ids=target_cos,
                    target_po_ids=target_pos,
                    max_marks=float(marks)
                )
            )
            
        state.log("LearningPlanAgent", "complete", f"Generated {len(state.assignments)} structured assignments.")
    except Exception as e:
        state.log("LearningPlanAgent", "error", f"Failed to parse LLM response: {str(e)}")
        
    return state
