from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from database import engine, Base
from routers import auth, sessions, pipeline, mediator, history, reports, courses, learning_plan

app = FastAPI(
    title="CO-PO Agentic Platform API",
    description="Multi-agent system for NBA/NAAC accreditation automation",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])
app.include_router(mediator.router, prefix="/api/mediator", tags=["mediator"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(learning_plan.router, prefix="/api/learning_plan", tags=["learning_plan"])

# Static files for report downloads
os.makedirs("data/output", exist_ok=True)
app.mount("/files", StaticFiles(directory="data/output"), name="files")

@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        err_msg = str(e).lower()
        if "already exists" in err_msg or "duplicate" in err_msg:
            print("[Startup] Database tables already exist. Skipping creation.")
        else:
            raise e

    # Seed default data
    try:
        from database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            from sqlalchemy import select
            from models import Institution, Department, Teacher
            from schemas.auth import hash_password
            
            # 1. Seed Institution
            inst_result = await session.execute(select(Institution).where(Institution.code == "ENGG_COLLEGE"))
            inst = inst_result.scalar_one_or_none()
            if not inst:
                inst = Institution(name="Engineering College", code="ENGG_COLLEGE")
                session.add(inst)
                await session.flush()
                print("[Seeding] Created default Institution: Engineering College")
            
            # 2. Seed Department
            dept_result = await session.execute(select(Department).where(Department.code == "CS", Department.institution_id == inst.id))
            dept = dept_result.scalar_one_or_none()
            if not dept:
                dept = Department(name="Computer Science", code="CS", institution_id=inst.id)
                session.add(dept)
                await session.flush()
                print("[Seeding] Created default Department: Computer Science")
                
            # 3. Seed Teacher (Dr. Atharv)
            teacher_result = await session.execute(select(Teacher).where(Teacher.email == "atharv@engg.edu"))
            teacher = teacher_result.scalar_one_or_none()
            if not teacher:
                teacher = Teacher(
                    email="atharv@engg.edu",
                    name="Dr. Atharv",
                    hashed_password=hash_password("copo"),
                    department_id=dept.id,
                    role="teacher"
                )
                session.add(teacher)
                await session.flush()
                print("[Seeding] Created default Teacher: Dr. Atharv (atharv@engg.edu / copo)")
            
            await session.commit()
            print("[Seeding] Database check completed successfully.")
    except Exception as seed_err:
        print(f"[Seeding] Seeding warning (ignoring): {seed_err}")


