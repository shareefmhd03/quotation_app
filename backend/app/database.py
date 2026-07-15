"""Database engine + session wiring (data layer foundation)."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

# check_same_thread only matters for SQLite; harmless to compute conditionally.
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_columns() -> None:
    """Add columns introduced after a table was first created.

    A minimal stand-in for migrations while on SQLite; adopt Alembic when moving
    to Postgres. Only handles additive columns (SQLite ALTER TABLE ADD COLUMN).
    """
    from sqlalchemy import inspect, text

    required = {
        "quotations": [("company_id", "INTEGER")],
        "companies": [("logo_path", "VARCHAR(500)"), ("default_terms", "TEXT")],
    }
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, cols in required.items():
            if table not in existing_tables:
                continue  # create_all will build it with the column already present
            present = {c["name"] for c in inspector.get_columns(table)}
            for name, coltype in cols:
                if name not in present:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {coltype}"))
