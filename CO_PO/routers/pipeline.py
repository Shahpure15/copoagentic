import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Session, Teacher, AuditLog
from schemas.deps import get_current_user

router = APIRouter()

async def event_stream(session_id: str):
    import asyncio
    import json
    from services.pipeline_service import run_pipeline_task
    
    queue = asyncio.Queue()
    
    # Start the pipeline task in the background
    task = asyncio.create_task(run_pipeline_task(session_id, queue))
    
    try:
        while True:
            data = await queue.get()
            if data is None:
                break
            yield f"data: {json.dumps(data)}\n\n"
            # Yield control back
            await asyncio.sleep(0)
    except asyncio.CancelledError:
        task.cancel()
        raise

@router.post("/{session_id}/run")
async def run_session_pipeline(
    session_id: str,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(
            Session.id == session_id,
            Session.teacher_id == current_user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.is_locked:
        raise HTTPException(status_code=400, detail="Session is already locked/complete")
    if not session.syllabus_text:
        raise HTTPException(status_code=400, detail="Upload syllabus before running pipeline")

    return StreamingResponse(
        event_stream(session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

def _extract_text_from_pdf(content: bytes, max_pages: int = 30) -> str:
    import io
    text = ""
    print(f"[Diagnostic] PDF content bytes: {len(content)}")
    try:
        print("[Diagnostic] Attempting pdfplumber...")
        import pdfplumber
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            total_pages = len(pdf.pages)
            pages = pdf.pages[:max_pages]
            print(f"[Diagnostic] pdfplumber successfully opened. Total pages: {total_pages}, Processing first: {len(pages)} pages")
            for idx, page in enumerate(pages):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                else:
                    print(f"[Diagnostic] pdfplumber extracted NO text on page {idx + 1}")
            print(f"[Diagnostic] pdfplumber extraction complete. Total characters: {len(text)}")
            return text
    except Exception as plumber_err:
        print(f"[Diagnostic] pdfplumber failed with error: {plumber_err}. Falling back to PyPDF2...")
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(content))
            total_pages = len(reader.pages)
            pages = reader.pages[:max_pages]
            print(f"[Diagnostic] PyPDF2 successfully opened. Total pages: {total_pages}, Processing first: {len(pages)} pages")
            for idx, page in enumerate(pages):
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
                else:
                    print(f"[Diagnostic] PyPDF2 extracted NO text on page {idx + 1}")
            print(f"[Diagnostic] PyPDF2 extraction complete. Total characters: {len(text)}")
            return text
        except Exception as pypdf_err:
            print(f"[Diagnostic] PyPDF2 failed with error: {pypdf_err}")
            raise RuntimeError(f"PDF parsing failed: pdfplumber error ({plumber_err}), PyPDF2 error ({pypdf_err})")

@router.post("/{session_id}/syllabus")
async def upload_syllabus(
    session_id: str,
    file: UploadFile = File(...),
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    print(f"[Diagnostic] upload_syllabus active session: {session_id}")
    print(f"[Diagnostic] File received: {file.filename}, content_type: {file.content_type}")
    
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        print("[Diagnostic] Session NOT found in DB!")
        raise HTTPException(404, "Session not found")
    
    content = await file.read()
    print(f"[Diagnostic] Read file content bytes length: {len(content)}")
    
    parsed_text = ""
    if file.filename.endswith('.txt'):
        try:
            parsed_text = content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                parsed_text = content.decode('latin-1')
            except Exception as e:
                raise HTTPException(400, f"Failed to decode text file: {e}")
        session.syllabus_text = parsed_text
        db.add(session)
        print(f"[Diagnostic] Stored txt file text length: {len(parsed_text)}")
    elif file.filename.endswith('.pdf'):
        try:
            print("[Diagnostic] Starting PDF extraction in thread pool...")
            parsed_text = await asyncio.to_thread(_extract_text_from_pdf, content, 30)
            print(f"[Diagnostic] Thread completed! Extracted PDF text length: {len(parsed_text)}")
            if len(parsed_text.strip()) == 0:
                print("[Diagnostic] Warning: Extracted PDF text is empty!")
            session.syllabus_text = parsed_text
            # Explicitly merge/add the session back to the DB to ensure tracking
            db.add(session)
            print(f"[Diagnostic] Assigned to session.syllabus_text. Value in object: {len(session.syllabus_text) if session.syllabus_text else 'None'}")
        except Exception as e:
            print(f"[Diagnostic] PDF extraction failed with exception: {e}")
            raise HTTPException(400, f"Error parsing PDF syllabus: {e}")
    else:
        raise HTTPException(400, "Only PDF and TXT files are supported")

    # Explicitly commit changes to ensure database writes are flushed and committed
    await db.commit()
    print("[Diagnostic] Committed successfully!")
    
    empty_text = len(parsed_text.strip()) == 0
    return {"ok": True, "filename": file.filename, "empty_text": empty_text}

@router.post("/{session_id}/syllabus_text")
async def save_syllabus_text(
    session_id: str,
    body: dict,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    print(f"[Diagnostic] save_syllabus_text active session: {session_id}")
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    
    syllabus_text = body.get("syllabus_text", "")
    session.syllabus_text = syllabus_text
    db.add(session)
    await db.commit()
    print("[Diagnostic] Syllabus text saved manually and committed!")
    return {"ok": True}

@router.post("/{session_id}/philosophy")
async def save_philosophy(
    session_id: str,
    body: dict,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    session.teaching_philosophy = body.get("philosophy", "")
    return {"ok": True}


@router.post("/{session_id}/pos")
async def save_pos(
    session_id: str,
    body: list[dict],
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from models import ProgramOutcome
    from sqlalchemy import delete
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Session not found")
    
    await db.execute(delete(ProgramOutcome).where(ProgramOutcome.session_id == session_id))
    for po in body:
        db.add(ProgramOutcome(
            session_id=session_id,
            po_id=po["po_id"],
            statement=po["statement"]
        ))
    await db.commit()
    return {"ok": True}

@router.post("/{session_id}/attainment")
async def process_attainment(
    session_id: str,
    file: UploadFile = File(...),
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import os
    import asyncio
    import uuid
    from models import COAttainment, POAttainment, Recommendation
    from sqlalchemy import delete
    from sqlalchemy.orm import selectinload
    from core.state import AgentState
    from agents import co_attainment, po_attainment, recommendation, report_generator
    
    result = await db.execute(
        select(Session)
        .options(selectinload(Session.subject))
        .where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
        
    await db.refresh(session, ["course_outcomes", "program_outcomes", "mappings"])
    
    content = await file.read()
    temp_path = f"temp_{uuid.uuid4().hex}.csv"
    with open(temp_path, "wb") as f:
        f.write(content)
        
    try:
        state = AgentState()
        state.level1_threshold = session.level1_threshold
        state.level2_threshold = session.level2_threshold
        state.level3_threshold = session.level3_threshold
        state.attainment_thresholds = {
            1: session.level1_threshold,
            2: session.level2_threshold,
            3: session.level3_threshold
        }
        
        from core.schemas import CourseOutcome as CoreCO, ProgramOutcome as CorePO, MappingEntry
        for co in session.course_outcomes:
            if co.is_current:
                state.cos.append(CoreCO(co_id=co.co_id, statement=co.statement, blooms_level=co.blooms_level, blooms_keyword=co.blooms_keyword))
        for po in session.program_outcomes:
            state.pos.append(CorePO(po_id=po.po_id, statement=po.statement))
        for m in session.mappings:
            state.co_po_mapping.append(MappingEntry(co_id=m.co_id, po_id=m.po_id, strength=m.strength, justification=m.reasoning))
            
        state = await asyncio.to_thread(co_attainment.run, state, temp_path)
        state = await asyncio.to_thread(po_attainment.run, state)
        state = await asyncio.to_thread(recommendation.run, state)
        
        state.subject_name = session.subject.name if session.subject else "Unknown"
        excel_path = await asyncio.to_thread(report_generator.run, state)
        
        await db.execute(delete(COAttainment).where(COAttainment.session_id == session_id))
        await db.execute(delete(POAttainment).where(POAttainment.session_id == session_id))
        await db.execute(delete(Recommendation).where(Recommendation.session_id == session_id))
        
        for coa in state.co_attainment:
            db.add(COAttainment(session_id=session_id, co_id=coa.co_id, avg_percentage=coa.avg_percentage,
                level_1_students_pct=coa.level_1_students_pct, level_2_students_pct=coa.level_2_students_pct,
                level_3_students_pct=coa.level_3_students_pct, achieved_level=coa.achieved_level, threshold_used=coa.threshold_used))
                
        for poa in state.po_attainment:
            db.add(POAttainment(session_id=session_id, po_id=poa.po_id, weighted_attainment=poa.weighted_attainment,
                contributing_cos=poa.contributing_cos, is_weak=poa.is_weak, weakness_reason=poa.weakness_reason))
                
        for r in state.recommendations:
            db.add(Recommendation(session_id=session_id, target=r.target, issue=r.issue,
                suggestion=r.suggestion, priority=r.priority, accepted=False, implemented=False))
                
        session.excel_report_path = excel_path
        session.status = "completed"
        session.current_phase = 4
        db.add(session)
        await db.commit()
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    return {"ok": True, "excel_report": excel_path}
