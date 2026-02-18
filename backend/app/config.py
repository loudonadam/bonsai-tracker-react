from pathlib import Path
import shutil
from pydantic import Field
from pydantic_settings import BaseSettings


def _default_data_root() -> Path:
    return Path.home() / ".bonsai-tracker"


def _default_database_url() -> str:
    return f"sqlite:///{(_default_data_root() / 'bonsai.db').as_posix()}"


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    database_url: str = Field(default_factory=_default_database_url, alias="DATABASE_URL")
    media_root: Path = Field(default_factory=lambda: _default_data_root() / "media")
    media_url: str = Field(default="/media")
    thumbnail_size: int = Field(default=512)
    api_prefix: str = Field(default="/api")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

legacy_data_root = Path(__file__).resolve().parent.parent
legacy_db_path = legacy_data_root / "bonsai.db"
legacy_media_root = legacy_data_root / "var" / "media"

configured_db_path = None
if settings.database_url.startswith("sqlite:///"):
    configured_db_path = Path(settings.database_url.removeprefix("sqlite:///"))
    configured_db_path.parent.mkdir(parents=True, exist_ok=True)

if configured_db_path and not configured_db_path.exists() and legacy_db_path.exists():
    shutil.copy2(legacy_db_path, configured_db_path)

settings.media_root.mkdir(parents=True, exist_ok=True)
(settings.media_root / "full").mkdir(parents=True, exist_ok=True)
(settings.media_root / "thumbs").mkdir(parents=True, exist_ok=True)

if legacy_media_root.exists():
    for folder_name in ("full", "thumbs"):
        source_folder = legacy_media_root / folder_name
        target_folder = settings.media_root / folder_name
        if not source_folder.exists():
            continue
        for source_file in source_folder.iterdir():
            target_file = target_folder / source_file.name
            if source_file.is_file() and not target_file.exists():
                shutil.copy2(source_file, target_file)
