from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from database import get_db
from models import Session, Subject, Teacher, Student, StudentBatch
from schemas.deps import get_current_user
import pandas as pd
import io

router = APIRouter()

@router.get("/")
async def get_courses(
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.subject), selectinload(Session.batches))
        .where(Session.teacher_id == current_user.id)
        .order_by(Session.created_at.desc())
    )
    
    courses = []
    for session in result.scalars():
        courses.append({
            "id": str(session.id),
            "subject_name": session.subject.name if session.subject else "Unnamed Course",
            "subject_code": session.subject.code if session.subject else "N/A",
            "academic_year": session.academic_year,
            "year_of_study": session.year_of_study,
            "status": session.status,
            "current_phase": session.current_phase,
            "is_locked": session.is_locked,
            "created_at": session.created_at.isoformat() if session.created_at else None,
            "batches": [{"id": str(b.id), "name": b.name} for b in session.batches]
        })
        
    return courses

@router.post("/")
async def create_course(
    course_data: dict,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Try to find or create the subject
    subject_name = course_data.get("subject_name")
    subject_code = course_data.get("subject_code")
    academic_year = course_data.get("academic_year")
    year_of_study = course_data.get("year_of_study")
    batch_name = course_data.get("batch_name", "Main Batch")
    
    if not subject_name or not academic_year or not year_of_study:
        raise HTTPException(400, "Missing required fields")
        
    sub_res = await db.execute(
        select(Subject).where(Subject.department_id == current_user.department_id, Subject.code == subject_code)
    )
    subject = sub_res.scalar_one_or_none()
    
    if not subject:
        subject = Subject(
            department_id=current_user.department_id,
            name=subject_name,
            code=subject_code
        )
        db.add(subject)
        await db.flush() # Get subject ID
        
    new_session = Session(
        teacher_id=current_user.id,
        subject_id=subject.id,
        academic_year=academic_year,
        year_of_study=year_of_study,
        status="setup",
        current_phase=1
    )
    db.add(new_session)
    await db.flush()
    
    new_batch = StudentBatch(
        session_id=new_session.id,
        name=batch_name
    )
    db.add(new_batch)
    
    await db.commit()
    
    return {
        "id": str(new_session.id),
        "batch_id": str(new_batch.id),
        "message": "Course and initial batch created successfully"
    }

@router.delete("/{session_id}")
async def delete_course(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify session belongs to user
    result = await db.execute(select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Course not found or unauthorized")
        
    await db.delete(session)
    await db.commit()
    return {"message": "Course deleted successfully"}

@router.post("/{session_id}/batches")
async def create_batch(
    session_id: str,
    batch_data: dict,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    name = batch_data.get("name", "New Batch")
    new_batch = StudentBatch(session_id=session_id, name=name)
    db.add(new_batch)
    await db.commit()
    return {"id": str(new_batch.id), "name": name, "message": "Batch created successfully"}

@router.post("/batches/{batch_id}/students")
async def upload_student_roster(
    batch_id: str,
    file: UploadFile = File(...),
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Invalid CSV file: {str(e)}")
        
    df.columns = [c.strip().lower() for c in df.columns]
    
    roll_col = next((c for c in df.columns if 'roll' in c or 'id' in c), None)
    name_col = next((c for c in df.columns if 'name' in c), None)
    
    if not roll_col or not name_col:
        raise HTTPException(400, "CSV must contain a Roll Number column and a Name column.")
        
    from sqlalchemy import delete
    await db.execute(delete(Student).where(Student.batch_id == batch_id))
    
    students_to_add = []
    for _, row in df.iterrows():
        roll_no = str(row[roll_col]).strip()
        name = str(row[name_col]).strip()
        if roll_no and name and roll_no.lower() != 'nan' and name.lower() != 'nan':
            students_to_add.append(
                Student(
                    batch_id=batch_id,
                    roll_no=roll_no,
                    name=name
                )
            )
            
    if not students_to_add:
        raise HTTPException(400, "No valid students found in CSV")
        
    db.add_all(students_to_add)
    await db.commit()
    
    return {
        "message": f"Successfully uploaded {len(students_to_add)} students to batch",
        "count": len(students_to_add)
    }

@router.get("/batches/{batch_id}/students")
async def get_students(
    batch_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Student).where(Student.batch_id == batch_id).order_by(Student.roll_no)
    )
    students = result.scalars().all()
    
    return [
        {
            "id": str(s.id),
            "roll_no": s.roll_no,
            "name": s.name
        }
        for s in students
    ]
