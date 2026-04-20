[CmdletBinding()]
param(
  [int]$Port = 5050
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$processes = Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like "*backend\server.ps1* -Port $Port*" }

if (-not $processes) {
  Write-Host "No auth demo server found on port $Port." -ForegroundColor Yellow
  exit 0
}

$processes | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force
}

Write-Host "Stopped auth demo server on port $Port." -ForegroundColor Green
