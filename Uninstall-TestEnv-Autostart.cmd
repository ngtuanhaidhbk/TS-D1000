@echo off
setlocal
cd /d "%~dp0"

set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

"%PS%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%cd%\Uninstall-TestEnv-Autostart.ps1"
echo.
pause

