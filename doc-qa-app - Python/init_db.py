#!/usr/bin/env python3
"""
Database initialization script for DocSpotlight.
Creates all necessary tables in the database.
"""
import asyncio
from database import create_tables, check_connection

async def init_database():
    """Initialize the database by creating all tables."""
    print("Initializing DocSpotlight database...")
    
    # Check connection first
    if not await check_connection():
        print("Failed to connect to database. Please check your database configuration.")
        return False
    
    # Create tables
    try:
        await create_tables()
        print("Database initialization completed successfully!")
        return True
    except Exception as e:
        print(f"Database initialization failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(init_database())
