[CmdletBinding()]
param(
  [int]$Port = 5050,
  [switch]$OpenBrowser
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$server = Join-Path $root 'backend\server.ps1'

$existingProcesses = Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*backend\server.ps1* -Port $Port*" }

if ($existingProcesses) {
  Write-Host "Auth demo is already running on port $Port." -ForegroundColor Yellow
} else {
  Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -File `"$server`" -Port $Port"
  Start-Sleep -Seconds 2
}

$healthUrl = "http://localhost:$Port/api/v1/health"
$appUrl = "http://localhost:$Port/"

try {
  $health = Invoke-WebRequest -UseBasicParsing $healthUrl
  if ($health.StatusCode -ne 200) {
    throw "Health check failed"
  }
} catch {
  Write-Host "Failed to start auth demo server on port $Port." -ForegroundColor Red
  Write-Host "Try running .\Start-AuthDemo.ps1 directly to inspect the error." -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "Auth browser test environment is ready." -ForegroundColor Green
Write-Host "Open this URL in your browser:" -ForegroundColor Cyan
Write-Host $appUrl -ForegroundColor White
Write-Host ""
Write-Host "Seed accounts:" -ForegroundColor Cyan
Write-Host "  admin / Admin123!"
Write-Host "  operator / Operator123!"
Write-Host ""
Write-Host "Health:" -ForegroundColor Cyan
Write-Host $healthUrl -ForegroundColor White

if ($OpenBrowser) {
  Start-Process $appUrl
}
