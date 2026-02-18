from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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

frontend_dir = Path(settings.frontend_dist)
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith(settings.api_prefix.lstrip("/")):
            raise HTTPException(status_code=404)

        index_file = frontend_dir / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        raise HTTPException(status_code=404)


@app.get("/")
def read_root():
    return {"message": "Bonsai Tracker API", "docs_url": "/docs"}
