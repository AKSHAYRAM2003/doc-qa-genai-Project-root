"""
Database configuration and connection management.
This provides both async and sync database access for DocSpotlight.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, Session
from models import Base
from typing import AsyncGenerator

# Database configuration
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:Akshay@localhost/docspotlight_dev"
)

# Sync database URL (for Alembic migrations)
SYNC_DATABASE_URL = os.getenv(
    "SYNC_DATABASE_URL",
    "postgresql://postgres:Akshay@localhost/docspotlight_dev"
)

# Create async engine for FastAPI
async_engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Set to False in production
    future=True
)

# Create sync engine for migrations
sync_engine = create_engine(SYNC_DATABASE_URL, echo=True)

# Session factories
AsyncSessionLocal = sessionmaker(
    async_engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

SyncSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=sync_engine
)

# Dependency for getting async database session
async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get async database session for FastAPI endpoints."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            raise e
        finally:
            await session.close()

# Dependency for getting sync database session (if needed)
def get_sync_db() -> Session:
    """Get sync database session."""
    db = SyncSessionLocal()
    try:
        return db
    finally:
        db.close()

# Database initialization functions
async def create_tables():
    """Create all tables in the database."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[Database] All tables created successfully")

async def drop_tables():
    """Drop all tables (use with caution!)."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("[Database] All tables dropped")

# Database utilities
async def check_connection():
    """Check if database connection is working."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute("SELECT 1")
        print("[Database] Connection successful")
        return True
    except Exception as e:
        print(f"[Database] Connection failed: {e}")
        return False

# Environment detection
def is_production():
    """Check if running in production environment."""
    return os.getenv("ENVIRONMENT", "development").lower() == "production"

def get_database_config():
    """Get current database configuration."""
    return {
        "database_url": DATABASE_URL,
        "sync_database_url": SYNC_DATABASE_URL,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "echo": not is_production()
    }
