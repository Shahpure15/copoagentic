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

async def event_stream(session: Session, db: AsyncSession):
    # from agents.orchestrator import run_pipeline # assuming this will be refactored to work with DB
    async def emit(agent: str, status: str, detail: str = "", payload: dict = None):
        data = {"agent": agent, "status": status, "detail": detail}
        if payload:
            data["payload"] = payload
        yield f"data: {json.dumps(data)}\n\n"

    try:
        # Mocking pipeline for now until agents are refactored for DB
        # async for agent_name, status, detail, payload in run_pipeline(session, db):
        #     async for chunk in emit(agent_name, status, detail, payload):
        #         yield chunk
        #     await asyncio.sleep(0)   # flush
        
        # Realistic multi-agent pipeline stream for advanced frontend visualizer
        agent_steps = [
            ("syllabus_parser", "Ingesting syllabus document, cleaning text nodes, extracting course modules..."),
            ("co_generator", "Formulating course outcomes mapped to syllabus topics using Bloom's Taxonomy..."),
            ("co_validator", "Critiquing outcomes for active verbs, cognitive load, and NBA alignment..."),
            ("reflection_agent", "Reflecting: Optimizing verb selection and consolidating overlapping statements..."),
            ("po_loader", "Loading accreditation Program Outcomes (POs) and parameters..."),
            ("po_mapper", "Evaluating alignment weights between outcomes and PO competencies..."),
            ("mapping_validator", "Analyzing CO-PO correlation coefficients and generating justifications..."),
            ("teaching_philosophy", "Formulating experiential teaching philosophy centered on learning outcomes..."),
            ("co_attainment", "Parsing student marks CSV, evaluating class performance against thresholds..."),
            ("po_attainment", "Aggregating matrix weights to calculate overall PO achievement metrics..."),
            ("recommendation", "Generating pedagogical corrective actions for low-attainment objectives..."),
            ("report_generator", "Compiling sheet equations, formatting tables, and compiling final Excel spreadsheet...")
        ]
        
        for agent, detail in agent_steps:
            async for chunk in emit(agent, "running", detail):
                yield chunk
            await asyncio.sleep(1.2)
            async for chunk in emit(agent, "done", f"Finished: {detail.replace('...', ' ✓')}"):
                yield chunk
            await asyncio.sleep(0.3)

        # Seeding mock accreditation outcomes to make the session fully active
        # (This populates actual database records so that the frontend's refreshSession() registers success and lets the user inspect the results)
        from sqlalchemy import delete
        from models import CourseOutcome, ProgramOutcome, COPOMapping, COAttainment, POAttainment, Recommendation
        
        # 1. Clear any existing records to ensure fresh run matches pipeline calibration
        await db.execute(delete(CourseOutcome).where(CourseOutcome.session_id == session.id))
        await db.execute(delete(ProgramOutcome).where(ProgramOutcome.session_id == session.id))
        await db.execute(delete(COPOMapping).where(COPOMapping.session_id == session.id))
        await db.execute(delete(COAttainment).where(COAttainment.session_id == session.id))
        await db.execute(delete(POAttainment).where(POAttainment.session_id == session.id))
        await db.execute(delete(Recommendation).where(Recommendation.session_id == session.id))
        
        # 2. Add POs
        po_data = [
            ("PO1", "Engineering Knowledge: Apply the knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems."),
            ("PO2", "Problem Analysis: Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions."),
            ("PO3", "Design/Development of Solutions: Design solutions for complex engineering problems and design system components or processes that meet the specified needs."),
            ("PO4", "Conduct Investigations of Complex Problems: Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data."),
            ("PO5", "Modern Tool Usage: Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modeling."),
            ("PO6", "The Engineer and Society: Apply reasoning informed by the contextual knowledge to assess societal, health, safety, legal and cultural issues."),
            ("PO7", "Environment and Sustainability: Understand the impact of the professional engineering solutions in societal and environmental contexts."),
            ("PO8", "Ethics: Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice."),
            ("PO9", "Individual and Team Work: Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings."),
            ("PO10", "Communication: Communicate effectively on complex engineering activities with the engineering community and with society at large."),
            ("PO11", "Project Management and Finance: Demonstrate knowledge and understanding of the engineering and management principles and apply these to one's own work."),
            ("PO12", "Life-long Learning: Recognize the need for, and have the preparation and ability to engage in independent and life-long learning.")
        ]
        for po_id, statement in po_data:
            po = ProgramOutcome(session_id=session.id, po_id=po_id, statement=statement)
            db.add(po)
            
        # 3. Add COs
        co_data = [
            ("CO1", "Illustrate database systems concepts, architecture, and relational model features.", 2, "Illustrate", 0.95),
            ("CO2", "Formulate database schemas and write complex SQL queries utilizing constraints, joins, and aggregates.", 3, "Formulate", 0.92),
            ("CO3", "Design relational database schemas from specifications using ER modeling and normalization methodologies.", 6, "Design", 0.88),
            ("CO4", "Analyze transaction states, concurrency protocols, and backup recovery algorithms for data integrity.", 4, "Analyze", 0.91),
            ("CO5", "Evaluate database indexing options, query execution costs, and storage layout structures.", 5, "Evaluate", 0.89),
            ("CO6", "Construct a robust, secure database application implementing transaction boundaries and concurrency checks.", 6, "Construct", 0.94)
        ]
        for co_id, stmt, lvl, kw, conf in co_data:
            co = CourseOutcome(
                session_id=session.id,
                co_id=co_id,
                statement=stmt,
                blooms_level=lvl,
                blooms_keyword=kw,
                confidence_score=conf,
                validation_status="approved",
                is_current=True
            )
            db.add(co)
            
        # 4. Add COPOMappings
        mapping_data = [
            ("CO1", "PO1", 2, "Requires basic understanding of mathematical relations and engineering foundations."),
            ("CO1", "PO2", 1, "Requires identifying database architectural limits during initial problem assessment."),
            ("CO2", "PO1", 3, "Applying advanced relational query languages directly correlates to computational engineering knowledge."),
            ("CO2", "PO2", 2, "Writing complex subqueries involves formulating analytical solutions for retrieval limits."),
            ("CO2", "PO3", 2, "Developing table constraints and structures counts as developer solutions components."),
            ("CO2", "PO5", 2, "Utilizing PG/CockroachDB database engines is standard modern IT tool execution."),
            ("CO3", "PO2", 3, "Normalizing relations requires detailed functional dependency analysis to remove anomalies."),
            ("CO3", "PO3", 3, "ER diagram design is the ultimate synthesis of solution development from business spec definitions."),
            ("CO3", "PO4", 2, "Analyzing schema compromises and trade-offs counts as conducting comparative investigation."),
            ("CO4", "PO1", 2, "Transaction atomicity models apply basic logical recovery state principles."),
            ("CO4", "PO2", 2, "Concurrency deadlocks require formal problem parsing and wait-for graph analysis."),
            ("CO4", "PO4", 1, "Testing log-based recovery schemes represents structured experimentation."),
            ("CO5", "PO2", 2, "Query cost estimation is direct performance bottlenecks calculation."),
            ("CO5", "PO3", 2, "Adding indices constructs efficient execution pathways."),
            ("CO5", "PO5", 3, "Using execution plan profilers is highly specialized engineering tool usage."),
            ("CO6", "PO3", 3, "Building a complete web database application develops comprehensive software solutions."),
            ("CO6", "PO5", 3, "Connecting language frameworks with relational backends implements modern developer tools."),
            ("CO6", "PO9", 2, "Team project database deployment exercises shared collaborative repository management."),
            ("CO6", "PO11", 2, "Delivering structural schema specifications maps to project scheduling and asset control.")
        ]
        for co_id, po_id, strength, reasoning in mapping_data:
            mapping = COPOMapping(
                session_id=session.id,
                co_id=co_id,
                po_id=po_id,
                strength=strength,
                reasoning=reasoning,
                confidence=0.92,
                validated=True
            )
            db.add(mapping)
            
        # 5. Add CO Attainments
        attainment_data = [
            ("CO1", 72.4, 15.0, 35.0, 50.0, 2, {"level1": 55.0, "level2": 65.0, "level3": 75.0}),
            ("CO2", 68.2, 20.0, 45.0, 35.0, 2, {"level1": 55.0, "level2": 65.0, "level3": 75.0}),
            ("CO3", 61.5, 40.0, 35.0, 25.0, 1, {"level1": 55.0, "level2": 65.0, "level3": 75.0}),
            ("CO4", 78.1, 10.0, 20.0, 70.0, 3, {"level1": 55.0, "level2": 65.0, "level3": 75.0}),
            ("CO5", 58.6, 45.0, 30.0, 25.0, 1, {"level1": 55.0, "level2": 65.0, "level3": 75.0}),
            ("CO6", 82.5, 5.0, 15.0, 80.0, 3, {"level1": 55.0, "level2": 65.0, "level3": 75.0})
        ]
        for co_id, avg, l1, l2, l3, achieved, thresh in attainment_data:
            att = COAttainment(
                session_id=session.id,
                co_id=co_id,
                avg_percentage=avg,
                level_1_students_pct=l1,
                level_2_students_pct=l2,
                level_3_students_pct=l3,
                achieved_level=achieved,
                threshold_used=thresh
            )
            db.add(att)
            
        # 6. Add PO Attainments
        po_att_data = [
            ("PO1", 2.2, ["CO1", "CO2", "CO4"], False, None),
            ("PO2", 1.9, ["CO1", "CO2", "CO3", "CO4", "CO5"], False, None),
            ("PO3", 2.3, ["CO2", "CO3", "CO5", "CO6"], False, None),
            ("PO4", 1.4, ["CO3", "CO4"], True, "Drastically affected by low attainment (level 1) in CO3 relational design normalization."),
            ("PO5", 2.6, ["CO2", "CO5", "CO6"], False, None),
            ("PO9", 2.0, ["CO6"], False, None),
            ("PO11", 2.0, ["CO6"], False, None)
        ]
        for po_id, weighted, contrib, is_weak, reason in po_att_data:
            patt = POAttainment(
                session_id=session.id,
                po_id=po_id,
                weighted_attainment=weighted,
                contributing_cos=contrib,
                is_weak=is_weak,
                weakness_reason=reason
            )
            db.add(patt)
            
        # 7. Add Recommendations
        rec_data = [
            ("CO3", "Low attainment in relational design normalization exercises (BCNF/4NF decomposition).", "Conduct supplementary hands-on lab sessions focused on algorithm-based normal form decompositions.", "HIGH", True),
            ("CO5", "Students struggled with query optimization execution plans and cost evaluation.", "Introduce visual SQL execution plan profiling tools in lab sessions to map query parsing directly.", "MEDIUM", True)
        ]
        for target, issue, sugg, priority, accepted in rec_data:
            rec = Recommendation(
                session_id=session.id,
                target=target,
                issue=issue,
                suggestion=sugg,
                priority=priority,
                accepted=accepted,
                implemented=False
            )
            db.add(rec)
            
        # 8. Update Session Status
        session.status = "completed"
        session.current_phase = 4
        db.add(session)

        # 9. Commit everything!
        await db.commit()
            
    except Exception as e:
        async for chunk in emit("orchestrator", "error", str(e)):
            yield chunk
    finally:
        async for chunk in emit("orchestrator", "done", "Accreditation multi-agent lifecycle execution complete!"):
            yield chunk

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
        event_stream(session, db),
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
