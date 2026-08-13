import os
from collections.abc import Generator

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import load_local_env

load_local_env()
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./typeform.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

@event.listens_for(engine, "connect")
def enable_sqlite_foreign_keys(dbapi_connection, _connection_record):
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

class Base(DeclarativeBase):
    pass

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    from . import models, models_response  # noqa: F401
    Base.metadata.create_all(bind=engine)
    if DATABASE_URL.startswith("sqlite"):
        with engine.begin() as connection:
            columns = {column["name"] for column in inspect(connection).get_columns("creators")}
            additions = {
                "password_hash": "VARCHAR",
                "auth_provider": "VARCHAR NOT NULL DEFAULT 'password'",
                "google_sub": "VARCHAR",
            }
            for name, definition in additions.items():
                if name not in columns:
                    connection.execute(text(f"ALTER TABLE creators ADD COLUMN {name} {definition}"))
            form_columns = {column["name"] for column in inspect(connection).get_columns("forms")}
            if "welcome_message" not in form_columns:
                connection.execute(text("ALTER TABLE forms ADD COLUMN welcome_message VARCHAR DEFAULT 'Welcome! Let''s get started.'"))
