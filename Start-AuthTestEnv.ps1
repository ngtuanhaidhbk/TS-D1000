[CmdletBinding()]
param(
  [switch]$ShowCommandsOnly
)

$ErrorActionPreference = 'Stop'

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootEnvPath = Join-Path $rootPath '.env'
$rootEnvExamplePath = Join-Path $rootPath '.env.example'
$apiEnvPath = Join-Path $rootPath 'apps\api\.env'
$apiEnvExamplePath = Join-Path $rootPath 'apps\api\.env.example'
$webEnvPath = Join-Path $rootPath 'apps\web\.env'
$webEnvExamplePath = Join-Path $rootPath 'apps\web\.env.example'

function Write-Section {
  param([string]$Title)
  Write-Host ''
  Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Ensure-EnvFile {
  param(
    [string]$TargetPath,
    [string]$ExamplePath
  )

  if (-not (Test-Path -LiteralPath $TargetPath)) {
    Copy-Item -LiteralPath $ExamplePath -Destination $TargetPath
    Write-Host "Created $TargetPath from example." -ForegroundColor Green
    return
  }

  Write-Host "Exists: $TargetPath" -ForegroundColor DarkGreen
}

function Get-ToolStatus {
  param([string]$ToolName)

  $command = Get-Command $ToolName -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    return $false
  }

  return $true
}

Write-Section 'Auth Environment Preparation'
Ensure-EnvFile -TargetPath $rootEnvPath -ExamplePath $rootEnvExamplePath
Ensure-EnvFile -TargetPath $apiEnvPath -ExamplePath $apiEnvExamplePath
Ensure-EnvFile -TargetPath $webEnvPath -ExamplePath $webEnvExamplePath

$hasNode = Get-ToolStatus -ToolName 'node'
$hasPnpm = Get-ToolStatus -ToolName 'pnpm'
$hasDocker = Get-ToolStatus -ToolName 'docker'

Write-Section 'Toolchain Status'
Write-Host ("Node   : " + ($(if ($hasNode) { 'OK' } else { 'Missing' })))
Write-Host ("pnpm   : " + ($(if ($hasPnpm) { 'OK' } else { 'Missing' })))
Write-Host ("Docker : " + ($(if ($hasDocker) { 'OK' } else { 'Missing' })))

Write-Section 'Recommended Commands'
Write-Host 'Local dev:'
Write-Host '  corepack enable'
Write-Host '  pnpm install'
Write-Host '  docker compose -f docker-compose.auth.yml up -d database'
Write-Host '  pnpm --filter api dev'
Write-Host '  pnpm --filter web dev'
Write-Host ''
Write-Host 'Auth unit tests:'
Write-Host '  pnpm --filter api test'
Write-Host '  pnpm --filter web test'
Write-Host ''
Write-Host 'Full auth stack with Docker:'
Write-Host '  docker compose -f docker-compose.auth.yml up --build'
Write-Host ''
Write-Host 'URLs:'
Write-Host '  Frontend: http://localhost:5173'
Write-Host '  Backend : http://localhost:3000/api/v1'
Write-Host '  Health  : http://localhost:3000/api/v1/health'

if (-not $ShowCommandsOnly) {
  Write-Section 'Notes'
  if (-not $hasNode -or -not $hasPnpm) {
    Write-Host 'Node.js 22 and pnpm are required to run the real NestJS/React auth module locally.' -ForegroundColor Yellow
  }

  if (-not $hasDocker) {
    Write-Host 'Docker is optional but recommended for PostgreSQL and the full auth stack.' -ForegroundColor Yellow
  }
}
