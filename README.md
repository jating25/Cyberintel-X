# CyberIntel-X – Threat Intelligence & SOC Dashboard

CyberIntel-X is a full‑stack security operations center (SOC) dashboard and threat‑intelligence aggregator.  
It ingests data from external feeds (NVD, VirusTotal, OTX, AbuseIPDB, MalShare, RSS), stores it in MongoDB, and exposes a FastAPI backend with a modern React (Vite) frontend for investigation and reporting.

---

## Features

- **Threat Intelligence**
  - Ingestion framework for NVD, VirusTotal, OTX, AbuseIPDB, MalShare, RSS.
  - MongoDB storage for threats, alerts, correlations, reports.
  - WebSocket channel for live updates.

- **SOC UI (React + Vite)**
  - Login, protected routes, theme toggle.
  - Dashboard with real metrics from `/api/analytics/dashboard`.
  - Threats table + map view, alert management, analytics and reports.
  - Security overview pages (Endpoints, Network, Vulnerabilities, IOC Management).

- **Reporting**
  - Report templates from `/api/reports/templates`.
  - Report generation via `/api/reports/generate/{template_id}`.
  - PDF download via `/api/reports/{report_id}/download?format=pdf` (and legacy `/api/reports/download/{filename}.pdf`).

---

## Tech Stack

- **Backend**
  - Python 3.11+ / FastAPI / Uvicorn
  - MongoDB (Motor / PyMongo)
  - Pydantic v2, python‑dotenv

- **Frontend**
  - React + Vite
  - Material UI (MUI)
  - react‑query, react‑router

---

## Getting Started (Local Development)

### 1. Prerequisites

- Python 3.11+ installed and on your PATH.
- Node.js 18+ and npm.
- MongoDB 7.x (a Windows distribution is bundled under `mongodb-fresh/`).

### 2. Environment Variables

Use the provided `.env` at the project root (or copy from `env.example`):

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws

MONGODB_URI=mongodb://localhost:27017/cyberintelx
MONGODB_DB=cyberintelx
SECRET_KEY=change-me-in-production
LOG_LEVEL=INFO
DEBUG=true
HOST=0.0.0.0
PORT=8000
WORKERS=1

# Threat intel API keys (optional but recommended)
VIRUSTOTAL_API_KEY=
OTX_API_KEY=
ABUSEIPDB_API_KEY=
MALSHARE_API_KEY=
RSS_FEED_URLS=
```

Fill in real API keys for feeds you want to enable. Leaving them empty will simply disable that specific ingestor.

### 3. Start MongoDB

From a new terminal:

```powershell
cd "C:\Users\ABCD\Desktop\CyberIntel-X\mongodb-fresh\mongodb-win32-x86_64-windows-7.0.12"
mkdir data\db -Force
.\bin\mongod.exe --dbpath ".\data\db"
```

Leave this terminal running.

### 4. Backend – FastAPI

From the project root:

```powershell
cd "C:\Users\ABCD\Desktop\CyberIntel-X"
pip install -r backend\requirements.txt
python run_backend.py
```

The backend will start on `http://localhost:8000`.

Useful endpoints:

- Health: `GET /api/health`
- Threats: `GET /api/threats`
- Alerts: `GET /api/alerts`
- Analytics: `GET /api/analytics/dashboard`
- Reports:
  - Templates: `GET /api/reports/templates`
  - Generate: `POST /api/reports/generate/{template_id}`
  - Download PDF: `GET /api/reports/{report_id}/download?format=pdf`

### 5. Frontend – React / Vite

From the `frontend` directory:

```powershell
cd "C:\Users\ABCD\Desktop\CyberIntel-X\frontend"
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Open the UI at `http://localhost:3000`.

Default demo credentials (dummy auth):

- **Username**: `admin`
- **Password**: `admin`

> Note: Authentication is intentionally simple for demo purposes (single hard‑coded user and dummy token).

---

## Running a Demo

For a smooth screen recording (e.g., LinkedIn demo):

1. Start **MongoDB**, **backend**, and **frontend** as above.
2. Log in at `http://localhost:3000` with `admin / admin`.
3. Walk through:
   - **Dashboard**: showcase totals and severity distribution.
   - **Threats**: table, filters, map view, and per‑threat details.
   - **Alerts**: list, filtering, and status updates.
   - **Reports**: generate a report and show the PDF download.
   - **Security** section: Endpoints / Network / Vulnerabilities / IOC overview pages.

---

## Production Notes

- Replace the dummy auth/token logic with a real user store and JWTs.
- Use strong, secret values for `SECRET_KEY` and never commit real API keys.
- Run FastAPI behind a reverse proxy (nginx, Traefik, etc.) and serve the Vite build (`npm run build`) as static assets.
- Configure proper TLS/HTTPS and network‑accessible MongoDB only when hardened and authenticated.

---

## License

This project is intended as a security‑focused demo / learning project.  
Adjust licensing text here to match your preferred license (e.g., MIT, Apache‑2.0).

