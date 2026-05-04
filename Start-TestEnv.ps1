param(
  [int]$Port = 5050
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$pidPath = Join-Path $root "data\\test-env.pid"
$logPath = Join-Path $root "data\\test-env.server.log"
$errPath = Join-Path $root "data\\test-env.server.err.log"

function Quote-Arg([string]$Value) {
  if ($null -eq $Value) { return '""' }
  # For Start-Process, ArgumentList is flattened to a single command line without auto-quoting.
  if ($Value -match '[\s"]') {
    return '"' + ($Value -replace '"', '\"') + '"'
  }
  return $Value
}

function Test-HealthReady([int]$port) {
  # Prefer IPv4 loopback to avoid machines where localhost resolves to ::1 but listener isn't bound.
  $healthUrl = "http://127.0.0.1:$port/api/v1/health"
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 $healthUrl
    return $resp.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Wait-ForHealth([int]$port) {
  # Prefer IPv4 loopback to avoid machines where localhost resolves to ::1 but listener isn't bound.
  $healthUrl = "http://127.0.0.1:$port/api/v1/health"
  $deadline = (Get-Date).AddSeconds(8)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 $healthUrl
      if ($resp.StatusCode -eq 200) { return }
    } catch {}
    Start-Sleep -Milliseconds 300
  }
  throw "Health check did not become ready: $healthUrl"
}

if (-not (Test-Path -LiteralPath (Join-Path $root "data"))) {
  New-Item -ItemType Directory -Path (Join-Path $root "data") | Out-Null
}

$url = "http://127.0.0.1:$Port/"

# If a previous TestEnv is already running, do not attempt to recreate/overwrite log files (they will be locked).
if (Test-Path -LiteralPath $pidPath) {
  $rawExisting = (Get-Content -LiteralPath $pidPath -Raw -ErrorAction SilentlyContinue).Trim()
  if (-not [string]::IsNullOrWhiteSpace($rawExisting)) {
    try {
      $existingProc = Get-Process -Id ([int]$rawExisting) -ErrorAction Stop
      if ($null -ne $existingProc -and -not $existingProc.HasExited) {
        if (Test-HealthReady $Port) {
          try { Start-Process $url | Out-Null } catch {}
          Write-Host "Test environment is already running:"
          Write-Host "  URL: $url"
          Write-Host "  PID: $($existingProc.Id)"
          Write-Host "  Log: $logPath"
          Write-Host "  Err: $errPath"
          exit 0
        }

        # Process exists but health is not ready; restart it.
        try { Stop-Process -Id $existingProc.Id -Force -ErrorAction SilentlyContinue } catch {}
        Start-Sleep -Milliseconds 300
      }
    } catch {
      # Stale PID file; fall through and start fresh.
    }
  }

  Remove-Item -LiteralPath $pidPath -ErrorAction SilentlyContinue
}

$serverScript = Join-Path $root "backend\\server.ps1"
if (-not (Test-Path -LiteralPath $serverScript)) {
  throw "Missing backend script: $serverScript"
}

$null = New-Item -ItemType File -Path $logPath -Force
$null = New-Item -ItemType File -Path $errPath -Force

$resolvedLog = (Resolve-Path -LiteralPath $logPath).Path
$resolvedErr = (Resolve-Path -LiteralPath $errPath).Path
if ($resolvedLog -ieq $resolvedErr) {
  # Guard against accidental same-path redirects which make Start-Process throw.
  $resolvedErr = (Join-Path $root ("data\\test-env.server.err.{0}.log" -f ([DateTime]::UtcNow.ToString("yyyyMMddHHmmss"))))
  $null = New-Item -ItemType File -Path $resolvedErr -Force
}

$proc = Start-Process `
  -FilePath "$env:WINDIR\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -PassThru `
  -RedirectStandardOutput $resolvedLog `
  -RedirectStandardError $resolvedErr `
  -ArgumentList @(
    "-NoLogo",
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", (Quote-Arg $serverScript),
    "-Port", $Port
  )

Set-Content -LiteralPath $pidPath -Value $proc.Id -Encoding ASCII

Start-Sleep -Milliseconds 250
if ($proc.HasExited) {
  $tail = @()
  try { $tail = @(Get-Content -LiteralPath $resolvedErr -Tail 60 -ErrorAction SilentlyContinue) } catch {}
  $hint = @(
    "Server process exited immediately (exit code $($proc.ExitCode)).",
    "Stdout: $resolvedLog",
    "Stderr: $resolvedErr"
  )
  if ($tail.Count -gt 0) {
    $hint += ""
    $hint += "Stderr tail:"
    $hint += $tail
  }
  throw ($hint -join "`r`n")
}

try {
  Wait-ForHealth $Port
} catch {
  try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
  throw ("Server did not become ready. Check logs: " + $resolvedLog + " and " + $resolvedErr)
}

Start-Process $url | Out-Null

Write-Host "Test environment is running:"
Write-Host "  URL: $url"
Write-Host "  PID: $($proc.Id)"
Write-Host "  Log: $resolvedLog"
Write-Host "  Err: $resolvedErr"
Write-Host ""
Write-Host "To stop it:"
Write-Host "  powershell -ExecutionPolicy Bypass -File `"$root\\Stop-TestEnv.ps1`""
