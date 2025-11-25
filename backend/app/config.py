from pathlib import Path
import sys

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings


def _get_data_root() -> Path:
    """Return the folder used for read/write data (database, media, logs)."""

    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent.parent


def _get_embed_root() -> Path:
    """Return the folder that contains bundled, read-only assets.

    In a PyInstaller build this is the temporary extraction folder. During
    development it points at the backend directory so files resolve normally.
    """

    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS"))  # type: ignore[attr-defined]
    return Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    data_root: Path = Field(default_factory=_get_data_root)
    embed_root: Path = Field(default_factory=_get_embed_root)
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    media_root: Path = Field(default_factory=lambda: _get_data_root() / "var" / "media")
    media_url: str = Field(default="/media")
    thumbnail_size: int = Field(default=512)
    api_prefix: str = Field(default="/api")
    frontend_dist: Path = Field(default_factory=lambda: _get_embed_root() / "app" / "frontend_dist")
    host: str = Field(default="127.0.0.1")
    app_port: int = Field(default=8000)
    auto_open_browser: bool = Field(default=True)

    @model_validator(mode="after")
    def set_defaults(self):  # type: ignore[override]
        if not self.database_url:
            self.database_url = f"sqlite:///{(self.data_root / 'bonsai.db').resolve()}"
        return self

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
settings.data_root.mkdir(parents=True, exist_ok=True)
settings.media_root.mkdir(parents=True, exist_ok=True)
(settings.media_root / "full").mkdir(parents=True, exist_ok=True)
(settings.media_root / "thumbs").mkdir(parents=True, exist_ok=True)
