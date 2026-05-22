import asyncio
from database import AsyncSessionLocal
from models import COAttainment, POAttainment
from sqlalchemy import delete

async def clear():
    async with AsyncSessionLocal() as db:
        await db.execute(delete(COAttainment))
        await db.execute(delete(POAttainment))
        await db.commit()
    print("Cleared")

asyncio.run(clear())
