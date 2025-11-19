# Bonsai Tracker

This project now includes a FastAPI backend with persistent storage and a React front end that consumes the API. All bonsai data, updates, measurements, photos, species notes, and notifications are stored locally in SQLite with image assets written to disk. Thumbnails are generated automatically whenever you upload a new photo so the UI can load quickly while still providing access to the original resolution image.

---

## Quick start (single command)

If you want to skip the manual backend/frontend setup steps, run the bundled
`start_project.sh` helper from the repository root:

```bash
chmod +x start_project.sh   # first time only, makes the script executable
./start_project.sh
```

The script will install backend and frontend dependencies, create
`backend/.venv`, copy `.env.example` to `.env.local` when missing, and then
launch both the FastAPI API (`http://localhost:8000`) and the Vite dev server
(`http://localhost:5173`) bound to `0.0.0.0`. It now attempts to detect your
LAN IP automatically so the console prints the shareable URL and `.env.local`
gets an updated `VITE_API_BASE_URL`. If automatic detection fails (or you want
to override the address), export `HOST_IP` before launching:

```bash
HOST_IP=192.168.1.42 ./start_project.sh
```

Devices on the same network can then open `http://<your-ip>:5173` in a browser
and use the app normally. Press **Ctrl+C** when you are finished to stop both
processes.

You can re-run the script anytime; it is idempotent and simply restarts the
servers after ensuring dependencies are installed.

### Step-by-step on Windows (Git Bash)

1. Install [Git for Windows](https://git-scm.com/download/win) if you have not
   already and launch **Git Bash** from the Start Menu.
2. Navigate to the project root, e.g. `cd ~/Desktop/bonsai-tracker-react`.
3. Make the helper executable the first time you clone the repo:
   ```bash
   chmod +x start_project.sh
   ```
4. The script will try to auto-detect your LAN IP so phones/tablets on the same
   Wi-Fi can reach the dev server. If it cannot determine the correct address or
   you need to override it, set `HOST_IP` explicitly and run the script in the
   same terminal:
   ```bash
   HOST_IP=192.168.86.249 ./start_project.sh
   ```
   Leave the terminal window open. The script will create `backend/.venv`,
   install Python/Node dependencies, and copy `.env.example` to `.env.local` the
   first time it runs. Whenever an IP address is available (auto-detected or
   supplied via `HOST_IP`), the helper injects
   `VITE_API_BASE_URL=http://<HOST_IP>:8000/api` into `.env.local` so the React
   app and your phone/tablet all talk to the same FastAPI instance.
5. Wait for the banner that prints both `http://localhost:5173` and the
   network URL (`http://<HOST_IP>:5173`). Open either address from your desktop
   browser (and the network URL from other devices). Hot reload works the same
   as on macOS/Linux.
6. Keep Git Bash running. When you are done, press **Ctrl+C** once in that
   window; the script traps the signal and stops both FastAPI and Vite cleanly.

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
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   By default the API listens on `http://localhost:8000` when accessed from the same machine.
   Binding to `0.0.0.0` keeps it reachable from other devices on your LAN (desktop, laptop,
   tablet, or phone). Useful endpoints:

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
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
   Vite prints a local URL (typically `http://localhost:5173`). Open it in your browser after the backend is running. The UI now fetches trees, species, and reminders directly from the API instead of using in-browser mock data.

4. Any time you make backend changes, restart the FastAPI process. Front-end changes hot-reload automatically.

---

## 3. Testing the full stack quickly

1. Start the backend (`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`).
2. Seed the database if you want sample content (`python -m app.seed`).
3. In a second terminal start the front end (`npm run dev -- --host 0.0.0.0 --port 5173`).
4. Visit `http://localhost:5173` and explore. You can:
   - Add a new bonsai (including optional photos). The API stores the original file and creates a thumbnail automatically.
   - Create new species entries; tree counts stay in sync because the backend updates them.
   - Review the generated notifications and measurements inside each tree’s detail view.

When you stop working, deactivate the Python virtual environment with `deactivate` and stop both servers (Ctrl+C in each terminal).

---

## 4. Parallel desktop + mobile usage

Follow these steps to work on a desktop or laptop while simultaneously reviewing and editing data from a phone or tablet on the
same Wi‑Fi/LAN. All devices talk to the single FastAPI instance, so updates made anywhere immediately appear everywhere else bec
ause they read and write to the shared SQLite database and media directories.

1. Make sure the desktop/laptop that runs the servers and your mobile device are on the same network. Disable VPNs that would pu
t them on separate subnets.
2. Find the IP address of the machine running the servers:
   - macOS/Linux: `ipconfig getifaddr en0` (Wi‑Fi) or `ifconfig` and copy the `inet` value.
   - Windows PowerShell: `Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -match "Wi"}`
3. Update the front-end environment file so it points to that IP:
   ```bash
   # from the repository root
   cp .env.example .env.local      # if you have not already
   # then edit .env.local and replace localhost with your IP, for example
   # VITE_API_BASE_URL=http://192.168.1.50:8000/api
   ```
4. (Optional but recommended) Configure your operating system firewall to allow inbound connections on ports **8000** (FastAPI)
   and **5173** (Vite dev server).
5. Start the backend with the network-facing host:
   ```bash
   cd backend
   source .venv/bin/activate  # or .venv\Scripts\Activate.ps1 on Windows
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
6. Start the front end from another terminal:
   ```bash
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
7. On the desktop you can continue using `http://localhost:5173`, but you can also open
   `http://<your-ip>:5173` to confirm external access.
8. On the mobile device open a browser and visit `http://<your-ip>:5173`. The React app reads the `.env.local` setting, calls
   the FastAPI API at `http://<your-ip>:8000/api`, and receives the same bonsai data, photos, and notifications stored on disk.
9. Add or edit data from either device. Because there is only one backend process, every change is immediately written to the
   database and media storage, so refreshing the UI on any device reflects the updates.

When you are done, stop both servers (Ctrl+C) and deactivate the Python virtual environment. Mobile clients will no longer be
able to reach the app until you restart the services.

---

## 5. Project structure

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

## 6. Compatibility matrix

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

## 7. Useful commands summary

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed        # optional sample data
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (new terminal)
cd <repo root>
cp .env.example .env.local
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

You now have a complete local bonsai-tracking stack with persistent storage, photo management, and an API-driven React interface.

---

## 8. README formatting guide

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
