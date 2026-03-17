# RecycleAgent
A Smart Recycling Classifier web app that uses machine learning to analyze waste photos and predict material types, then provides disposal recommendations and location-specific recycling instructions.

## Run (recommended: Docker)

Prereq: Docker Desktop (Windows/Mac/Linux).

From the repo root:

```bash
docker compose up --build
```

Then open:

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- API docs (Swagger): http://localhost:5000/docs

Stop with Ctrl+C, then clean up containers:

```bash
docker compose down
```

Notes:

- If `docker compose` also isn't found, Docker Desktop likely isn't installed or isn't on your PATH.
- On Windows + Git Bash, you can also try `docker.exe compose up --build`.

## Run (local dev, no Docker)

### Backend (FastAPI)

Prereq: Python 3.11+

```bash
cd backend
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

### Frontend (React + Vite)

Prereq: Node.js (recommended: 20+)

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
