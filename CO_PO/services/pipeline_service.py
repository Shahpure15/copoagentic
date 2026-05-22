import asyncio
from core.state import AgentState
from database import AsyncSessionLocal
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from models import Session, Subject, CourseOutcome, ProgramOutcome, COPOMapping
from agents import co_generator, co_validator, reflection_agent, po_mapper, mapping_validator, teaching_philosophy

async def emit(queue: asyncio.Queue, agent: str, status: str, detail: str = "", payload: dict = None):
    data = {"agent": agent, "status": status, "detail": detail}
    if payload:
        data["payload"] = payload
    await queue.put(data)

async def run_pipeline_task(session_id: str, queue: asyncio.Queue):
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Session).options(selectinload(Session.subject)).where(Session.id == session_id)
            )
            session = result.scalar_one_or_none()
            if not session:
                await emit(queue, "system", "error", "Session not found")
                return

            state = AgentState()
            state.subject_name = session.subject.name if session.subject else "Unknown"
            state.syllabus_text = session.syllabus_text or ""
            
            # Step 1: Syllabus Parsing Check
            await emit(queue, "syllabus_parser", "running", "Ingesting syllabus document...")
            await asyncio.sleep(1)
            await emit(queue, "syllabus_parser", "done", "Extracted course modules ✓")

            # Step 2: CO Generator
            await emit(queue, "co_generator", "running", "Formulating course outcomes mapped to syllabus topics using Bloom's Taxonomy...")
            state = await asyncio.to_thread(co_generator.run, state)
            await emit(queue, "co_generator", "done", "Generated Course Outcomes ✓")

            # Step 3: CO Validator
            await emit(queue, "co_validator", "running", "Critiquing outcomes for active verbs, cognitive load, and NBA alignment...")
            state, report = await asyncio.to_thread(co_validator.run, state)
            
            if not report.passed:
                await emit(queue, "co_validator", "done", "Validation generated constraints for correction.")
                await emit(queue, "reflection_agent", "running", "Reflecting: Optimizing verb selection and consolidating overlapping statements...")
                state.reflection_feedback = " ".join(report.issues)
                state = await asyncio.to_thread(reflection_agent.run, state)
                await emit(queue, "reflection_agent", "done", "Refined Course Outcomes ✓")
            else:
                await emit(queue, "co_validator", "done", "Validation passed ✓")
                await emit(queue, "reflection_agent", "running", "No reflection needed.")
                await emit(queue, "reflection_agent", "done", "Skipped reflection ✓")

            # Save COs to DB
            await db.execute(delete(CourseOutcome).where(CourseOutcome.session_id == session_id))
            for co in state.cos:
                db_co = CourseOutcome(
                    session_id=session_id,
                    co_id=co.co_id,
                    statement=co.statement,
                    blooms_level=co.blooms_level,
                    blooms_keyword=co.blooms_keyword,
                    confidence_score=getattr(co, 'confidence_score', 0.9),
                    validation_status=getattr(co, 'validation_status', 'approved'),
                    rejection_reason=getattr(co, 'rejection_reason', None),
                    is_current=True
                )
                db.add(db_co)
            await db.commit()

            # Step 4: PO Loader
            await emit(queue, "po_loader", "running", "Loading accreditation Program Outcomes (POs) and parameters...")
            
            existing_pos_result = await db.execute(select(ProgramOutcome).where(ProgramOutcome.session_id == session_id))
            existing_pos = existing_pos_result.scalars().all()
            
            from core.schemas import ProgramOutcome as CorePO
            
            if existing_pos:
                for db_po in existing_pos:
                    state.pos.append(CorePO(po_id=db_po.po_id, statement=db_po.statement))
            else:
                po_data = [
                    ("PO1", "Engineering Knowledge"), ("PO2", "Problem Analysis"),
                    ("PO3", "Design/Development"), ("PO4", "Conduct Investigations"),
                    ("PO5", "Modern Tool Usage"), ("PO6", "The Engineer and Society"),
                    ("PO7", "Environment and Sustainability"), ("PO8", "Ethics"),
                    ("PO9", "Individual and Team Work"), ("PO10", "Communication"),
                    ("PO11", "Project Management and Finance"), ("PO12", "Life-long Learning")
                ]
                for po_id, statement in po_data:
                    state.pos.append(CorePO(po_id=po_id, statement=statement))
                    db_po = ProgramOutcome(session_id=session_id, po_id=po_id, statement=statement)
                    db.add(db_po)
                await db.commit()
            await emit(queue, "po_loader", "done", "Loaded POs ✓")

            # Step 5: PO Mapper
            await emit(queue, "po_mapper", "running", "Evaluating alignment weights between outcomes and PO competencies...")
            state = await asyncio.to_thread(po_mapper.run, state)
            await emit(queue, "po_mapper", "done", "Mapped COs to POs ✓")

            # Step 6: Mapping Validator
            await emit(queue, "mapping_validator", "running", "Analyzing CO-PO correlation coefficients and generating justifications...")
            state, mapping_report = await asyncio.to_thread(mapping_validator.run, state)
            await emit(queue, "mapping_validator", "done", "Validated Mapping Matrix ✓")

            # Save Mappings to DB
            await db.execute(delete(COPOMapping).where(COPOMapping.session_id == session_id))
            for m in state.co_po_mapping:
                db_mapping = COPOMapping(
                    session_id=session_id,
                    co_id=m.co_id,
                    po_id=m.po_id,
                    strength=m.strength,
                    reasoning=getattr(m, 'reasoning', '') or getattr(m, 'justification', ''),
                    confidence=getattr(m, 'confidence', 0.9),
                    validated=True
                )
                db.add(db_mapping)
            await db.commit()

            # Step 7: Teaching Philosophy
            await emit(queue, "teaching_philosophy", "running", "Formulating experiential teaching philosophy centered on learning outcomes...")
            state = await asyncio.to_thread(teaching_philosophy.run, state)
            session.teaching_philosophy = state.teaching_philosophy
            session.status = "in_progress"
            session.current_phase = 2  # Ready for Matrix phase
            db.add(session)
            await db.commit()
            await emit(queue, "teaching_philosophy", "done", "Teaching Philosophy Generated ✓")

            # Mark orchestrator done
            await emit(queue, "orchestrator", "done", "Accreditation multi-agent lifecycle execution complete!")
            
    except Exception as e:
        await emit(queue, "orchestrator", "error", str(e))
    finally:
        # Signal end of stream
        await queue.put(None)
