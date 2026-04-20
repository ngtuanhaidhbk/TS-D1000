param(
  [Parameter(Mandatory = $true)]
  [string]$FeatureBranch,
  [string]$BaseBranch = 'main',
  [string]$RepoUrl = 'https://github.com/ngtuanhaidhbk/TS-D1000.git',
  [string]$CommitMessage = 'Update implementation',
  [switch]$ForceWithLease
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

function Get-WebRepoUrl {
  param(
    [string]$RemoteUrl
  )

  if ($RemoteUrl.EndsWith('.git')) {
    return $RemoteUrl.Substring(0, $RemoteUrl.Length - 4)
  }

  return $RemoteUrl
}

$repoRoot = Split-Path -Parent $PSCommandPath
Set-Location $repoRoot

Require-Git
Add-SafeDirectory -DirectoryPath $repoRoot
Set-OriginRemote -RemoteUrl $RepoUrl

$currentBranch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to determine current branch.'
}

$featureExists = (& git branch --list $FeatureBranch).Trim()
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to inspect local branches.'
}

if ($currentBranch -ne $FeatureBranch) {
  if ([string]::IsNullOrWhiteSpace($featureExists)) {
    Invoke-Git checkout -b $FeatureBranch
  } else {
    Invoke-Git checkout $FeatureBranch
  }
}

$status = & git status --porcelain
if ($LASTEXITCODE -ne 0) {
  throw 'Unable to read git status.'
}

if (-not [string]::IsNullOrWhiteSpace($status)) {
  Invoke-Git add .
  Invoke-Git commit -m $CommitMessage
}

Invoke-Git fetch origin
Invoke-Git rebase ("origin/" + $BaseBranch)

if ($ForceWithLease) {
  Invoke-Git push -u origin $FeatureBranch --force-with-lease
} else {
  Invoke-Git push -u origin $FeatureBranch
}

$webRepoUrl = Get-WebRepoUrl -RemoteUrl $RepoUrl
$compareUrl = "$webRepoUrl/compare/$BaseBranch...$FeatureBranch?expand=1"

Write-Host ''
Write-Host "Feature branch pushed successfully."
Write-Host "Feature branch: $FeatureBranch"
Write-Host "Base branch: $BaseBranch"
Write-Host "Open this URL to create the PR:"
Write-Host $compareUrl
