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
- "title": Short descriptive title (e.g., "Assignment 1: Database Design", "Mini Project")
- "description": Brief instructions or what it measures.
- "content": The ACTUAL full assignment content that the faculty can directly download and give to students. Use markdown formatting.
- "target_co_ids": List of CO IDs it measures (e.g., ["CO1", "CO2"]).
- "target_po_ids": List of PO IDs it contributes to.
- "max_marks": Total marks for this assignment (e.g., 20, 50, 100).

CRITICAL INSTRUCTIONS FOR "content" FIELD:
The assignment content MUST follow a highly structured, professional college template EXACTLY like the example below. Copy the HTML header directly, substituting ONLY the bracketed placeholders [Assignment Title], [Target COs], [Target POs], and [Marks] with the actual values for this specific assignment.

<div style="font-family: 'Times New Roman', Times, serif; width: 100%; border: 2px solid #000; box-sizing: border-box; margin-bottom: 20px;">
    <!-- Top Header Row -->
    <div style="display: flex; border-bottom: 2px solid #000;">
        <div style="flex: 1; border-right: 2px solid #000; padding: 15px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
            <h1 style="margin: 0; font-family: Arial, sans-serif; color: #0f1c3f; font-size: 32px; font-weight: 900; letter-spacing: -1px;">MIT <span style="color: #444; font-weight: normal; font-size: 24px; letter-spacing: 0;">Academy of Engineering</span></h1>
            <p style="margin: 5px 0 0; font-size: 11px;">(An Autonomous Institute Affiliated to Savitribai Phule Pune University)</p>
        </div>
        <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
            <h2 style="margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px;">COURSE ASSIGNMENT</h2>
        </div>
    </div>
    
    <!-- Info Grid -->
    <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 14px; margin: 0; border: none;">
        <tr>
            <td style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 10px; font-weight: bold; width: 50%;">
                SCHOOL OF <br/> COMPUTER ENGINEERING & TECHNOLOGY
            </td>
            <td style="border-bottom: 1px solid #000; padding: 10px; width: 50%; display: flex; justify-content: space-between;">
                <strong>W.E.F</strong>
                <span>AY: {state.academic_year}</span>
            </td>
        </tr>
        <tr>
            <td style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 15px 10px; font-weight: bold; text-transform: uppercase;" rowspan="3">
                SECOND YEAR BACHELOR OF TECHNOLOGY <br/><br/> INFORMATION TECHNOLOGY
            </td>
            <td style="border-bottom: 1px solid #000; padding: 10px; text-align: left;">
                <strong>COURSE NAME:</strong> {state.subject_name}
            </td>
        </tr>
        <tr>
            <td style="border-bottom: 1px solid #000; padding: 10px; text-align: left;">
                <strong>COURSE CODE:</strong> {state.subject_code}
            </td>
        </tr>
        <tr>
            <td style="border-bottom: 1px solid #000; padding: 10px; text-align: left;">
                <strong>ASSIGNMENT TITLE:</strong> [Assignment Title]
            </td>
        </tr>
    </table>

    <!-- Student Details Grid -->
    <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 14px; margin: 0; border: none;">
        <tr>
            <th colspan="3" style="border-bottom: 1px solid #000; padding: 5px; background: #f9f9f9;">STUDENT DETAILS</th>
        </tr>
        <tr>
            <td style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 10px; width: 40%; text-align: left;">
                <strong>NAME:</strong> 
            </td>
            <td style="border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 10px; width: 30%; text-align: left;">
                <strong>ROLL NO:</strong> 
            </td>
            <td style="border-bottom: 1px solid #000; padding: 10px; width: 30%; text-align: left;">
                <strong>PRN:</strong> 
            </td>
        </tr>
    </table>

    <!-- Assignment Meta Grid -->
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; margin: 0; border: none;">
        <tr>
            <td style="border-right: 1px solid #000; padding: 10px; width: 40%;"><strong>TARGET COs:</strong> [Target COs]</td>
            <td style="border-right: 1px solid #000; padding: 10px; width: 40%;"><strong>TARGET POs:</strong> [Target POs]</td>
            <td style="padding: 10px; width: 20%;"><strong>MAX MARKS:</strong> [Marks]</td>
        </tr>
    </table>
</div>

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

    response = await asyncio.to_thread(call_llm, prompt=prompt, system=SYSTEM_PROMPT, expect_json=True)
    
    try:
        data = json.loads(response.strip("` \n").replace("json\n", ""))
        state.assignments = []
        for item in data:
            state.assignments.append(
                Assignment(
                    title=item.get("title", "Untitled Assignment"),
                    description=item.get("description", ""),
                    content=item.get("content", ""),
                    target_co_ids=item.get("target_co_ids", []),
                    target_po_ids=item.get("target_po_ids", []),
                    max_marks=float(item.get("max_marks", 100))
                )
            )
            
        state.log("LearningPlanAgent", "complete", f"Generated {len(state.assignments)} structured assignments.")
    except Exception as e:
        state.log("LearningPlanAgent", "error", f"Failed to parse LLM response: {str(e)}")
        
    return state
