param(
  [int]$Port = 5050
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Script:Root = Split-Path -Parent $PSScriptRoot
$Script:DataDir = Join-Path $Script:Root "data"
$Script:FrontendDir = Join-Path $Script:Root "frontend"
$Script:UsersPath = Join-Path $Script:DataDir "users.json"
$Script:SessionsPath = Join-Path $Script:DataDir "auth-sessions.json"
$Script:AuditLogsPath = Join-Path $Script:DataDir "audit-logs.json"
$Script:JwtSecretPath = Join-Path $Script:DataDir "jwt-secret.txt"
$Script:TokenTtlMinutes = 480

function Ensure-Directory([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function Read-JsonArray([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return @()
  }

  $raw = Get-Content -LiteralPath $Path -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return @()
  }

  $parsed = $raw | ConvertFrom-Json
  if ($parsed -is [System.Array]) {
    return @($parsed)
  }

  return @($parsed)
}

function Write-JsonArray([string]$Path, [object[]]$Items) {
  $Items | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Get-NowUtcString {
  return [DateTime]::UtcNow.ToString("o")
}

function To-UnixTime([datetime]$Date) {
  return [int64]([DateTimeOffset]::new($Date)).ToUnixTimeSeconds()
}

function New-RandomBase64Url([int]$ByteCount = 32) {
  $bytes = New-Object byte[] $ByteCount
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  }
  finally {
    $rng.Dispose()
  }
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function Get-JwtSecret {
  if (-not (Test-Path -LiteralPath $Script:JwtSecretPath)) {
    New-RandomBase64Url 48 | Set-Content -LiteralPath $Script:JwtSecretPath -Encoding ASCII
  }

  return (Get-Content -LiteralPath $Script:JwtSecretPath -Raw).Trim()
}

function Test-FixedTimeEquals([byte[]]$Left, [byte[]]$Right) {
  if ($null -eq $Left -or $null -eq $Right) {
    return $false
  }
  if ($Left.Length -ne $Right.Length) {
    return $false
  }

  $diff = 0
  for ($i = 0; $i -lt $Left.Length; $i++) {
    $diff = $diff -bor ($Left[$i] -bxor $Right[$i])
  }

  return $diff -eq 0
}

function New-PasswordHash([string]$Password) {
  $iterations = 100000
  $saltBytes = New-Object byte[] 16
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($saltBytes)
  }
  finally {
    $rng.Dispose()
  }
  $pbkdf2 = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
    $Password,
    $saltBytes,
    $iterations,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256
  )
  $hashBytes = $pbkdf2.GetBytes(32)
  $salt = [Convert]::ToBase64String($saltBytes)
  $hash = [Convert]::ToBase64String($hashBytes)
  return "pbkdf2-sha256`$$iterations`$$salt`$$hash"
}

function Test-Password([string]$Password, [string]$StoredHash) {
  $parts = $StoredHash.Split('$')
  if ($parts.Length -ne 4) {
    return $false
  }

  $iterations = [int]$parts[1]
  $saltBytes = [Convert]::FromBase64String($parts[2])
  $expectedBytes = [Convert]::FromBase64String($parts[3])

  $pbkdf2 = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
    $Password,
    $saltBytes,
    $iterations,
    [System.Security.Cryptography.HashAlgorithmName]::SHA256
  )
  $actualBytes = $pbkdf2.GetBytes($expectedBytes.Length)
  return Test-FixedTimeEquals $actualBytes $expectedBytes
}

function ConvertTo-Base64UrlJson([object]$Data) {
  $json = $Data | ConvertTo-Json -Compress -Depth 10
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

function Get-Base64UrlBytes([string]$Value) {
  $padded = $Value.Replace("-", "+").Replace("_", "/")
  switch ($padded.Length % 4) {
    2 { $padded += "==" }
    3 { $padded += "=" }
  }
  return [Convert]::FromBase64String($padded)
}

function New-JwtToken([hashtable]$Payload) {
  $headerSegment = ConvertTo-Base64UrlJson @{ alg = "HS256"; typ = "JWT" }
  $payloadSegment = ConvertTo-Base64UrlJson $Payload
  $unsigned = "$headerSegment.$payloadSegment"
  $secretBytes = [System.Text.Encoding]::UTF8.GetBytes((Get-JwtSecret))
  $unsignedBytes = [System.Text.Encoding]::UTF8.GetBytes($unsigned)
  $hmac = [System.Security.Cryptography.HMACSHA256]::new($secretBytes)
  $signatureBytes = $hmac.ComputeHash($unsignedBytes)
  $signatureSegment = [Convert]::ToBase64String($signatureBytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
  return "$unsigned.$signatureSegment"
}

function Read-JwtToken([string]$Token) {
  $parts = $Token.Split('.')
  if ($parts.Length -ne 3) {
    throw "Malformed token"
  }

  $unsigned = "$($parts[0]).$($parts[1])"
  $secretBytes = [System.Text.Encoding]::UTF8.GetBytes((Get-JwtSecret))
  $unsignedBytes = [System.Text.Encoding]::UTF8.GetBytes($unsigned)
  $hmac = [System.Security.Cryptography.HMACSHA256]::new($secretBytes)
  $expectedSignature = $hmac.ComputeHash($unsignedBytes)
  $actualSignature = Get-Base64UrlBytes $parts[2]
  if (-not (Test-FixedTimeEquals $expectedSignature $actualSignature)) {
    throw "Invalid signature"
  }

  $payloadJson = [System.Text.Encoding]::UTF8.GetString((Get-Base64UrlBytes $parts[1]))
  return $payloadJson | ConvertFrom-Json
}

function Add-AuditLog($ActorUserId, [string]$Action, [string]$TargetType, [string]$TargetId, [string]$Result, [hashtable]$Detail) {
  $logs = New-Object System.Collections.ArrayList
  foreach ($existing in (Read-JsonArray $Script:AuditLogsPath)) {
    [void]$logs.Add($existing)
  }
  $entry = [ordered]@{
    id = [guid]::NewGuid().Guid
    actor_user_id = if ($null -ne $ActorUserId -and -not [string]::IsNullOrWhiteSpace([string]$ActorUserId)) { [string]$ActorUserId } else { $null }
    action = $Action
    target_type = $TargetType
    target_id = $TargetId
    result = $Result
    detail_json = $Detail
    created_at = Get-NowUtcString
  }
  [void]$logs.Add([pscustomobject]$entry)
  Write-JsonArray $Script:AuditLogsPath @($logs)
}

function Initialize-Data {
  Ensure-Directory $Script:DataDir

  if (-not (Test-Path -LiteralPath $Script:UsersPath)) {
    $timestamp = Get-NowUtcString
    $admin = [pscustomobject][ordered]@{
      id = [guid]::NewGuid().Guid
      username = "admin"
      password_hash = New-PasswordHash "Admin123!"
      role = "ADMIN"
      status = "ACTIVE"
      created_at = $timestamp
      updated_at = $timestamp
      created_by = $null
      updated_by = $null
    }
    $operator = [pscustomobject][ordered]@{
      id = [guid]::NewGuid().Guid
      username = "operator"
      password_hash = New-PasswordHash "Operator123!"
      role = "OPERATOR"
      status = "ACTIVE"
      created_at = $timestamp
      updated_at = $timestamp
      created_by = $admin.id
      updated_by = $admin.id
    }
    Write-JsonArray $Script:UsersPath @($admin, $operator)
  }

  if (-not (Test-Path -LiteralPath $Script:SessionsPath)) {
    Write-JsonArray $Script:SessionsPath @()
  }

  if (-not (Test-Path -LiteralPath $Script:AuditLogsPath)) {
    Write-JsonArray $Script:AuditLogsPath @()
  }

  [void](Get-JwtSecret)
}

function Get-UserByUsername([string]$Username) {
  $normalized = $Username.Trim().ToLowerInvariant()
  return (Read-JsonArray $Script:UsersPath | Where-Object { $_.username.ToLowerInvariant() -eq $normalized } | Select-Object -First 1)
}

function Get-UserById([string]$UserId) {
  return (Read-JsonArray $Script:UsersPath | Where-Object { $_.id -eq $UserId } | Select-Object -First 1)
}

function Get-SessionById([string]$SessionId) {
  return (Read-JsonArray $Script:SessionsPath | Where-Object { $_.id -eq $SessionId } | Select-Object -First 1)
}

function Save-Session([psobject]$Session) {
  $sessions = New-Object System.Collections.ArrayList
  foreach ($existing in (Read-JsonArray $Script:SessionsPath)) {
    [void]$sessions.Add($existing)
  }
  $index = -1
  for ($i = 0; $i -lt $sessions.Count; $i++) {
    if ($sessions[$i].id -eq $Session.id) {
      $index = $i
      break
    }
  }

  if ($index -ge 0) {
    $sessions[$index] = $Session
  }
  else {
    [void]$sessions.Add($Session)
  }

  Write-JsonArray $Script:SessionsPath @($sessions)
}

function Send-Json([System.Net.HttpListenerResponse]$Response, [int]$StatusCode, [hashtable]$Body) {
  $json = $Body | ConvertTo-Json -Depth 10
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $Response.StatusCode = $StatusCode
  $Response.ContentType = "application/json; charset=utf-8"
  $Response.ContentEncoding = [System.Text.Encoding]::UTF8
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

function Send-File([System.Net.HttpListenerResponse]$Response, [string]$Path) {
  $extension = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  $contentType = switch ($extension) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    default { "application/octet-stream" }
  }
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $Response.StatusCode = 200
  $Response.ContentType = $contentType
  $Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $Response.OutputStream.Close()
}

function Read-RequestBody([System.Net.HttpListenerRequest]$Request) {
  $reader = [System.IO.StreamReader]::new($Request.InputStream, $Request.ContentEncoding)
  try {
    return $reader.ReadToEnd()
  }
  finally {
    $reader.Dispose()
  }
}

function Get-BearerToken([System.Net.HttpListenerRequest]$Request) {
  $header = $Request.Headers["Authorization"]
  if ([string]::IsNullOrWhiteSpace($header) -or -not $header.StartsWith("Bearer ")) {
    return $null
  }
  return $header.Substring(7).Trim()
}

function Send-Error([System.Net.HttpListenerResponse]$Response, [int]$StatusCode, [string]$Code, [string]$Message) {
  Send-Json $Response $StatusCode @{
    success = $false
    error = @{
      code = $Code
      message = $Message
      details = @()
    }
  }
}

function Validate-AuthContext([System.Net.HttpListenerRequest]$Request) {
  $token = Get-BearerToken $Request
  if ([string]::IsNullOrWhiteSpace($token)) {
    throw [System.UnauthorizedAccessException]::new("UNAUTHORIZED")
  }

  try {
    $payload = Read-JwtToken $token
  }
  catch {
    throw [System.UnauthorizedAccessException]::new("UNAUTHORIZED")
  }

  $exp = [int64]$payload.exp
  $now = To-UnixTime ([DateTime]::UtcNow)
  if ($exp -le $now) {
    throw [System.UnauthorizedAccessException]::new("SESSION_EXPIRED")
  }

  $session = Get-SessionById $payload.sid
  if ($null -eq $session) {
    throw [System.UnauthorizedAccessException]::new("UNAUTHORIZED")
  }
  if ($session.status -eq "REVOKED") {
    throw [System.UnauthorizedAccessException]::new("SESSION_REVOKED")
  }
  if ($session.status -eq "EXPIRED" -or ([DateTime]$session.expires_at) -le [DateTime]::UtcNow) {
    if ($session.status -ne "EXPIRED") {
      $session.status = "EXPIRED"
      $session.updated_at = Get-NowUtcString
      Save-Session $session
    }
    throw [System.UnauthorizedAccessException]::new("SESSION_EXPIRED")
  }
  if ($session.token_jti -ne $payload.jti) {
    throw [System.UnauthorizedAccessException]::new("UNAUTHORIZED")
  }

  $user = Get-UserById $payload.sub
  if ($null -eq $user) {
    throw [System.UnauthorizedAccessException]::new("UNAUTHORIZED")
  }
  if ($user.status -ne "ACTIVE") {
    throw [System.Security.SecurityException]::new("USER_INACTIVE")
  }

  $session.last_seen_at = Get-NowUtcString
  $session.updated_at = Get-NowUtcString
  Save-Session $session

  return @{
    user = $user
    session = $session
    token = $token
  }
}

function Handle-Login([System.Net.HttpListenerContext]$Context) {
  $bodyText = Read-RequestBody $Context.Request
  if ([string]::IsNullOrWhiteSpace($bodyText)) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "username and password are required"
    return
  }

  $body = $bodyText | ConvertFrom-Json
  $username = if ($null -ne $body.username) { [string]$body.username } else { "" }
  $password = if ($null -ne $body.password) { [string]$body.password } else { "" }
  if ([string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrWhiteSpace($password)) {
    $details = @()
    if ([string]::IsNullOrWhiteSpace($username)) {
      $details += @{ field = "username"; message = "must not be empty" }
    }
    if ([string]::IsNullOrWhiteSpace($password)) {
      $details += @{ field = "password"; message = "must not be empty" }
    }

    Send-Json $Context.Response 400 @{
      success = $false
      error = @{
        code = "VALIDATION_ERROR"
        message = "username and password are required"
        details = $details
      }
    }
    return
  }

  $user = Get-UserByUsername $username
  if ($null -eq $user) {
    Add-AuditLog $null "LOGIN" "USER" $null "FAILED" @{ username = $username.Trim(); reason = "INVALID_CREDENTIALS" }
    Send-Error $Context.Response 401 "INVALID_CREDENTIALS" "Invalid username or password"
    return
  }

  if ($user.status -ne "ACTIVE") {
    Add-AuditLog ([guid]$user.id) "LOGIN" "USER" $user.id "FAILED" @{ username = $user.username; reason = "USER_INACTIVE" }
    Send-Error $Context.Response 403 "USER_INACTIVE" "User account is inactive"
    return
  }

  if (-not (Test-Password $password $user.password_hash)) {
    Add-AuditLog ([guid]$user.id) "LOGIN" "USER" $user.id "FAILED" @{ username = $user.username; reason = "INVALID_CREDENTIALS" }
    Send-Error $Context.Response 401 "INVALID_CREDENTIALS" "Invalid username or password"
    return
  }

  $now = [DateTime]::UtcNow
  $session = [pscustomobject][ordered]@{
    id = [guid]::NewGuid().Guid
    user_id = $user.id
    token_jti = [guid]::NewGuid().Guid
    status = "ACTIVE"
    issued_at = $now.ToString("o")
    expires_at = $now.AddMinutes($Script:TokenTtlMinutes).ToString("o")
    revoked_at = $null
    revoked_reason = $null
    last_seen_at = $now.ToString("o")
    client_type = "DESKTOP_APP"
    created_at = $now.ToString("o")
    updated_at = $now.ToString("o")
  }
  Save-Session $session

  $payload = @{
    sub = $user.id
    sid = $session.id
    jti = $session.token_jti
    role = $user.role
    exp = To-UnixTime ($now.AddMinutes($Script:TokenTtlMinutes))
  }
  $token = New-JwtToken $payload

  Add-AuditLog ([guid]$user.id) "LOGIN" "AUTH_SESSION" $session.id "SUCCESS" @{ username = $user.username }

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      token = $token
      expiresAt = $session.expires_at
      user = @{
        id = $user.id
        username = $user.username
        role = $user.role
        status = $user.status
      }
    }
  }
}

function Handle-Logout([System.Net.HttpListenerContext]$Context) {
  try {
    $auth = Validate-AuthContext $Context.Request
  }
  catch [System.Security.SecurityException] {
    Send-Error $Context.Response 403 $_.Exception.Message "User account is inactive"
    return
  }
  catch [System.UnauthorizedAccessException] {
    $code = $_.Exception.Message
    $message = switch ($code) {
      "SESSION_EXPIRED" { "Session expired" }
      "SESSION_REVOKED" { "Session revoked" }
      default { "Unauthorized" }
    }
    Send-Error $Context.Response 401 $code $message
    return
  }

  $session = $auth.session
  $session.status = "REVOKED"
  $session.revoked_at = Get-NowUtcString
  $session.revoked_reason = "USER_LOGOUT"
  $session.updated_at = Get-NowUtcString
  Save-Session $session

  Add-AuditLog ([guid]$auth.user.id) "LOGOUT" "AUTH_SESSION" $session.id "SUCCESS" @{ reason = "USER_LOGOUT" }

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      message = "Logged out"
    }
  }
}

function Handle-AuthMe([System.Net.HttpListenerContext]$Context) {
  try {
    $auth = Validate-AuthContext $Context.Request
  }
  catch [System.Security.SecurityException] {
    Send-Error $Context.Response 403 $_.Exception.Message "User account is inactive"
    return
  }
  catch [System.UnauthorizedAccessException] {
    $code = $_.Exception.Message
    $message = switch ($code) {
      "SESSION_EXPIRED" { "Session expired" }
      "SESSION_REVOKED" { "Session revoked" }
      default { "Unauthorized" }
    }
    Send-Error $Context.Response 401 $code $message
    return
  }

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      user = @{
        id = $auth.user.id
        username = $auth.user.username
        role = $auth.user.role
        status = $auth.user.status
      }
      session = @{
        id = $auth.session.id
        expiresAt = $auth.session.expires_at
      }
    }
  }
}

function Handle-Health([System.Net.HttpListenerContext]$Context) {
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      status = "ok"
      time = Get-NowUtcString
    }
  }
}

function Handle-Static([System.Net.HttpListenerContext]$Context) {
  $relativePath = $Context.Request.Url.AbsolutePath.TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($relativePath)) {
    $relativePath = "index.html"
  }

  $safePath = $relativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
  $fullPath = Join-Path $Script:FrontendDir $safePath
  if ((Test-Path -LiteralPath $fullPath) -and -not (Get-Item -LiteralPath $fullPath).PSIsContainer) {
    Send-File $Context.Response $fullPath
    return
  }

  $fallback = Join-Path $Script:FrontendDir "index.html"
  if (Test-Path -LiteralPath $fallback) {
    Send-File $Context.Response $fallback
    return
  }

  Send-Error $Context.Response 404 "NOT_FOUND" "Resource not found"
}

Initialize-Data

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

Write-Host "Auth server is running at http://localhost:$Port/"
Write-Host "Seed users:"
Write-Host "  admin / Admin123!"
Write-Host "  operator / Operator123!"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.AbsolutePath
    $method = $context.Request.HttpMethod.ToUpperInvariant()

    try {
      switch ("$method $path") {
        "POST /api/v1/auth/login" { Handle-Login $context; continue }
        "POST /api/v1/auth/logout" { Handle-Logout $context; continue }
        "GET /api/v1/auth/me" { Handle-AuthMe $context; continue }
        "GET /api/v1/health" { Handle-Health $context; continue }
        default { Handle-Static $context; continue }
      }
    }
    catch {
      Send-Error $context.Response 500 "INTERNAL_ERROR" "Unexpected server error"
    }
  }
}
finally {
  $listener.Stop()
  $listener.Close()
}
