# Bonsai Tracker

This project now includes a FastAPI backend with persistent storage and a React front end that consumes the API. All bonsai data, updates, measurements, photos, species notes, and notifications are stored locally in SQLite with image assets written to disk. Thumbnails are generated automatically whenever you upload a new photo so the UI can load quickly while still providing access to the original resolution image.

---

## Prerequisites

Make sure the following tools are installed:

- **Python 3.11** or newer
- **Node.js 20** (or any active LTS release) and **npm**
- Optional but helpful: `make` for running the helper commands listed below

The instructions assume a POSIX shell (macOS/Linux/WSL). Windows PowerShell commands are noted where appropriate.

---

## 1. Backend setup (FastAPI + SQLite)

1. Open a terminal in the repository root and create a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   ```

2. Activate the virtual environment:
   ```bash
   # macOS/Linux/WSL
   source .venv/bin/activate

   # Windows PowerShell
   .venv\Scripts\Activate.ps1
   ```

3. Install the required Python packages:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. (Optional) Seed the database with sample data and directories for images:
   ```bash
   python -m app.seed
   ```
   This creates `bonsai.db` in the `backend/` directory, along with starter species, bonsai, measurements, and notifications. Photos will be stored under `backend/var/media` the first time you upload them.

5. Launch the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```

   By default the API listens on `http://localhost:8000`. Useful endpoints:

   - Interactive API docs: `http://localhost:8000/docs`
   - OpenAPI schema: `http://localhost:8000/openapi.json`
   - Static media (generated thumbnails/originals): `http://localhost:8000/media/...`

6. Keep the server running while you work with the front end.

### Backend tips

- The SQLite database file lives at `backend/bonsai.db`. Because everything is local, your data persists across restarts unless you delete the file.
- Uploaded images are written to `backend/var/media/full/` and `backend/var/media/thumbs/`. The API responses include the fully qualified URL for each version so the UI can load thumbnails quickly and fetch originals on demand.
- All CRUD routes are grouped under the `/api` prefix:
  - `/api/bonsai` for bonsai trees, photos, measurements, and updates
  - `/api/species` for your species library
  - `/api/notifications` for reminders and alerts
- Every POST/PUT/PATCH call returns the latest state from the database, making it easy to keep the UI in sync.

---

## 2. Frontend setup (React + Vite)

1. Duplicate the example environment file so the front end knows where to find the API:
   ```bash
   cd ..   # from backend back to repository root
   cp .env.example .env.local
   ```
   On Windows PowerShell use: `Copy-Item .env.example .env.local`

2. Install JavaScript dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev -- --host
   ```
   Vite prints a local URL (typically `http://localhost:5173`). Open it in your browser after the backend is running. The UI now fetches trees, species, and reminders directly from the API instead of using in-browser mock data.

4. Any time you make backend changes, restart the FastAPI process. Front-end changes hot-reload automatically.

---

## 3. Testing the full stack quickly

1. Start the backend (`uvicorn app.main:app --reload`).
2. Seed the database if you want sample content (`python -m app.seed`).
3. In a second terminal start the front end (`npm run dev -- --host`).
4. Visit `http://localhost:5173` and explore. You can:
   - Add a new bonsai (including optional photos). The API stores the original file and creates a thumbnail automatically.
   - Create new species entries; tree counts stay in sync because the backend updates them.
   - Review the generated notifications and measurements inside each tree’s detail view.

When you stop working, deactivate the Python virtual environment with `deactivate` and stop both servers (Ctrl+C in each terminal).

---

## 4. Project structure

```
backend/
  app/
    main.py            # FastAPI application entry point
    models.py          # SQLAlchemy models for bonsai, species, updates, etc.
    schemas.py         # Pydantic response/request models
    routers/           # CRUD routers grouped by resource
    utils/images.py    # Thumbnail/original image handling
    seed.py            # Optional database seeding script
  requirements.txt     # Backend dependencies
  var/media/           # Stored images (auto-created)
frontend (root)/
  src/                 # React application
  .env.example         # Front-end environment template
```

---

## 5. Compatibility matrix

All Python package versions were pinned and tested together:

- `fastapi==0.115.4`
- `uvicorn[standard]==0.32.1`
- `SQLAlchemy==2.0.36`
- `pydantic==2.9.2`
- `pydantic-settings==2.6.1`
- `python-multipart==0.0.17`
- `Pillow==11.0.0`

The React application relies on Node.js tooling managed by `npm install`. No additional global packages are required.

---

## 6. Useful commands summary

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed        # optional sample data
uvicorn app.main:app --reload

# Frontend (new terminal)
cd <repo root>
cp .env.example .env.local
npm install
npm run dev -- --host
```

You now have a complete local bonsai-tracking stack with persistent storage, photo management, and an API-driven React interface.

---

## 7. README formatting guide

The project now includes README-style editors for species care notes and individual tree logs. These editors expect Markdown so you can build rich documents without leaving the app. Here is a quick refresher on common patterns you can mix and match when writing structured plant guides:

- **Headings** – use `#` through `####` to define document hierarchy (e.g., `## Watering`).
- **Emphasis** – wrap text in `*italic*` or `**bold**` to call out important care tips.
- **Lists** – start lines with `-` or `1.` to create unordered or ordered lists for step-by-step instructions.
- **Tables** – surround column headers with pipes (`|`) and use `---` as a divider row to build seasonal care matrices.
- **Links & media** – `[Link text](https://example.com)` embeds references; `![Caption](image-url)` inserts hosted photos.

### Care README default template

Use the following template as a starting point when documenting a species or a specific bonsai. Each section is meant to be customized with the details you collect over time.

```markdown
## Light
- Preferred conditions:

## Watering
- Preferred moisture level:

## Temperature
- Cold tolerance:

## Fertilization
- Notes:

## Pruning & Training
- Notes:

## Soil
- Preferred Composition:

## Repotting
- Frequency:

## Pests & Diseases
- Common issues and treatments:

## Seasonal Care Summary Table
| Season | Care Focus | Notes |
| --- | --- | --- |
| Spring |  |  |
| Summer |  |  |
| Autumn |  |  |
| Winter |  |  |
```

You can insert this template directly from the in-app editor and then refine each field with bonsai-specific knowledge, photos, and links.
