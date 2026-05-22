from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost/copo_db")

# Automatically switch to cockroachdb dialect if connecting to CockroachDB Cloud
if "cockroachlabs.cloud" in DATABASE_URL or "cockroach" in DATABASE_URL:
    if DATABASE_URL.startswith("postgresql+asyncpg://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "cockroachdb+asyncpg://", 1)

connect_args = {}

if "sslmode=" in DATABASE_URL or "cockroachlabs.cloud" in DATABASE_URL:
    import ssl
    import urllib.parse
    
    # 1. Clean up sslmode from URL to prevent asyncpg TypeError
    url_parts = urllib.parse.urlparse(DATABASE_URL)
    query_params = urllib.parse.parse_qs(url_parts.query)
    sslmode = query_params.pop("sslmode", [None])[0]
    
    new_query = urllib.parse.urlencode(query_params, doseq=True)
    url_parts = url_parts._replace(query=new_query)
    DATABASE_URL = urllib.parse.urlunparse(url_parts)
    
    # 2. Configure SSL context by scanning standard locations
    appdata_dir = os.environ.get("APPDATA")
    cert_paths = []
    if appdata_dir:
        cert_paths.append(os.path.join(appdata_dir, "postgresql", "root.crt"))
    cert_paths.append(os.path.expanduser("~/.postgresql/root.crt"))
    cert_paths.append("root.crt")
    
    selected_cert = None
    for path in cert_paths:
        if os.path.exists(path):
            selected_cert = path
            break
            
    if selected_cert:
        ssl_context = ssl.create_default_context(cafile=selected_cert)
        ssl_context.verify_mode = ssl.CERT_REQUIRED
        ssl_context.check_hostname = True
        connect_args["ssl"] = ssl_context
        print(f"[DB] SSL verify-full configured using certificate: {selected_cert}")
    else:
        # Fallback to simple ssl=True if no certificate is found on this machine
        connect_args["ssl"] = True
        print("[DB] SSL enabled (generic fallback, no certificate found)")

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True, connect_args=connect_args)
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
