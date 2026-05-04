@echo off
setlocal

set "PORT=5050"

echo Checking listeners on port %PORT%...
netstat -ano | findstr /i ":%PORT% " && (
  echo.
  echo If you cannot start the server, port %PORT% may already be in use.
  echo Use Task Manager to find the PID shown above, or run Stop-TestEnv.ps1 if available.
) || (
  echo No process is currently listening on port %PORT%.
)

pause

