import asyncpg
import os

DB_URL = os.getenv("DATABASE_URL")


async def get_db_connection():
    """Establish a connection to the PostgreSQL/TimescaleDB database."""
    return await asyncpg.connect(DB_URL)
