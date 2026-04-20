# TS-D1000 Auth Demo

This workspace contains a dependency-free auth demo built from the documents in `Req`.

## What is implemented

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- Session-backed authentication with persistent local storage
- Login UI
- Logout flow
- Route/bootstrap guard using `/auth/me`
- Role-based sidebar visibility for `ADMIN` vs `OPERATOR`

## Runtime choice

The requested stack in `Req` is React + NestJS, but this machine currently has no Node.js, pnpm, Python, or .NET SDK installed.  
To keep progress moving, the auth prototype is implemented with:

- PowerShell `HttpListener` backend
- Static HTML/CSS/JavaScript frontend
- JSON file persistence in `data/`

This is for testing the auth behavior now. It can be migrated to NestJS/React later once Node tooling is available.

## Run

From the project root:

```powershell
.\Start-AuthDemo.ps1
```

Open:

```text
http://localhost:5050/
```

Or start it in the background, then just paste the link in your browser:

```powershell
.\Start-AuthBrowserTest.ps1
```

Optional auto-open browser:

```powershell
.\Start-AuthBrowserTest.ps1 -OpenBrowser
```

Stop background server:

```powershell
.\Stop-AuthBrowserTest.ps1
```

## Seed accounts

- `admin / Admin123!`
- `operator / Operator123!`

## Files

- `backend/server.ps1`: local API server and static host
- `frontend/index.html`: login and dashboard page
- `frontend/app.js`: auth client logic
- `frontend/styles.css`: UI styling
- `data/*.json`: persisted users, sessions, and audit logs

## Notes

- `logout` revokes the current session in persisted storage.
- Protected requests validate token signature, session status, expiry, and user status.
- The frontend clears local auth state even if logout returns an auth error, matching the UX spec.
