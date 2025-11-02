from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
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

Base.metadata.create_all(bind=engine)

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
