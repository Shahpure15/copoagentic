from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Teacher
from schemas.auth import RegisterRequest, LoginRequest, TokenResponse, hash_password, verify_password, create_access_token
from schemas.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(Teacher).where(Teacher.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Email already registered")

    teacher = Teacher(
        email=body.email,
        name=body.name,
        hashed_password=hash_password(body.password),
        department_id=body.department_id,
    )
    db.add(teacher)
    await db.flush()
    await db.refresh(teacher)

    token = create_access_token({"sub": str(teacher.id), "email": teacher.email, "role": teacher.role})
    return TokenResponse(
        access_token=token,
        user={"id": str(teacher.id), "email": teacher.email, "name": teacher.name, "role": teacher.role},
    )

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Teacher).where(Teacher.email == body.email))
    teacher = result.scalar_one_or_none()
    if not teacher or not verify_password(body.password, teacher.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if not teacher.is_active:
        raise HTTPException(403, "Account inactive")

    token = create_access_token({"sub": str(teacher.id), "email": teacher.email, "role": teacher.role})
    return TokenResponse(
        access_token=token,
        user={"id": str(teacher.id), "email": teacher.email, "name": teacher.name, "role": teacher.role},
    )
