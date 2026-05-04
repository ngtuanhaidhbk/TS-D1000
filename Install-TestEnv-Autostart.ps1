Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup "TS-D1000 Test Environment.lnk"

$psExe = Join-Path $env:SystemRoot "System32\\WindowsPowerShell\\v1.0\\powershell.exe"
$startScript = Join-Path $root "Start-TestEnv.ps1"

if (-not (Test-Path -LiteralPath $startScript)) {
  throw "Missing Start-TestEnv.ps1 at $startScript"
}

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $psExe
$shortcut.Arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startScript`""
$shortcut.WorkingDirectory = $root
$shortcut.WindowStyle = 7
$shortcut.Description = "Auto-start TS-D1000 Test Environment server"
$shortcut.Save()

Write-Host "Installed autostart shortcut:"
Write-Host "  $shortcutPath"
Write-Host ""
Write-Host "Starting test environment now..."
& $psExe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$startScript" | Out-Null
Write-Host "Done. Open: http://127.0.0.1:5050/"
