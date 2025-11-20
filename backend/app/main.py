from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .config import settings
from .database import Base, SessionLocal, engine
from . import models
from .routers import (
    accolades,
    backup,
    bonsai,
    measurements,
    notifications,
    photos,
    species,
    updates,
)


def _ensure_schema_migrations() -> None:
    inspector = inspect(engine)

    if inspector.has_table("measurements"):
        columns = {column["name"] for column in inspector.get_columns("measurements")}
        if "update_id" not in columns:
            with engine.connect() as connection:
                connection.execute(text("ALTER TABLE measurements ADD COLUMN update_id INTEGER"))
                connection.commit()

    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        orphaned = (
            session.query(models.Measurement)
            .filter(models.Measurement.update_id.is_(None))
            .all()
        )
        for measurement in orphaned:
            performed_at = measurement.measured_at or measurement.created_at
            update = models.BonsaiUpdate(
                bonsai_id=measurement.bonsai_id,
                title="Measurement recorded",
                description=measurement.notes,
                performed_at=performed_at,
            )
            session.add(update)
            session.flush()
            measurement.update_id = update.id
            session.add(measurement)
        if orphaned:
            session.commit()


_ensure_schema_migrations()

app = FastAPI(title="Bonsai Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(species.router)
app.include_router(bonsai.router)
app.include_router(measurements.router)
app.include_router(updates.router)
app.include_router(photos.router)
app.include_router(notifications.router)
app.include_router(backup.router)
app.include_router(accolades.router)

app.mount(settings.media_url, StaticFiles(directory=settings.media_root), name="media")


@app.get("/")
def read_root():
    return {"message": "Bonsai Tracker API", "docs_url": "/docs"}
