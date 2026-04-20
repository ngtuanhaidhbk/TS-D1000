Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = Join-Path $root "backend\server.ps1"

Write-Host "Starting auth demo server..."
Write-Host "URL: http://localhost:5050/"
Write-Host "Press Ctrl+C in this window to stop."

powershell -ExecutionPolicy Bypass -File $server -Port 5050
