@echo off
setlocal

cd /d "%~dp0"

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

"%PS%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%cd%\Setup-NodePnpm.ps1"
if errorlevel 1 (
  echo.
  echo Setup failed. Read the messages above, fix the issue, then re-run.
  pause
  exit /b 1
)

echo.
echo Setup completed.
pause

