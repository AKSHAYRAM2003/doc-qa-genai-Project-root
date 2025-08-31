#!/usr/bin/env python3
"""
Database reset script for DocSpotlight.
Drops and recreates all tables with the updated schema.
"""
import asyncio
from database import drop_tables, create_tables, check_connection

async def reset_database():
    """Reset the database by dropping and recreating all tables."""
    print("Resetting DocSpotlight database...")
    
    # Check connection first
    if not await check_connection():
        print("Failed to connect to database. Please check your database configuration.")
        return False
    
    try:
        # Drop existing tables
        await drop_tables()
        print("Dropped existing tables.")
        
        # Create tables with new schema
        await create_tables()
        print("Database reset completed successfully!")
        return True
    except Exception as e:
        print(f"Database reset failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(reset_database())
