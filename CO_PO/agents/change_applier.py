from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models import CourseOutcome, COPOMapping, AuditLog
import json
import asyncio

async def apply_pending_changes(session_id: str, pending_changes: dict, db: AsyncSession):
    if not pending_changes:
        return
        
    change_type = pending_changes.get("type")
    changes = pending_changes.get("changes", [])
    
    audit_logs = []
    
    if change_type == "update_co":
        for change in changes:
            co_id = change.get("id")
            field = change.get("field")
            new_value = change.get("new_value")
            
            result = await db.execute(
                select(CourseOutcome).where(
                    CourseOutcome.session_id == session_id,
                    CourseOutcome.co_id == co_id,
                    CourseOutcome.is_current == True
                )
            )
            cos = result.scalars().all()
            co = None
            if cos:
                co = cos[0]
                # Auto-cleanup duplicates if they exist due to a generation bug
                for extra_co in cos[1:]:
                    await db.delete(extra_co)
                    
            if co and hasattr(co, field):
                old_value = getattr(co, field)
                
                if field == "blooms_level":
                    if isinstance(new_value, str):
                        import re
                        match = re.search(r'\d+', new_value)
                        if match:
                            new_value = int(match.group())
                        else:
                            new_value = old_value # Fallback to avoid DB errors
                    elif not isinstance(new_value, int):
                        new_value = old_value

                setattr(co, field, new_value)
                db.add(co)
                
                audit_logs.append(AuditLog(
                    session_id=session_id,
                    agent="Mediator",
                    action="update_co",
                    detail=f"Updated {co_id} {field}",
                    log_metadata={"co_id": co_id, "field": field, "old_value": old_value, "new_value": new_value}
                ))
                
    elif change_type == "delete_co":
        for change in changes:
            co_id = change.get("id")
            result = await db.execute(
                select(CourseOutcome).where(
                    CourseOutcome.session_id == session_id,
                    CourseOutcome.co_id == co_id
                )
            )
            cos = result.scalars().all()
            for co in cos:
                await db.delete(co)
                
            audit_logs.append(AuditLog(
                session_id=session_id,
                agent="Mediator",
                action="delete_co",
                detail=f"Deleted {co_id}",
                log_metadata={"co_id": co_id}
            ))
                
    elif change_type == "update_mapping":
        for change in changes:
            mapping_id_parts = change.get("id").split("-") # Expected "CO1-PO2"
            if len(mapping_id_parts) == 2:
                co_id, po_id = mapping_id_parts
                field = change.get("field")
                new_value = change.get("new_value")
                
                result = await db.execute(
                    select(COPOMapping).where(
                        COPOMapping.session_id == session_id,
                        COPOMapping.co_id == co_id,
                        COPOMapping.po_id == po_id
                    )
                )
                mapping = result.scalars().first()
                if mapping and hasattr(mapping, field):
                    old_value = getattr(mapping, field)
                    
                    if field == "strength":
                        if isinstance(new_value, str):
                            import re
                            match = re.search(r'\d+', new_value)
                            if match:
                                new_value = int(match.group())
                        
                        if isinstance(new_value, int):
                            new_value = max(0, min(3, new_value))
                            
                    setattr(mapping, field, new_value)
                    mapping.manually_overridden = True
                    db.add(mapping)
                    
                    audit_logs.append(AuditLog(
                        session_id=session_id,
                        agent="Mediator",
                        action="update_mapping",
                        detail=f"Updated Mapping {co_id}-{po_id} {field}",
                        log_metadata={"co_id": co_id, "po_id": po_id, "field": field, "old_value": old_value, "new_value": new_value}
                    ))
                    
    elif change_type == "update_po":
        from models import ProgramOutcome
        for change in changes:
            po_id = change.get("id")
            field = change.get("field")
            new_value = change.get("new_value")
            
            result = await db.execute(
                select(ProgramOutcome).where(
                    ProgramOutcome.session_id == session_id,
                    ProgramOutcome.po_id == po_id
                )
            )
            po = result.scalars().first()
            if po and hasattr(po, field):
                old_value = getattr(po, field)
                
                setattr(po, field, new_value)
                db.add(po)
                
                audit_logs.append(AuditLog(
                    session_id=session_id,
                    agent="Mediator",
                    action="update_po",
                    detail=f"Updated {po_id} {field}",
                    log_metadata={"po_id": po_id, "field": field, "old_value": old_value, "new_value": new_value}
                ))
                    
    for log in audit_logs:
        db.add(log)
        
    await db.commit()
    
    # Agentic Sync Background task
    if len(audit_logs) > 0:
        asyncio.create_task(agentic_sync(session_id, change_type))

async def agentic_sync(session_id: str, change_type: str):
    from database import AsyncSessionLocal
    from core.state import AgentState
    from agents import po_mapper, mapping_validator, teaching_philosophy
    from models import Session, CourseOutcome, ProgramOutcome, COPOMapping
    from sqlalchemy import delete
    from sqlalchemy.orm import selectinload
    
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Session).where(Session.id == session_id))
            session = result.scalar_one_or_none()
            if not session: return
            
            state = AgentState()
            
            # Load COs
            cos_res = await db.execute(select(CourseOutcome).where(CourseOutcome.session_id == session_id))
            from core.schemas import CourseOutcome as CoreCO
            for c in cos_res.scalars().all():
                state.cos.append(CoreCO(co_id=c.co_id, statement=c.statement, blooms_level=c.blooms_level, blooms_keyword=c.blooms_keyword))
            
            # Load POs
            pos_res = await db.execute(select(ProgramOutcome).where(ProgramOutcome.session_id == session_id))
            from core.schemas import ProgramOutcome as CorePO
            for p in pos_res.scalars().all():
                state.pos.append(CorePO(po_id=p.po_id, statement=p.statement))
            
            if change_type in ["update_co", "update_po"]:
                # Recalculate mappings but respect manually overridden ones
                state = await asyncio.to_thread(po_mapper.run, state)
                state, _ = await asyncio.to_thread(mapping_validator.run, state)
                
                # Merge logic: Don't overwrite manually_overridden = True mappings
                existing_map_res = await db.execute(select(COPOMapping).where(COPOMapping.session_id == session_id))
                existing_maps = existing_map_res.scalars().all()
                overridden_keys = {(m.co_id, m.po_id): m for m in existing_maps if m.manually_overridden}
                
                await db.execute(delete(COPOMapping).where(COPOMapping.session_id == session_id))
                
                for new_m in state.co_po_mapping:
                    key = (new_m.co_id, new_m.po_id)
                    if key in overridden_keys:
                        old_m = overridden_keys[key]
                        db.add(COPOMapping(
                            session_id=session_id, co_id=old_m.co_id, po_id=old_m.po_id,
                            strength=old_m.strength, reasoning=old_m.reasoning,
                            confidence=old_m.confidence, validated=True, manually_overridden=True
                        ))
                    else:
                        db.add(COPOMapping(
                            session_id=session_id, co_id=new_m.co_id, po_id=new_m.po_id,
                            strength=new_m.strength, reasoning=getattr(new_m, 'reasoning', '') or getattr(new_m, 'justification', ''),
                            confidence=getattr(new_m, 'confidence', 0.9), validated=True
                        ))
                
            elif change_type == "update_mapping":
                # Maybe recalculate teaching philosophy or attainments if needed
                pass
                
            await db.commit()
    except Exception as e:
        print(f"Agentic Sync Error: {e}")
