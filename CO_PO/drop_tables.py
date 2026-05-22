import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from database import DATABASE_URL, connect_args

async def drop_all():
    engine = create_async_engine(DATABASE_URL, connect_args=connect_args)
    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS student_marks CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS assignments CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS students CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS po_attainment CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS co_attainment CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS co_po_mappings CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS program_outcomes CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS course_outcomes CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS recommendations CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS audit_logs CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS mediator_chats CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS student_batches CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS sessions CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS co_history CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS subjects CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS teachers CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS departments CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS institutions CASCADE;"))
        await conn.execute(text("DROP TABLE IF EXISTS alembic_version CASCADE;"))
        
    await engine.dispose()
    print("All tables dropped.")

if __name__ == "__main__":
    asyncio.run(drop_all())
