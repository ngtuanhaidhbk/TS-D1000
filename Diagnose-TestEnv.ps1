Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$port = 5050

$pidFile = Join-Path $root "data\\test-env.pid"
$stdoutLog = Join-Path $root "data\\test-env.server.log"
$stderrLog = Join-Path $root "data\\test-env.server.err.log"

Write-Host "== TS-D1000 TestEnv Diagnose =="
Write-Host "Port: $port"
Write-Host ""

Write-Host "-- Port listeners (netstat) --"
try {
  $usedFallback = $false
  $netstat = Get-Command netstat.exe -ErrorAction SilentlyContinue
  if ($null -ne $netstat) {
    $lines = netstat -ano | Select-String -Pattern (":$port\s")
    if ($null -eq $lines -or @($lines).Count -eq 0) {
      Write-Host "No listener found on port $port."
    } else {
      @($lines) | ForEach-Object { Write-Host $_.Line }
    }
  } else {
    $usedFallback = $true
  }

  if ($usedFallback) {
    Write-Host "netstat.exe not available. Using Get-NetTCPConnection fallback."
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($null -eq $conns -or @($conns).Count -eq 0) {
      Write-Host "No listener found on port $port."
    } else {
      @($conns) | Sort-Object -Property State, OwningProcess | ForEach-Object {
        Write-Host ("{0} {1} -> {2} PID={3}" -f $_.State, $_.LocalAddress, $_.LocalPort, $_.OwningProcess)
      }
    }
  }
} catch {
  Write-Host ("Unable to check port listeners: " + $_.Exception.Message)
}
Write-Host ""

Write-Host "-- PID file --"
if (Test-Path -LiteralPath $pidFile) {
  $raw = (Get-Content -LiteralPath $pidFile -Raw).Trim()
  Write-Host "PID file: $pidFile"
  Write-Host "PID: $raw"
  if (-not [string]::IsNullOrWhiteSpace($raw)) {
    try {
      $p = Get-Process -Id ([int]$raw) -ErrorAction Stop
      Write-Host "Process is running: $($p.ProcessName) (Id=$($p.Id))"
    } catch {
      Write-Host "Process is NOT running (or cannot access PID)."
    }
  }
} else {
  Write-Host "No PID file found: $pidFile"
}
Write-Host ""

Write-Host "-- HTTP probe --"
foreach ($url in @("http://127.0.0.1:$port/", "http://localhost:$port/")) {
  try {
    $code = (Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 $url).StatusCode
    Write-Host "$url => HTTP $code"
  } catch {
    Write-Host "$url => FAILED ($($_.Exception.Message))"
  }
}
Write-Host ""

function Tail-Log([string]$Path, [string]$Title) {
  Write-Host "-- $Title --"
  if (Test-Path -LiteralPath $Path) {
    $tail = Get-Content -LiteralPath $Path -Tail 50 -ErrorAction SilentlyContinue
    $tailLines = @()
    if ($null -eq $tail) {
      $tailLines = @()
    } elseif ($tail -is [System.Array]) {
      $tailLines = @($tail)
    } else {
      $tailLines = @([string]$tail)
    }

    if ($tailLines.Count -eq 0) {
      Write-Host "(empty)"
    } else {
      $tailLines | ForEach-Object { Write-Host $_ }
    }
  } else {
    Write-Host "Missing: $Path"
  }
  Write-Host ""
}

Tail-Log $stdoutLog "Server stdout (tail)"
Tail-Log $stderrLog "Server stderr (tail)"

Write-Host "Next steps:"
Write-Host "  1) Run Start-TestEnv-Visible.cmd and keep the server window open."
Write-Host "  2) If you see 'Access is denied', run Setup-UrlAcl-5050.cmd as Administrator."
Write-Host "  3) If port is in use, stop the PID shown by netstat or run Stop-TestEnv.ps1."
