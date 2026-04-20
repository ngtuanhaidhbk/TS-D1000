param(
  [string]$RepoUrl = 'https://github.com/ngtuanhaidhbk/TS-D1000.git',
  [string]$BaseBranch = 'main',
  [string]$CommitMessage = 'Initial commit'
)

$ErrorActionPreference = 'Stop'

function Require-Git {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is not installed or not available in PATH.'
  }
}

function Invoke-Git {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($Arguments -join ' ')"
  }
}

function Add-SafeDirectory {
  param(
    [string]$DirectoryPath
  )

  $safeDirectories = @(& git config --global --get-all safe.directory 2>$null)
  if ($LASTEXITCODE -ne 0) {
    $safeDirectories = @()
  }

  if ($safeDirectories -notcontains $DirectoryPath) {
    Invoke-Git config --global --add safe.directory $DirectoryPath
  }
}

function Set-OriginRemote {
  param(
    [string]$RemoteUrl
  )

  $currentRemote = ''
  try {
    $currentRemote = (& git remote get-url origin).Trim()
  } catch {
    $currentRemote = ''
  }

  if ([string]::IsNullOrWhiteSpace($currentRemote)) {
    git remote add origin $RemoteUrl
    return
  }

  if ($currentRemote -ne $RemoteUrl) {
    git remote set-url origin $RemoteUrl
  }
}

$repoRoot = Split-Path -Parent $PSCommandPath
Set-Location $repoRoot

Require-Git
Add-SafeDirectory -DirectoryPath $repoRoot

if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
  Invoke-Git init
}

Set-OriginRemote -RemoteUrl $RepoUrl

$status = & git status --porcelain
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to read git status.'
}

if (-not [string]::IsNullOrWhiteSpace($status)) {
  Invoke-Git add .
  Invoke-Git commit -m $CommitMessage
}

Invoke-Git branch -M $BaseBranch
Invoke-Git push -u origin $BaseBranch

Write-Host ''
Write-Host "Initial push completed."
Write-Host "Remote: $RepoUrl"
Write-Host "Base branch: $BaseBranch"
