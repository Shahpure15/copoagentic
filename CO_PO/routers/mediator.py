import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Session, Teacher, MediatorChat
from schemas.deps import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ChatMessage(BaseModel):
    message: str
    phase: int = 1

class ConfirmChanges(BaseModel):
    chat_id: str
    accept: bool
    teacher_note: Optional[str] = None

@router.post("/{session_id}/chat")
async def mediator_chat(
    session_id: str,
    body: ChatMessage,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.teacher_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    if session.is_locked:
        raise HTTPException(403, "Session is locked. Curriculum modifications are frozen.")

    history_result = await db.execute(
        select(MediatorChat)
        .where(MediatorChat.session_id == session_id, MediatorChat.phase == body.phase)
        .order_by(MediatorChat.created_at)
    )
    history = history_result.scalars().all()

    user_msg = MediatorChat(
        session_id=session_id,
        phase=body.phase,
        role="user",
        content=body.message,
    )
    db.add(user_msg)
    await db.flush()

    await db.refresh(session, ["course_outcomes", "program_outcomes", "mappings"])
    
    from agents.mediator_agent import get_mediator_response
    response = await get_mediator_response(session, history, body.message, body.phase)

    assistant_msg = MediatorChat(
        session_id=session_id,
        phase=body.phase,
        role="assistant",
        content=response["reply"],
        pending_changes=response.get("pending_changes"),
    )
    db.add(assistant_msg)
    await db.flush()
    await db.refresh(assistant_msg)

    return {
        "chat_id": str(assistant_msg.id),
        "reply": response["reply"],
        "pending_changes": response.get("pending_changes"),
    }

@router.post("/{session_id}/confirm")
async def confirm_changes(
    session_id: str,
    body: ConfirmChanges,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MediatorChat, Session)
        .join(Session, MediatorChat.session_id == Session.id)
        .where(MediatorChat.id == body.chat_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(404, "Chat message not found")
        
    chat_msg, session = row
    if str(chat_msg.session_id) != session_id:
        raise HTTPException(404, "Chat message not found")
    if session.is_locked:
        raise HTTPException(403, "Session is locked. Curriculum modifications are frozen.")
    if chat_msg.changes_applied:
        raise HTTPException(400, "Changes already applied")

    if body.accept and chat_msg.pending_changes:
        from agents.change_applier import apply_pending_changes
        await apply_pending_changes(session_id, chat_msg.pending_changes, db)

    chat_msg.changes_applied = True
    return {"ok": True, "applied": body.accept}

@router.get("/{session_id}/history")
async def get_chat_history(
    session_id: str,
    phase: int = 1,
    current_user: Teacher = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MediatorChat)
        .where(MediatorChat.session_id == session_id, MediatorChat.phase == phase)
        .order_by(MediatorChat.created_at)
    )
    msgs = result.scalars().all()
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "pending_changes": m.pending_changes,
            "changes_applied": m.changes_applied,
            "created_at": m.created_at.isoformat(),
        }
        for m in msgs
    ]
