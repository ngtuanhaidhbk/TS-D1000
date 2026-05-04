@echo off
setlocal
set ROOT=%~dp0
cd /d "%ROOT%"
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%ROOT%Run-UnitTests.ps1" %*
if errorlevel 1 (
  echo.
  echo Unit tests failed. See the output above for the first failing test.
  echo.
  pause
)
