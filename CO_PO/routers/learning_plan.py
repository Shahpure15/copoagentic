from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Session, StudentBatch, Assignment, Student, CourseOutcome, ProgramOutcome, COPOMapping, StudentMark, COAttainment, POAttainment, Recommendation
from schemas.deps import get_current_user
import pandas as pd
import os
import asyncio
import io
import re
from core.state import AgentState
from core.schemas import CourseOutcome as CoreCO, MappingEntry, ProgramOutcome as CorePO, COAttainment as CoreCOA
from agents import learning_plan_agent, po_attainment, recommendation, report_generator

router = APIRouter()

@router.post("/batches/{batch_id}/generate")
async def generate_learning_plan(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
):
    # Load Batch
    result = await db.execute(select(StudentBatch).where(StudentBatch.id == batch_id))
    batch = result.scalar_one_or_none()
    if not batch:
        raise HTTPException(404, "Batch not found")
        
    session_id = batch.session_id
    session_res = await db.execute(select(Session).where(Session.id == session_id))
    session = session_res.scalar_one()

    state = AgentState()
    state.subject_name = session.subject.name if session.subject else "Unknown"
    state.subject_code = session.subject.code if session.subject and hasattr(session.subject, 'code') else "Unknown"
    state.academic_year = session.academic_year or "Unknown"
    state.syllabus_text = session.syllabus_text or ""
    
    # Load COs
    cos_res = await db.execute(select(CourseOutcome).where(CourseOutcome.session_id == session_id))
    for c in cos_res.scalars().all():
        state.cos.append(CoreCO(co_id=c.co_id, statement=c.statement, blooms_level=c.blooms_level, blooms_keyword=c.blooms_keyword))
        
    # Load Mappings
    map_res = await db.execute(select(COPOMapping).where(COPOMapping.session_id == session_id))
    for m in map_res.scalars().all():
        state.co_po_mapping.append(MappingEntry(co_id=m.co_id, po_id=m.po_id, strength=m.strength, reasoning=m.reasoning))
        
    # Run Agent
    state = await learning_plan_agent.run(state)
    
    if not state.assignments:
        raise HTTPException(500, "Failed to generate learning plan")
        
    # Save Assignments to DB
    from sqlalchemy import delete
    await db.execute(delete(Assignment).where(Assignment.batch_id == batch_id))
    
    db_assignments = []
    for a in state.assignments:
        db_assignments.append(
            Assignment(
                batch_id=batch_id,
                title=a.title,
                description=a.description,
                content=a.content,
                target_co_ids=a.target_co_ids,
                target_po_ids=a.target_po_ids,
                max_marks=a.max_marks
            )
        )
    db.add_all(db_assignments)
    await db.commit()
    
    return {"message": "Learning plan generated successfully", "assignments": [a.title for a in state.assignments]}

@router.get("/batches/{batch_id}/assignments")
async def get_assignments(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Assignment).where(Assignment.batch_id == batch_id).order_by(Assignment.created_at))
    assignments = result.scalars().all()
    
    return [
        {
            "id": str(a.id),
            "title": a.title,
            "description": a.description,
            "content": a.content,
            "target_co_ids": a.target_co_ids,
            "target_po_ids": a.target_po_ids,
            "max_marks": a.max_marks
        } for a in assignments
    ]

from pydantic import BaseModel
class EditAssignmentRequest(BaseModel):
    instruction: str

@router.post("/batches/{batch_id}/assignments/{assignment_id}/edit")
async def edit_assignment(
    batch_id: str,
    assignment_id: str,
    req: EditAssignmentRequest,
    db: AsyncSession = Depends(get_db),
):
    from tools.llm_client import call_llm
    
    # Get Assignment
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id, Assignment.batch_id == batch_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")
        
    prompt = f"""
    You are an expert AI Instructional Designer.
    Please rewrite the following assignment based on the user's instruction.
    
    ORIGINAL ASSIGNMENT:
    Title: {assignment.title}
    Description: {assignment.description}
    Content:
    {assignment.content}
    
    USER INSTRUCTION:
    {req.instruction}
    
    Return ONLY the raw updated text for the assignment 'Content' using Markdown formatting. Do not include markdown blocks like ```markdown unless they are part of the content.
    """
    
    import asyncio
    new_content = await asyncio.to_thread(
        call_llm, 
        prompt=prompt, 
        system="You are an expert AI Instructional Designer.",
        expect_json=False
    )
    
    # Update DB
    assignment.content = new_content.strip()
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    
    return {
        "id": str(assignment.id),
        "title": assignment.title,
        "description": assignment.description,
        "content": assignment.content,
        "target_co_ids": assignment.target_co_ids,
        "target_po_ids": assignment.target_po_ids,
        "max_marks": assignment.max_marks
    }

@router.get("/batches/{batch_id}/export_template")
async def export_excel_template(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
):
    stu_res = await db.execute(select(Student).where(Student.batch_id == batch_id).order_by(Student.roll_no))
    students = stu_res.scalars().all()
    
    if not students:
        raise HTTPException(400, "No students found. Please upload a student roster first.")
        
    asg_res = await db.execute(select(Assignment).where(Assignment.batch_id == batch_id))
    assignments = asg_res.scalars().all()
    
    if not assignments:
        raise HTTPException(400, "No assignments found. Please generate the learning plan first.")
        
    data = []
    for s in students:
        row = {"Student ID": str(s.id), "Roll No": s.roll_no, "Name": s.name}
        for a in assignments:
            row[f"{a.title} (Max: {a.max_marks}) [{str(a.id)}]"] = ""
        data.append(row)
        
    df = pd.DataFrame(data)
    
    os.makedirs("data/output", exist_ok=True)
    file_path = f"data/output/assessment_template_{batch_id}.xlsx"
    df.to_excel(file_path, index=False)
    
    return FileResponse(
        path=file_path,
        filename=f"Assessment_Template.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

from fastapi import UploadFile, File
@router.post("/batches/{batch_id}/upload_marks")
async def upload_marks(
    batch_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    try:
        if file.filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Invalid file: {str(e)}")
        
    # Get batch and session
    b_res = await db.execute(select(StudentBatch).where(StudentBatch.id == batch_id))
    batch = b_res.scalar_one()
    session_id = batch.session_id
    
    s_res = await db.execute(select(Session).where(Session.id == session_id))
    session = s_res.scalar_one()

    asg_res = await db.execute(select(Assignment).where(Assignment.batch_id == batch_id))
    assignments = {str(a.id): a for a in asg_res.scalars().all()}
    
    marks_to_add = []
    for _, row in df.iterrows():
        student_id_val = str(row.get("Student ID", ""))
        if not student_id_val or student_id_val.lower() == "nan":
            continue
            
        for col in df.columns:
            if "[" in col and "]" in col:
                match = re.search(r'\[(.*?)\]', col)
                if match:
                    asg_id = match.group(1)
                    if asg_id in assignments:
                        mark_val = row[col]
                        try:
                            mark_val = float(mark_val)
                            marks_to_add.append(
                                StudentMark(
                                    student_id=student_id_val,
                                    assignment_id=asg_id,
                                    marks_obtained=mark_val
                                )
                            )
                        except (ValueError, TypeError):
                            pass
                            
    if marks_to_add:
        from sqlalchemy import delete
        stu_res = await db.execute(select(Student.id).where(Student.batch_id == batch_id))
        stu_ids = [str(s_id) for s_id in stu_res.scalars().all()]
        if stu_ids:
            await db.execute(delete(StudentMark).where(StudentMark.student_id.in_(stu_ids)))
            
        db.add_all(marks_to_add)
        await db.commit()
        
    thresholds = {
        1: session.level1_threshold,
        2: session.level2_threshold,
        3: session.level3_threshold
    }
    
    co_scores = {}
    for asg_id, asg in assignments.items():
        for co_id in asg.target_co_ids:
            if co_id not in co_scores:
                co_scores[co_id] = {}
                
    for mark in marks_to_add:
        asg = assignments.get(str(mark.assignment_id))
        if asg:
            pct = (mark.marks_obtained / asg.max_marks) * 100
            for co_id in asg.target_co_ids:
                if str(mark.student_id) not in co_scores[co_id]:
                    co_scores[co_id][str(mark.student_id)] = []
                co_scores[co_id][str(mark.student_id)].append(pct)
                
    co_attainments_to_add = []
    state_co_attainments = []
    
    await db.execute(delete(COAttainment).where(COAttainment.batch_id == batch_id))
    
    for co_id, student_map in co_scores.items():
        student_averages = []
        for s_id, pcts in student_map.items():
            if pcts:
                student_averages.append(sum(pcts) / len(pcts))
                
        if not student_averages:
            continue
            
        avg_percentage = sum(student_averages) / len(student_averages)
        total_students = len(student_averages)
        
        l1_pct = sum(1 for p in student_averages if p >= thresholds[1]) / total_students * 100
        l2_pct = sum(1 for p in student_averages if p >= thresholds[2]) / total_students * 100
        l3_pct = sum(1 for p in student_averages if p >= thresholds[3]) / total_students * 100
        
        achieved_level = 0
        if l3_pct >= 60: achieved_level = 3
        elif l2_pct >= 60: achieved_level = 2
        elif l1_pct >= 60: achieved_level = 1
        
        co_attainments_to_add.append(
            COAttainment(
                batch_id=batch_id, co_id=co_id, avg_percentage=avg_percentage,
                level_1_students_pct=l1_pct, level_2_students_pct=l2_pct,
                level_3_students_pct=l3_pct, achieved_level=achieved_level,
                threshold_used=thresholds
            )
        )
        state_co_attainments.append(
            CoreCOA(co_id=co_id, avg_percentage=avg_percentage, level_1_students_pct=l1_pct,
            level_2_students_pct=l2_pct, level_3_students_pct=l3_pct, achieved_level=achieved_level,
            threshold_used=thresholds)
        )
        
    db.add_all(co_attainments_to_add)
    await db.commit()
    
    state = AgentState()
    state.co_attainment = state_co_attainments
    
    map_res = await db.execute(select(COPOMapping).where(COPOMapping.session_id == session_id))
    for m in map_res.scalars().all():
        state.co_po_mapping.append(MappingEntry(co_id=m.co_id, po_id=m.po_id, strength=m.strength, reasoning=m.reasoning))
    
    po_res = await db.execute(select(ProgramOutcome).where(ProgramOutcome.session_id == session_id))
    for p in po_res.scalars().all():
        state.pos.append(CorePO(po_id=p.po_id, statement=p.statement))
        
    state = await asyncio.to_thread(po_attainment.run, state)
    state = await asyncio.to_thread(recommendation.run, state)
    
    state.subject_name = session.subject.name if session.subject else "Unknown"
    excel_path = await asyncio.to_thread(report_generator.run, state)
    
    await db.execute(delete(POAttainment).where(POAttainment.batch_id == batch_id))
    # Recommendations apply to the session (course overall)
    await db.execute(delete(Recommendation).where(Recommendation.session_id == session_id))
    
    for poa in state.po_attainment:
        db.add(POAttainment(batch_id=batch_id, po_id=poa.po_id, weighted_attainment=poa.weighted_attainment,
            contributing_cos=poa.contributing_cos, is_weak=poa.is_weak, weakness_reason=poa.weakness_reason))
            
    for r in state.recommendations:
        db.add(Recommendation(session_id=session_id, target=r.target, issue=r.issue,
            suggestion=r.suggestion, priority=r.priority, accepted=False, implemented=False))
            
    session.excel_report_path = excel_path
    session.status = "completed"
    session.current_phase = 4
    db.add(session)
    await db.commit()
    
    student_totals = {}
    for mark in marks_to_add:
        if mark.student_id not in student_totals:
            student_totals[mark.student_id] = []
        asg = assignments.get(str(mark.assignment_id))
        if asg:
            student_totals[mark.student_id].append((mark.marks_obtained / asg.max_marks) * 100)
            
    analytics = {"fast": 0, "average": 0, "slow": 0}
    for pcts in student_totals.values():
        avg = sum(pcts) / len(pcts)
        if avg >= thresholds[3]:
            analytics["fast"] += 1
        elif avg >= thresholds[1]:
            analytics["average"] += 1
        else:
            analytics["slow"] += 1

    return {"ok": True, "analytics": analytics, "excel_report": excel_path}
