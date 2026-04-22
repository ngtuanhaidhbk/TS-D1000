@echo off
setlocal enabledelayedexpansion

rem One-click test environment launcher (visible console).
rem - Starts the PowerShell demo server in a new window and keeps it open (-NoExit)
rem - Opens the browser to the local URL
rem - Avoids PowerShell's `start` alias pitfalls by using cmd.exe `start`

cd /d "%~dp0"

set "PORT=5050"
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
set "SERVER_PS1=%cd%\backend\server.ps1"

if not exist "%SERVER_PS1%" (
  echo ERROR: Missing "%SERVER_PS1%".
  echo Make sure you run this from the repo root.
  pause
  exit /b 1
)

echo Starting TS-D1000 demo server on http://127.0.0.1:%PORT%/ ...
start "TS-D1000 Demo Server" "%PS%" -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%SERVER_PS1%" -Port %PORT%

rem Give the server a moment to bind.
timeout /t 1 /nobreak >nul

echo Opening browser...
start "" "http://127.0.0.1:%PORT%/"

echo.
echo If the page shows "refused to connect":
echo - Look at the "TS-D1000 Demo Server" window for errors.
echo - If you see "Access is denied" / URL ACL error, run Setup-UrlAcl-5050.cmd as Administrator once.
echo.
pause
