# Bonsai Tracker

A bonsai collection manager built with React (Vite) and a FastAPI backend. The backend provides persistent storage for trees, species, reminders, photos, and graveyard entries using SQLite and local media files.

## Project structure

```
.
├── backend/              # FastAPI application, database models, and media storage helpers
├── src/                  # React source code
├── public/
└── README.md
```

The backend stores data in `backend/data/bonsai.db` and image assets in `backend/media/` (originals and generated thumbnails).

## Prerequisites

- Node.js 18+
- Python 3.10+

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

The API will be available at `http://localhost:8000`. Media files are served from `http://localhost:8000/media/...`.

## Frontend setup

Install dependencies (only required once):

```bash
npm install
```

Create a `.env` file in the project root (next to `package.json`) and point the UI to the FastAPI server:

```
VITE_API_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

By default Vite serves the app at `http://localhost:5173`.

## Image handling

- Original uploads are saved under `backend/media/photos/original/`.
- Thumbnails (512×512) are generated automatically and stored under `backend/media/photos/thumbnails/`.
- The frontend displays thumbnails in lists and full-resolution images on detail views.

## Running tests / linting

There are currently no automated tests bundled with the project. Use `npm run lint` to run ESLint on the frontend code.
