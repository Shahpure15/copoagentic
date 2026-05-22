import asyncio
from database import engine
from models import Base

async def run():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Schema updated successfully")

if __name__ == "__main__":
    asyncio.run(run())
