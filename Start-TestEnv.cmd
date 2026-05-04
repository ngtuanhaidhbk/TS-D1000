@echo off
setlocal
set ROOT=%~dp0
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%ROOT%Start-TestEnv.ps1"
if errorlevel 1 (
  echo.
  echo Start-TestEnv failed. See logs at:
  echo   %ROOT%data\test-env.server.log
  echo   %ROOT%data\test-env.server.err.log
  echo.
  pause
)
