Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup "TS-D1000 Test Environment.lnk"

$stopScript = Join-Path $root "Stop-TestEnv.ps1"

if (Test-Path -LiteralPath $stopScript) {
  try {
    & $stopScript | Out-Null
  } catch {
    # best effort
  }
}

if (Test-Path -LiteralPath $shortcutPath) {
  Remove-Item -LiteralPath $shortcutPath -Force
  Write-Host "Removed autostart shortcut:"
  Write-Host "  $shortcutPath"
} else {
  Write-Host "Autostart shortcut not found:"
  Write-Host "  $shortcutPath"
}

