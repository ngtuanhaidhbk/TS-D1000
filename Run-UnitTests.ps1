param(
  [ValidateSet("all", "api", "web")]
  [string]$Target = "all"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

function Write-Info([string]$Message) {
  Write-Host $Message
}

function Resolve-NodeExe() {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($null -ne $cmd) { return $cmd.Source }

  $candidates = @(
    "C:\Program Files\nodejs\node.exe",
    (Join-Path $env:LOCALAPPDATA "Programs\nodejs\node.exe")
  )
  foreach ($c in $candidates) {
    if (Test-Path -LiteralPath $c) { return $c }
  }
  return $null
}

function Resolve-PnpmRunner([string]$NodeExe) {
  $pnpmCjs = Join-Path $env:APPDATA "npm\node_modules\pnpm\bin\pnpm.cjs"
  if (Test-Path -LiteralPath $pnpmCjs) {
    return @{ kind = "node"; value = $pnpmCjs; node = $NodeExe }
  }

  $pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($null -ne $pnpmCmd) {
    return @{ kind = "cmd"; value = $pnpmCmd.Source }
  }

  return $null
}

$nodeExe = Resolve-NodeExe
if ($null -eq $nodeExe) {
  throw "Node.js not found. Install Node.js 22+ and ensure it is available, then retry."
}

# Ensure child processes (jest/vitest) can find node even if the current shell PATH is missing it.
$nodeDir = Split-Path -Parent $nodeExe
if ($env:Path -notlike "*$nodeDir*") {
  $env:Path = $nodeDir + ";" + $env:Path
}

function Invoke-Pnpm {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$PnpmArgs
  )
  if ($pnpmRunner.kind -eq "cmd") {
    & $pnpmRunner.value @PnpmArgs | Out-Host
    $code = $LASTEXITCODE
    return $code
  }

  if ($pnpmRunner.kind -eq "node") {
    & $pnpmRunner.node $pnpmRunner.value @PnpmArgs | Out-Host
    $code = $LASTEXITCODE
    return $code
  }

  throw "Unsupported pnpm runner kind."
}

Write-Info "== TS-D1000 Unit Tests =="
Write-Info ("Node: " + $nodeExe)
Write-Info ""

$pnpmRunner = Resolve-PnpmRunner $nodeExe
if ($null -eq $pnpmRunner) {
  throw "pnpm not found. Run .\\Setup-NodePnpm.ps1 first (or install pnpm via corepack) and retry."
}

if ($pnpmRunner.kind -eq "node") {
  Write-Info ("pnpm: " + $pnpmRunner.value)
} else {
  Write-Info ("pnpm: " + $pnpmRunner.value)
}
Write-Info ""

$exit = 0

if ($Target -in @("all", "api")) {
  Write-Info "-- apps/api (jest) --"
  $code = Invoke-Pnpm "--filter" "api" "test"
  if ($code -ne 0) { $exit = $code }
  Write-Info ""
}

if ($Target -in @("all", "web")) {
  Write-Info "-- apps/web (vitest) --"
  $code = Invoke-Pnpm "--filter" "web" "test"
  if ($code -ne 0) { $exit = $code }
  Write-Info ""
}

if ($exit -eq 0) {
  Write-Info "All unit tests passed."
} else {
  Write-Info ("Unit tests failed (exit code {0})." -f $exit)
}

exit $exit
