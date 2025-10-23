from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    database_url: str = Field(default="sqlite:///./bonsai.db", alias="DATABASE_URL")
    media_root: Path = Field(default_factory=lambda: Path(__file__).resolve().parent.parent / "var" / "media")
    media_url: str = Field(default="/media")
    thumbnail_size: int = Field(default=512)
    api_prefix: str = Field(default="/api")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
settings.media_root.mkdir(parents=True, exist_ok=True)
(settings.media_root / "full").mkdir(parents=True, exist_ok=True)
(settings.media_root / "thumbs").mkdir(parents=True, exist_ok=True)
