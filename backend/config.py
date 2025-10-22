from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = BASE_DIR / "media"
ORIGINAL_PHOTOS_DIR = MEDIA_DIR / "photos" / "original"
THUMBNAIL_PHOTOS_DIR = MEDIA_DIR / "photos" / "thumbnails"

DATA_DIR.mkdir(parents=True, exist_ok=True)
ORIGINAL_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAIL_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = f"sqlite:///{DATA_DIR / 'bonsai.db'}"
THUMBNAIL_SIZE = (512, 512)
