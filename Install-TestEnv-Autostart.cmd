@echo off
setlocal
cd /d "%~dp0"

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

"%PS%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%cd%\Install-TestEnv-Autostart.ps1"
if errorlevel 1 (
  echo.
  echo Install failed. See messages above.
  pause
  exit /b 1
)

echo.
echo Installed. From now on, after Windows login, just open:
echo   http://localhost:5050/
pause

