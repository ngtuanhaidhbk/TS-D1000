Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$pidPath = Join-Path $root "data\\test-env.pid"
$runtimeWorkerPath = Join-Path $root "data\\runtime-worker.json"
$runtimeStatePath = Join-Path $root "data\\runtime-room-state.json"

if (-not (Test-Path -LiteralPath $pidPath)) {
  Write-Host "No PID file found: $pidPath"
  exit 0
}

$raw = (Get-Content -LiteralPath $pidPath -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($raw)) {
  Remove-Item -LiteralPath $pidPath -ErrorAction SilentlyContinue
  Write-Host "PID file was empty."
  exit 0
}

$procId = [int]$raw
try {
  Stop-Process -Id $procId -Force -ErrorAction Stop
  Write-Host "Stopped test environment PID $procId"
} catch {
  Write-Host "Process PID $procId is not running (or cannot be stopped)."
} finally {
  Remove-Item -LiteralPath $pidPath -ErrorAction SilentlyContinue
}

if (Test-Path -LiteralPath $runtimeWorkerPath) {
  try {
    $rawWorker = (Get-Content -LiteralPath $runtimeWorkerPath -Raw).Trim()
    if (-not [string]::IsNullOrWhiteSpace($rawWorker)) {
      $info = $rawWorker | ConvertFrom-Json
      $workerPid = [int]$info.pid
      if ($workerPid -gt 0) {
        try {
          Stop-Process -Id $workerPid -Force -ErrorAction Stop
          Write-Host "Stopped runtime worker PID $workerPid"
        } catch {
          Write-Host "Runtime worker PID $workerPid is not running (or cannot be stopped)."
        }
      }
    }
  } catch {
    Write-Host "Unable to parse runtime worker pid file."
  } finally {
    Remove-Item -LiteralPath $runtimeWorkerPath -ErrorAction SilentlyContinue
  }
}

if (Test-Path -LiteralPath $runtimeStatePath) {
  try {
    $stateRaw = (Get-Content -LiteralPath $runtimeStatePath -Raw).Trim()
    if (-not [string]::IsNullOrWhiteSpace($stateRaw)) {
      $state = $stateRaw | ConvertFrom-Json
      $state.sse_status = "DISCONNECTED"
      $state.updated_at = [DateTime]::UtcNow.ToString("o")
      $state | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $runtimeStatePath -Encoding UTF8
    }
  } catch {
    # best effort
  }
}
