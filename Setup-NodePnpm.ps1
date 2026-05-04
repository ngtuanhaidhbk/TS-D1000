param(
  [string]$PnpmVersion = "9.15.0"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host $Message
}

function Command-Exists([string]$Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Info "== TS-D1000 Dev Env Setup (Node + pnpm) =="

if (-not (Command-Exists "node")) {
  Write-Info "Node.js not found. Attempting to install via winget..."

  if (-not (Command-Exists "winget")) {
    Write-Info "ERROR: winget is not available on this machine."
    Write-Info "Install Node.js 22+ manually, then re-run this script."
    exit 1
  }

  # Installs the latest stable Node.js (should satisfy engines.node >= 22).
  # Note: winget may prompt for agreement or require interactive confirmation.
  winget install -e --id OpenJS.NodeJS --accept-source-agreements --accept-package-agreements

  if (-not (Command-Exists "node")) {
    Write-Info "ERROR: Node.js still not found after winget install. Open a new terminal and retry."
    exit 1
  }
}

Write-Info ("Node: " + (& node --version))

# pnpm is managed via corepack (bundled with Node 16.10+).
if (-not (Command-Exists "corepack")) {
  Write-Info "ERROR: corepack not found. Your Node.js build may not include corepack."
  Write-Info "Reinstall Node.js 22+ from the official installer, or install pnpm manually."
  exit 1
}

Write-Info "Enabling corepack..."
corepack enable | Out-Null

Write-Info "Activating pnpm via corepack..."
corepack prepare ("pnpm@" + $PnpmVersion) --activate | Out-Null

Write-Info ("pnpm: " + (& pnpm --version))

Write-Info ""
Write-Info "Next:"
Write-Info "  1) pnpm -v"
Write-Info "  2) pnpm -r install"
Write-Info "  3) pnpm --filter api test"
Write-Info "  4) pnpm --filter web test"

