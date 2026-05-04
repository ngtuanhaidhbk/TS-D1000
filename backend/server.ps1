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
$Script:RoomPath = Join-Path $Script:DataDir "room.json"
$Script:TsdConfigPath = Join-Path $Script:DataDir "tsd-config.json"
$Script:TsdUnitsPath = Join-Path $Script:DataDir "tsd-units.json"
$Script:CamerasPath = Join-Path $Script:DataDir "cameras.json"
$Script:PresetsPath = Join-Path $Script:DataDir "camera-presets.json"
$Script:LayoutPath = Join-Path $Script:DataDir "layout.json"
$Script:LayoutDevicesPath = Join-Path $Script:DataDir "layout-devices.json"
$Script:LayoutAnnotationsPath = Join-Path $Script:DataDir "layout-annotations.json"
$Script:MappingsPath = Join-Path $Script:DataDir "mic-camera-mappings.json"
$Script:RuntimeRoomStatePath = Join-Path $Script:DataDir "runtime-room-state.json"
$Script:RuntimeUnitsStatePath = Join-Path $Script:DataDir "runtime-units-state.json"
$Script:SpeakingRequestsPath = Join-Path $Script:DataDir "speaking-requests.json"
$Script:RuntimeEventsPath = Join-Path $Script:DataDir "runtime-events.json"
$Script:RuntimeCameraLogsPath = Join-Path $Script:DataDir "runtime-camera-logs.json"
$Script:RuntimeWorkerPidPath = Join-Path $Script:DataDir "runtime-worker.json"
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
  $Items | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Read-JsonObject([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  $raw = Get-Content -LiteralPath $Path -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) {
    return $null
  }

  return $raw | ConvertFrom-Json
}

function Write-JsonObject([string]$Path, $Item) {
  if ($null -eq $Item) {
    Remove-Item -LiteralPath $Path -ErrorAction SilentlyContinue
    return
  }

  $Item | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $Path -Encoding UTF8
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
  $json = $Data | ConvertTo-Json -Compress -Depth 12
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

function New-Id {
  return [guid]::NewGuid().Guid
}

function Add-AuditLog($ActorUserId, [string]$Action, [string]$TargetType, [string]$TargetId, [string]$Result, [hashtable]$Detail) {
  $logs = New-Object System.Collections.ArrayList
  foreach ($existing in (Read-JsonArray $Script:AuditLogsPath)) {
    [void]$logs.Add($existing)
  }
  $entry = [ordered]@{
    id = New-Id
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
      id = New-Id
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
      id = New-Id
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

  if (-not (Test-Path -LiteralPath $Script:RoomPath)) {
    Write-JsonObject $Script:RoomPath ([pscustomobject][ordered]@{
      id = "room-001"
      name = "Meeting Room A"
      operation_mode = "MANUAL"
      created_at = Get-NowUtcString
      updated_at = Get-NowUtcString
    })
  }

  foreach ($path in @(
      $Script:TsdUnitsPath,
      $Script:CamerasPath,
      $Script:PresetsPath,
      $Script:LayoutDevicesPath,
      $Script:LayoutAnnotationsPath,
      $Script:MappingsPath,
      $Script:RuntimeUnitsStatePath,
      $Script:SpeakingRequestsPath,
      $Script:RuntimeEventsPath,
      $Script:RuntimeCameraLogsPath
    )) {
    if (-not (Test-Path -LiteralPath $path)) {
      Write-JsonArray $path @()
    }
  }

  if (-not (Test-Path -LiteralPath $Script:TsdConfigPath)) {
    Write-JsonObject $Script:TsdConfigPath $null
  }

  if (-not (Test-Path -LiteralPath $Script:LayoutPath)) {
    Write-JsonObject $Script:LayoutPath $null
  }

  if (-not (Test-Path -LiteralPath $Script:RuntimeRoomStatePath)) {
    $room = Read-JsonObject $Script:RoomPath
    $now = Get-NowUtcString
    Write-JsonObject $Script:RuntimeRoomStatePath ([pscustomobject][ordered]@{
      room_id = if ($null -ne $room) { $room.id } else { "room-001" }
      operation_mode = if ($null -ne $room) { $room.operation_mode } else { "MANUAL" }
      active_speakers = @()
      pending_requests = @()
      current_camera_target = $null
      sse_status = "DISCONNECTED"
      updated_at = $now
    })
  }

  if (-not (Test-Path -LiteralPath $Script:RuntimeWorkerPidPath)) {
    Write-JsonObject $Script:RuntimeWorkerPidPath $null
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
  $json = $Body | ConvertTo-Json -Depth 12
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

function Read-RequestBytes([System.Net.HttpListenerRequest]$Request) {
  $buffer = New-Object byte[] 8192
  $memory = [System.IO.MemoryStream]::new()
  try {
    while (($read = $Request.InputStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
      $memory.Write($buffer, 0, $read)
    }
    return $memory.ToArray()
  }
  finally {
    $memory.Dispose()
  }
}

function Get-BearerToken([System.Net.HttpListenerRequest]$Request) {
  $header = $Request.Headers["Authorization"]
  if ([string]::IsNullOrWhiteSpace($header) -or -not $header.StartsWith("Bearer ")) {
    return $null
  }
  return $header.Substring(7).Trim()
}

function Send-Error([System.Net.HttpListenerResponse]$Response, [int]$StatusCode, [string]$Code, [string]$Message, [object[]]$Details = @()) {
  Send-Json $Response $StatusCode @{
    success = $false
    error = @{
      code = $Code
      message = $Message
      details = $Details
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

function Get-AuthOrSend([System.Net.HttpListenerContext]$Context) {
  try {
    return Validate-AuthContext $Context.Request
  }
  catch [System.Security.SecurityException] {
    Send-Error $Context.Response 403 $_.Exception.Message "User account is inactive"
    return $null
  }
  catch [System.UnauthorizedAccessException] {
    $code = $_.Exception.Message
    $message = switch ($code) {
      "SESSION_EXPIRED" { "Session expired" }
      "SESSION_REVOKED" { "Session revoked" }
      default { "Unauthorized" }
    }
    Send-Error $Context.Response 401 $code $message
    return $null
  }
}

function Require-AdminOrSend([System.Net.HttpListenerContext]$Context, $Auth) {
  if ($null -eq $Auth) {
    return $false
  }
  if ($Auth.user.role -ne "ADMIN") {
    Send-Error $Context.Response 403 "FORBIDDEN" "You do not have permission to access this resource"
    return $false
  }
  return $true
}

function Get-Room {
  $room = Read-JsonObject $Script:RoomPath
  if ($null -eq $room) {
    throw "Room data missing"
  }
  return $room
}

function Save-Room($Room) {
  $Room.updated_at = Get-NowUtcString
  Write-JsonObject $Script:RoomPath $Room
}

function Get-TsdConfig {
  return Read-JsonObject $Script:TsdConfigPath
}

function Save-TsdConfig($Config) {
  Write-JsonObject $Script:TsdConfigPath $Config
}

function Get-TsdUnits {
  return Read-JsonArray $Script:TsdUnitsPath
}

function Save-TsdUnits([object[]]$Items) {
  Write-JsonArray $Script:TsdUnitsPath $Items
}

function Get-Cameras {
  return Read-JsonArray $Script:CamerasPath
}

function Save-Cameras([object[]]$Items) {
  Write-JsonArray $Script:CamerasPath $Items
}

function Get-Presets {
  return Read-JsonArray $Script:PresetsPath
}

function Save-Presets([object[]]$Items) {
  Write-JsonArray $Script:PresetsPath $Items
}

function Get-Layout {
  return Read-JsonObject $Script:LayoutPath
}

function Save-Layout($Item) {
  Write-JsonObject $Script:LayoutPath $Item
}

function Get-LayoutDevices {
  return Read-JsonArray $Script:LayoutDevicesPath
}

function Save-LayoutDevices([object[]]$Items) {
  Write-JsonArray $Script:LayoutDevicesPath $Items
}

function Get-LayoutAnnotations {
  return Read-JsonArray $Script:LayoutAnnotationsPath
}

function Save-LayoutAnnotations([object[]]$Items) {
  Write-JsonArray $Script:LayoutAnnotationsPath $Items
}

function Get-Mappings {
  return Read-JsonArray $Script:MappingsPath
}

function Save-Mappings([object[]]$Items) {
  Write-JsonArray $Script:MappingsPath $Items
}

function Get-RuntimeRoomState {
  $state = Read-JsonObject $Script:RuntimeRoomStatePath
  if ($null -eq $state) {
    Initialize-Data
    $state = Read-JsonObject $Script:RuntimeRoomStatePath
  }
  return $state
}

function Save-RuntimeRoomState($State) {
  $State.updated_at = Get-NowUtcString
  Write-JsonObject $Script:RuntimeRoomStatePath $State
}

function Get-RuntimeUnitsState {
  return Read-JsonArray $Script:RuntimeUnitsStatePath
}

function Save-RuntimeUnitsState([object[]]$Items) {
  Write-JsonArray $Script:RuntimeUnitsStatePath $Items
}

function Get-SpeakingRequests {
  return Read-JsonArray $Script:SpeakingRequestsPath
}

function Save-SpeakingRequests([object[]]$Items) {
  Write-JsonArray $Script:SpeakingRequestsPath $Items
}

function Get-RuntimeEvents {
  return Read-JsonArray $Script:RuntimeEventsPath
}

function Save-RuntimeEvents([object[]]$Items) {
  Write-JsonArray $Script:RuntimeEventsPath $Items
}

function Get-RuntimeCameraLogs {
  return Read-JsonArray $Script:RuntimeCameraLogsPath
}

function Save-RuntimeCameraLogs([object[]]$Items) {
  Write-JsonArray $Script:RuntimeCameraLogsPath $Items
}

function Get-RuntimeWorkerInfo {
  return Read-JsonObject $Script:RuntimeWorkerPidPath
}

function Save-RuntimeWorkerInfo($Info) {
  Write-JsonObject $Script:RuntimeWorkerPidPath $Info
}

function Get-CurrentOperationMode {
  $room = Get-Room
  return [string]$room.operation_mode
}

function Sync-RuntimeRoomStateMode {
  $state = Get-RuntimeRoomState
  $mode = Get-CurrentOperationMode
  if ($state.operation_mode -ne $mode) {
    $state.operation_mode = $mode
    Save-RuntimeRoomState $state
  }
}

function Compute-RuntimeSnapshot {
  Sync-RuntimeRoomStateMode
  $state = Get-RuntimeRoomState
  $requests = @(Get-SpeakingRequests)
  $pending = @($requests | Where-Object { $_.status -eq "PENDING" })
  $unitStates = @(Get-RuntimeUnitsState)
  $speaking = @($unitStates | Where-Object { $_.state -eq "SPEAKING" })

  # Keep room snapshot fields consistent even if worker only updates partial data.
  $state.pending_requests = @($pending | ForEach-Object { $_.id })
  $state.active_speakers = @($speaking | ForEach-Object { $_.unit_id })
  Save-RuntimeRoomState $state

  $units = @{}
  foreach ($item in $unitStates) {
    if ($null -ne $item -and -not [string]::IsNullOrWhiteSpace([string]$item.unit_id)) {
      $units[[string]$item.unit_id] = @{
        state = [string]$item.state
        lastEventAt = $item.last_event_at
      }
    }
  }

  return @{
    operationMode = [string]$state.operation_mode
    sseStatus = [string]$state.sse_status
    activeSpeakers = @($state.active_speakers)
    pendingRequests = @($state.pending_requests)
    currentCameraTarget = $state.current_camera_target
    units = $units
  }
}

function Get-PaginatedResult([object[]]$Items, [int]$Page = 1, [int]$PageSize = 20) {
  $safePage = [Math]::Max(1, $Page)
  $safePageSize = [Math]::Max(1, $PageSize)
  $total = $Items.Count
  $totalPages = if ($total -eq 0) { 0 } else { [Math]::Ceiling($total / $safePageSize) }
  $start = ($safePage - 1) * $safePageSize
  return @{
    items = @($Items | Select-Object -Skip $start -First $safePageSize)
    pagination = @{
      page = $safePage
      pageSize = $safePageSize
      total = $total
      totalPages = $totalPages
    }
  }
}

function Read-JsonPayload([System.Net.HttpListenerContext]$Context) {
  $bodyText = Read-RequestBody $Context.Request
  if ([string]::IsNullOrWhiteSpace($bodyText)) {
    return $null
  }
  return $bodyText | ConvertFrom-Json
}

function New-TsdUnitResponse($Unit) {
  return @{
    id = $Unit.id
    externalUnitId = $Unit.external_unit_id
    unitName = $Unit.unit_name
    deviceType = $Unit.device_type
    runtimeState = $Unit.runtime_state
    isConnected = $Unit.is_connected
    lastEventAt = $Unit.last_event_at
  }
}

function New-CameraResponse($Camera) {
  return @{
    id = $Camera.id
    name = $Camera.name
    protocol = $Camera.protocol
    ipAddress = $Camera.ip_address
    port = $Camera.port
    rtspUrl = $Camera.rtsp_url
    vendor = $Camera.vendor
    model = $Camera.model
    status = $Camera.status
    capabilities = @{
      ptz = [bool]$Camera.capability_ptz
      preset = [bool]$Camera.capability_preset
      stream = [bool]$Camera.capability_stream
    }
    lastTestResult = $Camera.last_test_result
    lastTestAt = $Camera.last_test_at
  }
}

function New-PresetResponse($Preset) {
  return @{
    id = $Preset.id
    cameraId = $Preset.camera_id
    presetCode = $Preset.preset_code
    presetName = $Preset.preset_name
  }
}

function Get-DefaultUnits([string]$RoomId) {
  $now = Get-NowUtcString
  return @(
    [pscustomobject]@{
      id = "unit-chair-001"
      room_id = $RoomId
      external_unit_id = "C01"
      unit_name = "Chairman 01"
      device_type = "CHAIRMAN"
      runtime_state = "IDLE"
      is_connected = $true
      last_event_at = $null
      created_at = $now
      updated_at = $now
    },
    [pscustomobject]@{
      id = "unit-del-001"
      room_id = $RoomId
      external_unit_id = "D01"
      unit_name = "Delegate 01"
      device_type = "DELEGATE"
      runtime_state = "IDLE"
      is_connected = $true
      last_event_at = $null
      created_at = $now
      updated_at = $now
    },
    [pscustomobject]@{
      id = "unit-del-002"
      room_id = $RoomId
      external_unit_id = "D02"
      unit_name = "Delegate 02"
      device_type = "DELEGATE"
      runtime_state = "IDLE"
      is_connected = $true
      last_event_at = $null
      created_at = $now
      updated_at = $now
    }
  )
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
    id = New-Id
    user_id = $user.id
    token_jti = New-Id
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
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }

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
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }

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

function Handle-ConfigOverview([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }

  $room = Get-Room
  $config = Get-TsdConfig
  $cameras = @(Get-Cameras)
  $layout = Get-Layout
  $mappings = @(Get-Mappings)

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      room = @{
        id = $room.id
        name = $room.name
        operationMode = $room.operation_mode
      }
      tsdConnection = @{
        configured = [bool]($null -ne $config)
        lastTestResult = if ($null -ne $config) { $config.last_test_result } else { $null }
        lastTestAt = if ($null -ne $config) { $config.last_test_at } else { $null }
      }
      layout = @{
        configured = [bool]($null -ne $layout)
        fileType = if ($null -ne $layout) { $layout.file_type } else { $null }
      }
      cameraSummary = @{
        total = $cameras.Count
        active = @($cameras | Where-Object { $_.status -eq "ACTIVE" }).Count
      }
      mappingSummary = @{
        total = $mappings.Count
        active = @($mappings | Where-Object { $_.is_active }).Count
      }
    }
  }
}

function Handle-GetTsdConfig([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $config = Get-TsdConfig
  if ($null -eq $config) {
    Send-Error $Context.Response 404 "CONFIG_NOT_FOUND" "TS-D1000 configuration not found"
    return
  }
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      id = $config.id
      baseUrl = $config.base_url
      username = $config.username
      sseEndpoint = $config.sse_endpoint
      isActive = $config.is_active
      lastTestResult = $config.last_test_result
      lastTestAt = $config.last_test_at
    }
  }
}

function Validate-TsdPayload($Payload, [System.Net.HttpListenerResponse]$Response) {
  if ($null -eq $Payload -or [string]::IsNullOrWhiteSpace([string]$Payload.baseUrl)) {
    Send-Error $Response 400 "VALIDATION_ERROR" "Base URL is required"
    return $false
  }

  if ($null -ne $Payload.sseEndpoint -and [string]::IsNullOrWhiteSpace([string]$Payload.sseEndpoint)) {
    Send-Error $Response 400 "VALIDATION_ERROR" "SSE endpoint must not be empty"
    return $false
  }

  return $true
}

function Handle-CreateTsdConfig([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  if ($null -ne (Get-TsdConfig)) {
    Send-Error $Context.Response 409 "TSD_CONFIG_EXISTS" "TS-D1000 configuration already exists"
    return
  }

  $payload = Read-JsonPayload $Context
  if (-not (Validate-TsdPayload $payload $Context.Response)) { return }
  $room = Get-Room
  $now = Get-NowUtcString
  $config = [pscustomobject]@{
    id = New-Id
    room_id = $room.id
    base_url = ([string]$payload.baseUrl).Trim()
    username = if ($null -ne $payload.username -and -not [string]::IsNullOrWhiteSpace([string]$payload.username)) { ([string]$payload.username).Trim() } else { $null }
    password_encrypted = if ($null -ne $payload.password -and -not [string]::IsNullOrWhiteSpace([string]$payload.password)) { ([string]$payload.password).Trim() } else { $null }
    sse_endpoint = if ($null -ne $payload.sseEndpoint -and -not [string]::IsNullOrWhiteSpace([string]$payload.sseEndpoint)) { ([string]$payload.sseEndpoint).Trim() } else { "/api/event" }
    is_active = $true
    last_test_result = $null
    last_test_at = $null
    created_at = $now
    updated_at = $now
  }
  Save-TsdConfig $config
  Add-AuditLog ([guid]$auth.user.id) "CREATE_TSD_CONFIG" "TSD_CONFIG" $config.id "SUCCESS" @{ roomId = $room.id }
  Handle-GetTsdConfig $Context
}

function Handle-UpdateTsdConfig([System.Net.HttpListenerContext]$Context, [string]$ConfigId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $config = Get-TsdConfig
  if ($null -eq $config -or $config.id -ne $ConfigId) {
    Send-Error $Context.Response 404 "CONFIG_NOT_FOUND" "TS-D1000 configuration not found"
    return
  }
  $payload = Read-JsonPayload $Context
  if (-not (Validate-TsdPayload $payload $Context.Response)) { return }

  $config.base_url = ([string]$payload.baseUrl).Trim()
  $config.username = if ($null -ne $payload.username -and -not [string]::IsNullOrWhiteSpace([string]$payload.username)) { ([string]$payload.username).Trim() } else { $null }
  if ($null -ne $payload.password -and -not [string]::IsNullOrWhiteSpace([string]$payload.password)) {
    $config.password_encrypted = ([string]$payload.password).Trim()
  }
  if ($null -ne $payload.sseEndpoint -and -not [string]::IsNullOrWhiteSpace([string]$payload.sseEndpoint)) {
    $config.sse_endpoint = ([string]$payload.sseEndpoint).Trim()
  }
  $config.updated_at = Get-NowUtcString
  Save-TsdConfig $config
  Add-AuditLog ([guid]$auth.user.id) "UPDATE_TSD_CONFIG" "TSD_CONFIG" $config.id "SUCCESS" @{}
  Handle-GetTsdConfig $Context
}

function Handle-TestTsdConfig([System.Net.HttpListenerContext]$Context, [string]$ConfigId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $config = Get-TsdConfig
  if ($null -eq $config -or $config.id -ne $ConfigId) {
    Send-Error $Context.Response 404 "CONFIG_NOT_FOUND" "TS-D1000 configuration not found"
    return
  }

  $baseUrl = [string]$config.base_url
  $testedAt = Get-NowUtcString
  if ($baseUrl -like "*timeout*") {
    $config.last_test_result = "FAILED"
    $config.last_test_at = $testedAt
    $config.updated_at = $testedAt
    Save-TsdConfig $config
    Send-Error $Context.Response 503 "TSD_TIMEOUT" "TS-D1000 connection timed out"
    return
  }
  if ($baseUrl -like "*fail*") {
    $config.last_test_result = "FAILED"
    $config.last_test_at = $testedAt
    $config.updated_at = $testedAt
    Save-TsdConfig $config
    Send-Error $Context.Response 502 "TSD_UNREACHABLE" "TS-D1000 is unreachable"
    return
  }

  $config.last_test_result = "SUCCESS"
  $config.last_test_at = $testedAt
  $config.updated_at = $testedAt
  Save-TsdConfig $config
  Add-AuditLog ([guid]$auth.user.id) "TEST_TSD_CONFIG" "TSD_CONFIG" $config.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      result = "SUCCESS"
      testedAt = $testedAt
    }
  }
}

function Handle-SyncTsdUnits([System.Net.HttpListenerContext]$Context, [string]$ConfigId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $config = Get-TsdConfig
  if ($null -eq $config -or $config.id -ne $ConfigId) {
    Send-Error $Context.Response 404 "CONFIG_NOT_FOUND" "TS-D1000 configuration not found"
    return
  }

  if ([string]$config.base_url -like "*malformed*") {
    Send-Error $Context.Response 502 "TSD_MALFORMED_RESPONSE" "Malformed TS-D1000 response"
    return
  }

  $room = Get-Room
  $units = @(Get-TsdUnits)
  $seed = @(Get-DefaultUnits $room.id)
  $created = 0
  $updated = 0
  foreach ($row in $seed) {
    $existing = $units | Where-Object { $_.room_id -eq $room.id -and $_.external_unit_id -eq $row.external_unit_id } | Select-Object -First 1
    if ($null -eq $existing) {
      $units += $row
      $created += 1
    } else {
      $existing.unit_name = $row.unit_name
      $existing.device_type = $row.device_type
      $existing.updated_at = Get-NowUtcString
      $updated += 1
    }
  }
  Save-TsdUnits $units
  Add-AuditLog ([guid]$auth.user.id) "SYNC_TSD_UNITS" "TSD_CONFIG" $config.id "SUCCESS" @{ created = $created; updated = $updated }
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      synced = $created + $updated
      created = $created
      updated = $updated
      skipped = 0
    }
  }
}

function Handle-ListUnits([System.Net.HttpListenerContext]$Context, [string]$ConfigId) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $config = Get-TsdConfig
  if ($null -eq $config -or $config.id -ne $ConfigId) {
    Send-Error $Context.Response 404 "CONFIG_NOT_FOUND" "TS-D1000 configuration not found"
    return
  }
  $search = [string]$Context.Request.QueryString["search"]
  $deviceType = [string]$Context.Request.QueryString["deviceType"]
  $page = if ($Context.Request.QueryString["page"]) { [int]$Context.Request.QueryString["page"] } else { 1 }
  $pageSize = if ($Context.Request.QueryString["pageSize"]) { [int]$Context.Request.QueryString["pageSize"] } else { 20 }

  $items = @(Get-TsdUnits | Where-Object { $_.room_id -eq $config.room_id })
  if (-not [string]::IsNullOrWhiteSpace($search)) {
    $normalized = $search.Trim().ToLowerInvariant()
    $items = @($items | Where-Object {
      $_.external_unit_id.ToLowerInvariant().Contains($normalized) -or
      (($null -ne $_.unit_name) -and $_.unit_name.ToLowerInvariant().Contains($normalized))
    })
  }
  if (-not [string]::IsNullOrWhiteSpace($deviceType)) {
    $items = @($items | Where-Object { $_.device_type -eq $deviceType })
  }

  $responseItems = @($items | ForEach-Object { New-TsdUnitResponse $_ })
  Send-Json $Context.Response 200 @{
    success = $true
    data = Get-PaginatedResult $responseItems $page $pageSize
  }
}

function Validate-CameraPayload($Payload, [System.Net.HttpListenerResponse]$Response) {
  if ($null -eq $Payload -or [string]::IsNullOrWhiteSpace([string]$Payload.name)) {
    Send-Error $Response 400 "VALIDATION_ERROR" "Name is required"
    return $false
  }
  if ($null -eq $Payload.protocol -or @("ONVIF", "VISCA") -notcontains [string]$Payload.protocol) {
    Send-Error $Response 400 "VALIDATION_ERROR" "Protocol is invalid"
    return $false
  }
  if ([string]::IsNullOrWhiteSpace([string]$Payload.ipAddress)) {
    Send-Error $Response 400 "VALIDATION_ERROR" "IP address is required"
    return $false
  }
  if ($null -ne $Payload.port) {
    $port = [int]$Payload.port
    if ($port -lt 1 -or $port -gt 65535) {
      Send-Error $Response 400 "VALIDATION_ERROR" "Port must be between 1 and 65535"
      return $false
    }
  }
  return $true
}

function Handle-ListCameras([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $search = [string]$Context.Request.QueryString["search"]
  $status = [string]$Context.Request.QueryString["status"]
  $protocol = [string]$Context.Request.QueryString["protocol"]
  $page = if ($Context.Request.QueryString["page"]) { [int]$Context.Request.QueryString["page"] } else { 1 }
  $pageSize = if ($Context.Request.QueryString["pageSize"]) { [int]$Context.Request.QueryString["pageSize"] } else { 10 }
  $room = Get-Room

  $items = @(Get-Cameras | Where-Object { $_.room_id -eq $room.id })
  if (-not [string]::IsNullOrWhiteSpace($search)) {
    $normalized = $search.Trim().ToLowerInvariant()
    $items = @($items | Where-Object {
      $_.name.ToLowerInvariant().Contains($normalized) -or $_.ip_address.ToLowerInvariant().Contains($normalized)
    })
  }
  if (-not [string]::IsNullOrWhiteSpace($status)) {
    $items = @($items | Where-Object { $_.status -eq $status })
  }
  if (-not [string]::IsNullOrWhiteSpace($protocol)) {
    $items = @($items | Where-Object { $_.protocol -eq $protocol })
  }

  $responseItems = @($items | ForEach-Object { New-CameraResponse $_ })
  Send-Json $Context.Response 200 @{
    success = $true
    data = Get-PaginatedResult $responseItems $page $pageSize
  }
}

function Handle-GetCamera([System.Net.HttpListenerContext]$Context, [string]$CameraId) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $camera = Get-Cameras | Where-Object { $_.id -eq $CameraId } | Select-Object -First 1
  if ($null -eq $camera) {
    Send-Error $Context.Response 404 "CAMERA_NOT_FOUND" "Camera not found"
    return
  }
  Send-Json $Context.Response 200 @{
    success = $true
    data = New-CameraResponse $camera
  }
}

function Handle-CreateCamera([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $payload = Read-JsonPayload $Context
  if (-not (Validate-CameraPayload $payload $Context.Response)) { return }
  $room = Get-Room
  $cameras = @(Get-Cameras)
  if (@($cameras | Where-Object { $_.room_id -eq $room.id -and $_.status -eq "ACTIVE" }).Count -ge 4) {
    Send-Error $Context.Response 422 "CAMERA_LIMIT_REACHED" "Maximum 4 active cameras allowed"
    return
  }
  $duplicate = $cameras | Where-Object {
    $_.room_id -eq $room.id -and $_.ip_address -eq ([string]$payload.ipAddress).Trim() -and [int]$_.port -eq [int]$payload.port
  } | Select-Object -First 1
  if ($null -ne $duplicate) {
    Send-Error $Context.Response 409 "CAMERA_DUPLICATE_ENDPOINT" "Camera endpoint already exists"
    return
  }

  $now = Get-NowUtcString
  $camera = [pscustomobject]@{
    id = New-Id
    room_id = $room.id
    name = ([string]$payload.name).Trim()
    protocol = [string]$payload.protocol
    ip_address = ([string]$payload.ipAddress).Trim()
    port = if ($null -ne $payload.port -and -not [string]::IsNullOrWhiteSpace([string]$payload.port)) { [int]$payload.port } else { $null }
    username = if ($null -ne $payload.username -and -not [string]::IsNullOrWhiteSpace([string]$payload.username)) { ([string]$payload.username).Trim() } else { $null }
    password_encrypted = if ($null -ne $payload.password -and -not [string]::IsNullOrWhiteSpace([string]$payload.password)) { ([string]$payload.password).Trim() } else { $null }
    rtsp_url = if ($null -ne $payload.rtspUrl -and -not [string]::IsNullOrWhiteSpace([string]$payload.rtspUrl)) { [string]$payload.rtspUrl } else { $null }
    vendor = if ($null -ne $payload.vendor -and -not [string]::IsNullOrWhiteSpace([string]$payload.vendor)) { ([string]$payload.vendor).Trim() } else { $null }
    model = if ($null -ne $payload.model -and -not [string]::IsNullOrWhiteSpace([string]$payload.model)) { ([string]$payload.model).Trim() } else { $null }
    status = "ACTIVE"
    capability_ptz = $false
    capability_preset = $false
    capability_stream = $false
    last_test_result = $null
    last_test_at = $null
    created_at = $now
    updated_at = $now
  }
  $cameras += $camera
  Save-Cameras $cameras
  Add-AuditLog ([guid]$auth.user.id) "CREATE_CAMERA" "CAMERA" $camera.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = New-CameraResponse $camera
  }
}

function Handle-UpdateCamera([System.Net.HttpListenerContext]$Context, [string]$CameraId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $payload = Read-JsonPayload $Context
  if (-not (Validate-CameraPayload $payload $Context.Response)) { return }
  $cameras = @(Get-Cameras)
  $camera = $cameras | Where-Object { $_.id -eq $CameraId } | Select-Object -First 1
  if ($null -eq $camera) {
    Send-Error $Context.Response 404 "CAMERA_NOT_FOUND" "Camera not found"
    return
  }
  $duplicate = $cameras | Where-Object {
    $_.id -ne $camera.id -and $_.room_id -eq $camera.room_id -and $_.ip_address -eq ([string]$payload.ipAddress).Trim() -and [int]$_.port -eq [int]$payload.port
  } | Select-Object -First 1
  if ($null -ne $duplicate) {
    Send-Error $Context.Response 409 "CAMERA_DUPLICATE_ENDPOINT" "Camera endpoint already exists"
    return
  }
  $camera.name = ([string]$payload.name).Trim()
  $camera.protocol = [string]$payload.protocol
  $camera.ip_address = ([string]$payload.ipAddress).Trim()
  $camera.port = if ($null -ne $payload.port -and -not [string]::IsNullOrWhiteSpace([string]$payload.port)) { [int]$payload.port } else { $null }
  $camera.username = if ($null -ne $payload.username -and -not [string]::IsNullOrWhiteSpace([string]$payload.username)) { ([string]$payload.username).Trim() } else { $null }
  if ($null -ne $payload.password -and -not [string]::IsNullOrWhiteSpace([string]$payload.password)) {
    $camera.password_encrypted = ([string]$payload.password).Trim()
  }
  $camera.rtsp_url = if ($null -ne $payload.rtspUrl -and -not [string]::IsNullOrWhiteSpace([string]$payload.rtspUrl)) { [string]$payload.rtspUrl } else { $null }
  $camera.vendor = if ($null -ne $payload.vendor -and -not [string]::IsNullOrWhiteSpace([string]$payload.vendor)) { ([string]$payload.vendor).Trim() } else { $null }
  $camera.model = if ($null -ne $payload.model -and -not [string]::IsNullOrWhiteSpace([string]$payload.model)) { ([string]$payload.model).Trim() } else { $null }
  $camera.updated_at = Get-NowUtcString
  Save-Cameras $cameras
  Add-AuditLog ([guid]$auth.user.id) "UPDATE_CAMERA" "CAMERA" $camera.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = New-CameraResponse $camera
  }
}

function Handle-DeactivateCamera([System.Net.HttpListenerContext]$Context, [string]$CameraId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $cameras = @(Get-Cameras)
  $camera = $cameras | Where-Object { $_.id -eq $CameraId } | Select-Object -First 1
  if ($null -eq $camera) {
    Send-Error $Context.Response 404 "CAMERA_NOT_FOUND" "Camera not found"
    return
  }
  if ($camera.status -eq "INACTIVE") {
    Send-Error $Context.Response 409 "CAMERA_ALREADY_INACTIVE" "Camera is already inactive"
    return
  }
  $activeMapping = Get-Mappings | Where-Object { $_.camera_id -eq $camera.id -and $_.is_active } | Select-Object -First 1
  if ($null -ne $activeMapping) {
    Send-Error $Context.Response 422 "CAMERA_ALREADY_IN_USE" "Camera is referenced by active mappings"
    return
  }
  $camera.status = "INACTIVE"
  $camera.updated_at = Get-NowUtcString
  Save-Cameras $cameras
  Add-AuditLog ([guid]$auth.user.id) "DEACTIVATE_CAMERA" "CAMERA" $camera.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = New-CameraResponse $camera
  }
}

function Handle-TestCamera([System.Net.HttpListenerContext]$Context, [string]$CameraId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $cameras = @(Get-Cameras)
  $camera = $cameras | Where-Object { $_.id -eq $CameraId } | Select-Object -First 1
  if ($null -eq $camera) {
    Send-Error $Context.Response 404 "CAMERA_NOT_FOUND" "Camera not found"
    return
  }
  if ($camera.ip_address -like "*timeout*") {
    Send-Error $Context.Response 503 "CAMERA_TIMEOUT" "Camera connection timed out"
    return
  }
  if ($camera.ip_address -like "*fail*") {
    Send-Error $Context.Response 502 "CAMERA_CONNECTION_FAILED" "Camera connection failed"
    return
  }
  $testedAt = Get-NowUtcString
  $hasStream = -not [string]::IsNullOrWhiteSpace([string]$camera.rtsp_url)
  $camera.last_test_result = if ($hasStream) { "SUCCESS" } else { "PARTIAL" }
  $camera.last_test_at = $testedAt
  $camera.capability_ptz = $true
  $camera.capability_preset = $true
  $camera.capability_stream = $hasStream
  $camera.updated_at = $testedAt
  Save-Cameras $cameras
  Add-AuditLog ([guid]$auth.user.id) "TEST_CAMERA" "CAMERA" $camera.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      result = $camera.last_test_result
      testedAt = $testedAt
      capabilities = @{
        ptz = [bool]$camera.capability_ptz
        preset = [bool]$camera.capability_preset
        stream = [bool]$camera.capability_stream
      }
    }
  }
}

function Handle-ListPresets([System.Net.HttpListenerContext]$Context, [string]$CameraId) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $camera = Get-Cameras | Where-Object { $_.id -eq $CameraId } | Select-Object -First 1
  if ($null -eq $camera) {
    Send-Error $Context.Response 404 "CAMERA_NOT_FOUND" "Camera not found"
    return
  }
  $items = @(Get-Presets | Where-Object { $_.camera_id -eq $CameraId } | ForEach-Object { New-PresetResponse $_ })
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      items = $items
    }
  }
}

function Handle-CreatePreset([System.Net.HttpListenerContext]$Context, [string]$CameraId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $camera = Get-Cameras | Where-Object { $_.id -eq $CameraId } | Select-Object -First 1
  if ($null -eq $camera) {
    Send-Error $Context.Response 404 "CAMERA_NOT_FOUND" "Camera not found"
    return
  }
  $payload = Read-JsonPayload $Context
  if ($null -eq $payload -or [string]::IsNullOrWhiteSpace([string]$payload.presetCode)) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "Preset code is required"
    return
  }
  $presets = @(Get-Presets)
  $duplicate = $presets | Where-Object { $_.camera_id -eq $CameraId -and $_.preset_code -eq ([string]$payload.presetCode).Trim() } | Select-Object -First 1
  if ($null -ne $duplicate) {
    Send-Error $Context.Response 409 "PRESET_CODE_EXISTS" "Preset code already exists"
    return
  }
  $preset = [pscustomobject]@{
    id = New-Id
    camera_id = $CameraId
    preset_code = ([string]$payload.presetCode).Trim()
    preset_name = if ($null -ne $payload.presetName -and -not [string]::IsNullOrWhiteSpace([string]$payload.presetName)) { ([string]$payload.presetName).Trim() } else { $null }
    created_at = Get-NowUtcString
    updated_at = Get-NowUtcString
  }
  $presets += $preset
  Save-Presets $presets
  Add-AuditLog ([guid]$auth.user.id) "CREATE_PRESET" "CAMERA_PRESET" $preset.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = New-PresetResponse $preset
  }
}

function Handle-UpdatePreset([System.Net.HttpListenerContext]$Context, [string]$PresetId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $payload = Read-JsonPayload $Context
  if ($null -eq $payload -or [string]::IsNullOrWhiteSpace([string]$payload.presetCode)) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "Preset code is required"
    return
  }
  $presets = @(Get-Presets)
  $preset = $presets | Where-Object { $_.id -eq $PresetId } | Select-Object -First 1
  if ($null -eq $preset) {
    Send-Error $Context.Response 404 "PRESET_NOT_FOUND" "Preset not found"
    return
  }
  $duplicate = $presets | Where-Object {
    $_.id -ne $preset.id -and $_.camera_id -eq $preset.camera_id -and $_.preset_code -eq ([string]$payload.presetCode).Trim()
  } | Select-Object -First 1
  if ($null -ne $duplicate) {
    Send-Error $Context.Response 409 "PRESET_CODE_EXISTS" "Preset code already exists"
    return
  }
  $preset.preset_code = ([string]$payload.presetCode).Trim()
  $preset.preset_name = if ($null -ne $payload.presetName -and -not [string]::IsNullOrWhiteSpace([string]$payload.presetName)) { ([string]$payload.presetName).Trim() } else { $null }
  $preset.updated_at = Get-NowUtcString
  Save-Presets $presets
  Add-AuditLog ([guid]$auth.user.id) "UPDATE_PRESET" "CAMERA_PRESET" $preset.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = New-PresetResponse $preset
  }
}

function Handle-GetLayout([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $layout = Get-Layout
  if ($null -eq $layout) {
    Send-Error $Context.Response 422 "LAYOUT_NOT_CONFIGURED" "Layout is not configured"
    return
  }
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      id = $layout.id
      fileName = $layout.file_name
      filePath = $layout.file_path
      fileType = $layout.file_type
      width = $layout.width
      height = $layout.height
    }
  }
}

function Handle-UploadLayout([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }

  $bytes = Read-RequestBytes $Context.Request
  if ($bytes.Length -eq 0) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "Please select a file"
    return
  }
  $raw = [System.Text.Encoding]::UTF8.GetString($bytes)
  $match = [regex]::Match($raw, 'filename="([^"]+)"')
  if (-not $match.Success) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "Please select a file"
    return
  }
  $fileName = $match.Groups[1].Value
  $extension = [System.IO.Path]::GetExtension($fileName).TrimStart(".").ToUpperInvariant()
  if (@("PDF", "JPG", "JPEG") -notcontains $extension) {
    Send-Error $Context.Response 400 "INVALID_FILE_TYPE" "Only PDF, JPG, JPEG are allowed"
    return
  }
  $room = Get-Room
  $existing = Get-Layout
  $layout = [pscustomobject]@{
    id = if ($null -ne $existing) { $existing.id } else { New-Id }
    room_id = $room.id
    file_name = $fileName
    file_path = "/storage/layouts/$fileName"
    file_type = $extension
    width = 1920
    height = 1080
    created_at = if ($null -ne $existing) { $existing.created_at } else { Get-NowUtcString }
    updated_at = Get-NowUtcString
  }
  Save-Layout $layout
  Add-AuditLog ([guid]$auth.user.id) "UPLOAD_LAYOUT" "LAYOUT" $layout.id "SUCCESS" @{}
  Handle-GetLayout $Context
}

function Handle-ListLayoutDevices([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $room = Get-Room
  $items = @(Get-LayoutDevices | Where-Object { $_.room_id -eq $room.id } | ForEach-Object {
      @{
        id = $_.id
        refType = $_.ref_type
        refId = $_.ref_id
        posX = $_.pos_x
        posY = $_.pos_y
        iconLabel = $_.icon_label
      }
    })
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      items = $items
    }
  }
}

function Handle-SaveLayoutDevices([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $layout = Get-Layout
  if ($null -eq $layout) {
    Send-Error $Context.Response 422 "LAYOUT_NOT_CONFIGURED" "Layout is not configured"
    return
  }
  $payload = Read-JsonPayload $Context
  if ($null -eq $payload -or $null -eq $payload.devices) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "devices is required"
    return
  }
  $devices = @()
  foreach ($item in $payload.devices) {
    if (@("TSD_UNIT", "CAMERA") -notcontains [string]$item.refType) {
      Send-Error $Context.Response 400 "VALIDATION_ERROR" "refType is invalid"
      return
    }
    if ([string]::IsNullOrWhiteSpace([string]$item.refId)) {
      Send-Error $Context.Response 400 "VALIDATION_ERROR" "refId is required"
      return
    }
    $posX = [double]$item.posX
    $posY = [double]$item.posY
    if ($posX -lt 0 -or $posX -gt 1 -or $posY -lt 0 -or $posY -gt 1) {
      Send-Error $Context.Response 400 "VALIDATION_ERROR" "Position is invalid"
      return
    }
    if ([string]$item.refType -eq "TSD_UNIT" -and $null -eq (Get-TsdUnits | Where-Object { $_.id -eq [string]$item.refId } | Select-Object -First 1)) {
      Send-Error $Context.Response 404 "REF_NOT_FOUND" "Referenced unit does not exist"
      return
    }
    if ([string]$item.refType -eq "CAMERA" -and $null -eq (Get-Cameras | Where-Object { $_.id -eq [string]$item.refId } | Select-Object -First 1)) {
      Send-Error $Context.Response 404 "REF_NOT_FOUND" "Referenced camera does not exist"
      return
    }
    $key = "$([string]$item.refType):$([string]$item.refId)"
    if ($devices | Where-Object { $_.key -eq $key }) {
      Send-Error $Context.Response 400 "DUPLICATE_LAYOUT_DEVICE" "Duplicate layout device in payload"
      return
    }
    $devices += [pscustomobject]@{
      key = $key
      ref_type = [string]$item.refType
      ref_id = [string]$item.refId
      pos_x = $posX
      pos_y = $posY
      icon_label = if ($null -ne $item.iconLabel -and -not [string]::IsNullOrWhiteSpace([string]$item.iconLabel)) { [string]$item.iconLabel } else { $null }
    }
  }

  $room = Get-Room
  $saved = @()
  foreach ($item in $devices) {
    $existing = Get-LayoutDevices | Where-Object { $_.room_id -eq $room.id -and $_.ref_type -eq $item.ref_type -and $_.ref_id -eq $item.ref_id } | Select-Object -First 1
    $saved += [pscustomobject]@{
      id = if ($null -ne $existing) { $existing.id } else { New-Id }
      room_id = $room.id
      ref_type = $item.ref_type
      ref_id = $item.ref_id
      pos_x = $item.pos_x
      pos_y = $item.pos_y
      icon_label = $item.icon_label
      created_at = if ($null -ne $existing) { $existing.created_at } else { Get-NowUtcString }
      updated_at = Get-NowUtcString
    }
  }
  Save-LayoutDevices $saved
  Add-AuditLog ([guid]$auth.user.id) "SAVE_LAYOUT_DEVICES" "LAYOUT" $layout.id "SUCCESS" @{}
  Handle-ListLayoutDevices $Context
}

function Handle-ListAnnotations([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $room = Get-Room
  $items = @(Get-LayoutAnnotations | Where-Object { $_.room_id -eq $room.id } | ForEach-Object {
      @{
        id = $_.id
        text = $_.text
        posX = $_.pos_x
        posY = $_.pos_y
      }
    })
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      items = $items
    }
  }
}

function Validate-AnnotationPayload($Payload, [System.Net.HttpListenerResponse]$Response) {
  if ($null -eq $Payload -or [string]::IsNullOrWhiteSpace([string]$Payload.text)) {
    Send-Error $Response 400 "VALIDATION_ERROR" "Annotation text is required"
    return $false
  }
  $posX = [double]$Payload.posX
  $posY = [double]$Payload.posY
  if ($posX -lt 0 -or $posX -gt 1 -or $posY -lt 0 -or $posY -gt 1) {
    Send-Error $Response 400 "VALIDATION_ERROR" "Annotation position is invalid"
    return $false
  }
  return $true
}

function Handle-CreateAnnotation([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $layout = Get-Layout
  if ($null -eq $layout) {
    Send-Error $Context.Response 422 "LAYOUT_NOT_CONFIGURED" "Layout is not configured"
    return
  }
  $payload = Read-JsonPayload $Context
  if (-not (Validate-AnnotationPayload $payload $Context.Response)) { return }
  $room = Get-Room
  $items = @(Get-LayoutAnnotations)
  $annotation = [pscustomobject]@{
    id = New-Id
    room_id = $room.id
    text = ([string]$payload.text).Trim()
    pos_x = [double]$payload.posX
    pos_y = [double]$payload.posY
    created_at = Get-NowUtcString
    updated_at = Get-NowUtcString
  }
  $items += $annotation
  Save-LayoutAnnotations $items
  Add-AuditLog ([guid]$auth.user.id) "CREATE_LAYOUT_ANNOTATION" "LAYOUT_ANNOTATION" $annotation.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      id = $annotation.id
      text = $annotation.text
      posX = $annotation.pos_x
      posY = $annotation.pos_y
    }
  }
}

function Handle-UpdateAnnotation([System.Net.HttpListenerContext]$Context, [string]$AnnotationId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $payload = Read-JsonPayload $Context
  if (-not (Validate-AnnotationPayload $payload $Context.Response)) { return }
  $items = @(Get-LayoutAnnotations)
  $annotation = $items | Where-Object { $_.id -eq $AnnotationId } | Select-Object -First 1
  if ($null -eq $annotation) {
    Send-Error $Context.Response 404 "ANNOTATION_NOT_FOUND" "Annotation not found"
    return
  }
  $annotation.text = ([string]$payload.text).Trim()
  $annotation.pos_x = [double]$payload.posX
  $annotation.pos_y = [double]$payload.posY
  $annotation.updated_at = Get-NowUtcString
  Save-LayoutAnnotations $items
  Add-AuditLog ([guid]$auth.user.id) "UPDATE_LAYOUT_ANNOTATION" "LAYOUT_ANNOTATION" $annotation.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      id = $annotation.id
      text = $annotation.text
      posX = $annotation.pos_x
      posY = $annotation.pos_y
    }
  }
}

function New-MappingResponse($Mapping) {
  $unit = Get-TsdUnits | Where-Object { $_.id -eq $Mapping.unit_id } | Select-Object -First 1
  $camera = Get-Cameras | Where-Object { $_.id -eq $Mapping.camera_id } | Select-Object -First 1
  $preset = Get-Presets | Where-Object { $_.id -eq $Mapping.preset_id } | Select-Object -First 1
  return @{
    id = $Mapping.id
    unit = @{
      id = $unit.id
      externalUnitId = $unit.external_unit_id
      unitName = $unit.unit_name
      deviceType = $unit.device_type
    }
    camera = @{
      id = $camera.id
      name = $camera.name
      status = $camera.status
    }
    preset = @{
      id = $preset.id
      presetCode = $preset.preset_code
      presetName = $preset.preset_name
    }
    isActive = [bool]$Mapping.is_active
  }
}

function Validate-MappingPayload($Payload, [System.Net.HttpListenerResponse]$Response, [switch]$RequireIsActive) {
  if ($null -eq $Payload -or [string]::IsNullOrWhiteSpace([string]$Payload.unitId)) {
    Send-Error $Response 400 "VALIDATION_ERROR" "Unit is required"
    return $false
  }
  if ([string]::IsNullOrWhiteSpace([string]$Payload.cameraId)) {
    Send-Error $Response 400 "VALIDATION_ERROR" "Camera is required"
    return $false
  }
  if ([string]::IsNullOrWhiteSpace([string]$Payload.presetId)) {
    Send-Error $Response 400 "VALIDATION_ERROR" "Preset is required"
    return $false
  }
  if ($RequireIsActive -and $null -eq $Payload.isActive) {
    Send-Error $Response 400 "VALIDATION_ERROR" "isActive is required"
    return $false
  }
  return $true
}

function Handle-ListMappings([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $search = [string]$Context.Request.QueryString["search"]
  $cameraId = [string]$Context.Request.QueryString["cameraId"]
  $isActive = [string]$Context.Request.QueryString["isActive"]
  $deviceType = [string]$Context.Request.QueryString["deviceType"]
  $page = if ($Context.Request.QueryString["page"]) { [int]$Context.Request.QueryString["page"] } else { 1 }
  $pageSize = if ($Context.Request.QueryString["pageSize"]) { [int]$Context.Request.QueryString["pageSize"] } else { 20 }
  $room = Get-Room

  $items = @(Get-Mappings | Where-Object { $_.room_id -eq $room.id })
  if (-not [string]::IsNullOrWhiteSpace($cameraId)) {
    $items = @($items | Where-Object { $_.camera_id -eq $cameraId })
  }
  if (-not [string]::IsNullOrWhiteSpace($isActive)) {
    $flag = $isActive -eq "true"
    $items = @($items | Where-Object { [bool]$_.is_active -eq $flag })
  }
  if (-not [string]::IsNullOrWhiteSpace($deviceType)) {
    $items = @($items | Where-Object {
      $mapping = $_
      $unit = Get-TsdUnits | Where-Object { $_.id -eq $mapping.unit_id } | Select-Object -First 1
      $unit.device_type -eq $deviceType
    })
  }
  if (-not [string]::IsNullOrWhiteSpace($search)) {
    $normalized = $search.Trim().ToLowerInvariant()
    $items = @($items | Where-Object {
      $mapping = $_
      $unit = Get-TsdUnits | Where-Object { $_.id -eq $mapping.unit_id } | Select-Object -First 1
      $camera = Get-Cameras | Where-Object { $_.id -eq $mapping.camera_id } | Select-Object -First 1
      $preset = Get-Presets | Where-Object { $_.id -eq $mapping.preset_id } | Select-Object -First 1
      @($unit.external_unit_id, $unit.unit_name, $camera.name, $preset.preset_code, $preset.preset_name) |
        Where-Object { $null -ne $_ } |
        ForEach-Object { [string]$_ } |
        Where-Object { $_.ToLowerInvariant().Contains($normalized) } |
        Select-Object -First 1
    })
  }

  $responseItems = @($items | ForEach-Object { New-MappingResponse $_ })
  Send-Json $Context.Response 200 @{
    success = $true
    data = Get-PaginatedResult $responseItems $page $pageSize
  }
}

function Validate-MappingRelations([string]$UnitId, [string]$CameraId, [string]$PresetId, [switch]$CheckActiveConflict, [string]$IgnoreMappingId, [System.Net.HttpListenerResponse]$Response) {
  $room = Get-Room
  $unit = Get-TsdUnits | Where-Object { $_.id -eq $UnitId } | Select-Object -First 1
  $camera = Get-Cameras | Where-Object { $_.id -eq $CameraId } | Select-Object -First 1
  $preset = Get-Presets | Where-Object { $_.id -eq $PresetId } | Select-Object -First 1

  if ($null -eq $unit) {
    Send-Error $Response 404 "UNIT_NOT_FOUND" "Unit not found"
    return $null
  }
  if ($null -eq $camera) {
    Send-Error $Response 404 "CAMERA_NOT_FOUND" "Camera not found"
    return $null
  }
  if ($null -eq $preset) {
    Send-Error $Response 404 "PRESET_NOT_FOUND" "Preset not found"
    return $null
  }
  if ($unit.room_id -ne $room.id -or $camera.room_id -ne $room.id) {
    Send-Error $Response 422 "CROSS_ROOM_MAPPING_INVALID" "Mapping entities must belong to same room"
    return $null
  }
  if ($preset.camera_id -ne $camera.id) {
    Send-Error $Response 422 "PRESET_CAMERA_MISMATCH" "Selected preset does not belong to selected camera"
    return $null
  }
  if ($camera.status -ne "ACTIVE") {
    Send-Error $Response 422 "CAMERA_INACTIVE" "Selected camera is inactive"
    return $null
  }
  if ($CheckActiveConflict) {
    $activeConflict = Get-Mappings | Where-Object { $_.unit_id -eq $unit.id -and $_.is_active -and $_.id -ne $IgnoreMappingId } | Select-Object -First 1
    if ($null -ne $activeConflict) {
      Send-Error $Response 409 "ACTIVE_MAPPING_EXISTS" "Unit already has an active mapping"
      return $null
    }
  }
  return @{
    room = $room
    unit = $unit
    camera = $camera
    preset = $preset
  }
}

function Convert-TsdConfigToResponse($Config) {
  if ($null -eq $Config) {
    return $null
  }

  $status = if ($null -ne $Config.status -and -not [string]::IsNullOrWhiteSpace([string]$Config.status)) { [string]$Config.status } else { "ACTIVE" }
  return @{
    id = $Config.id
    roomId = $Config.room_id
    baseUrl = $Config.base_url
    username = $Config.username
    sseEndpoint = $Config.sse_endpoint
    status = $status
    lastTestResult = $Config.last_test_result
    lastTestAt = $Config.last_test_at
    createdAt = $Config.created_at
    updatedAt = $Config.updated_at
  }
}

function Convert-LayoutToResponse($Layout) {
  if ($null -eq $Layout) {
    return $null
  }

  return @{
    id = $Layout.id
    roomId = $Layout.room_id
    fileName = $Layout.file_name
    filePath = $Layout.file_path
    fileType = $Layout.file_type
    isActive = if ($null -ne $Layout.is_active) { [bool]$Layout.is_active } else { $true }
    width = $Layout.width
    height = $Layout.height
    createdAt = $Layout.created_at
    updatedAt = $Layout.updated_at
  }
}

function Handle-ConfigOverviewCrud([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }

  $room = Get-Room
  $config = Get-TsdConfig
  $isTsdConfigured = $null -ne $config -and (([string]$config.status) -ne "INACTIVE")
  $layout = Get-Layout
  $cameras = @(Get-Cameras)
  $mappings = @(Get-Mappings)
  $activeCameras = @($cameras | Where-Object { $_.status -eq "ACTIVE" })
  $activeMappings = @($mappings | Where-Object { [bool]$_.is_active })

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      room = @{
        id = $room.id
        name = $room.name
        operationMode = $room.operation_mode
      }
      tsdConnection = @{
        configured = $isTsdConfigured
        status = if ($isTsdConfigured) { if ($config.status) { $config.status } else { "ACTIVE" } } else { "INACTIVE" }
        lastTestResult = if ($isTsdConfigured) { $config.last_test_result } else { $null }
        lastTestAt = if ($isTsdConfigured) { $config.last_test_at } else { $null }
      }
      layout = @{
        configured = ($null -ne $layout)
        fileType = if ($null -ne $layout) { $layout.file_type } else { $null }
      }
      cameraSummary = @{
        total = $cameras.Count
        active = $activeCameras.Count
      }
      mappingSummary = @{
        total = $mappings.Count
        active = $activeMappings.Count
      }
    }
  }
}

function Protect-ConfigSecret([string]$PlainText) {
  if ([string]::IsNullOrWhiteSpace($PlainText)) {
    return $null
  }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($PlainText)
  return [Convert]::ToBase64String($bytes)
}

function Handle-GetCurrentTsdConfig([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }

  $config = Get-TsdConfig
  $isActive = $null -ne $config -and (([string]$config.status) -ne "INACTIVE")

  Send-Json $Context.Response 200 @{
    success = $true
    data = if ($isActive) { Convert-TsdConfigToResponse $config } else { $null }
  }
}

function Handle-CreateCrudTsdConfig([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }

  $payload = Read-JsonPayload $Context
  $baseUrl = if ($null -ne $payload.baseUrl) { ([string]$payload.baseUrl).Trim() } else { "" }
  $sseEndpoint = if ($null -ne $payload.sseEndpoint) { ([string]$payload.sseEndpoint).Trim() } else { "/api/event" }

  if ([string]::IsNullOrWhiteSpace($baseUrl)) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "Base URL is required"
    return
  }
  if ($null -ne $payload.sseEndpoint -and [string]::IsNullOrWhiteSpace($sseEndpoint)) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "SSE endpoint must not be empty"
    return
  }

  $existing = Get-TsdConfig
  if ($null -ne $existing -and (([string]$existing.status) -ne "INACTIVE")) {
    Send-Error $Context.Response 409 "TSD_CONFIG_ALREADY_EXISTS" "An active TS-D1000 configuration already exists"
    return
  }

  $room = Get-Room
  $now = Get-NowUtcString
  $config = [pscustomobject]@{
    id = New-Id
    room_id = $room.id
    base_url = $baseUrl
    username = if ($null -ne $payload.username -and -not [string]::IsNullOrWhiteSpace([string]$payload.username)) { ([string]$payload.username).Trim() } else { $null }
    password_encrypted = Protect-ConfigSecret ([string]$payload.password)
    sse_endpoint = if ([string]::IsNullOrWhiteSpace($sseEndpoint)) { "/api/event" } else { $sseEndpoint }
    status = "ACTIVE"
    last_test_result = $null
    last_test_at = $null
    created_at = $now
    updated_at = $now
  }

  Save-TsdConfig $config
  Add-AuditLog ([guid]$auth.user.id) "CREATE_TSD_CONFIG" "TSD_CONFIG" $config.id "SUCCESS" @{ roomId = $room.id }
  Send-Json $Context.Response 200 @{
    success = $true
    data = Convert-TsdConfigToResponse $config
  }
}

function Handle-UpdateCrudTsdConfig([System.Net.HttpListenerContext]$Context, [string]$ConfigId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }

  $config = Get-TsdConfig
  if ($null -eq $config -or $config.id -ne $ConfigId) {
    Send-Error $Context.Response 404 "TSD_CONFIG_NOT_FOUND" "TS-D1000 configuration not found"
    return
  }

  $payload = Read-JsonPayload $Context
  $baseUrl = if ($null -ne $payload.baseUrl) { ([string]$payload.baseUrl).Trim() } else { "" }
  $sseEndpoint = if ($null -ne $payload.sseEndpoint) { ([string]$payload.sseEndpoint).Trim() } else { "/api/event" }

  if ([string]::IsNullOrWhiteSpace($baseUrl)) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "Base URL is required"
    return
  }
  if ($null -ne $payload.sseEndpoint -and [string]::IsNullOrWhiteSpace($sseEndpoint)) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "SSE endpoint must not be empty"
    return
  }

  $config.base_url = $baseUrl
  $config.username = if ($null -ne $payload.username -and -not [string]::IsNullOrWhiteSpace([string]$payload.username)) { ([string]$payload.username).Trim() } else { $null }
  if ($null -ne $payload.password -and -not [string]::IsNullOrWhiteSpace([string]$payload.password)) {
    $config.password_encrypted = Protect-ConfigSecret ([string]$payload.password)
  }
  $config.sse_endpoint = if ([string]::IsNullOrWhiteSpace($sseEndpoint)) { "/api/event" } else { $sseEndpoint }
  if ($null -eq $config.status -or [string]::IsNullOrWhiteSpace([string]$config.status)) {
    $config.status = "ACTIVE"
  }
  $config.updated_at = Get-NowUtcString

  Save-TsdConfig $config
  Add-AuditLog ([guid]$auth.user.id) "UPDATE_TSD_CONFIG" "TSD_CONFIG" $config.id "SUCCESS" @{ roomId = $config.room_id }
  Send-Json $Context.Response 200 @{
    success = $true
    data = Convert-TsdConfigToResponse $config
  }
}

function Handle-DeactivateCrudTsdConfig([System.Net.HttpListenerContext]$Context, [string]$ConfigId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }

  $config = Get-TsdConfig
  if ($null -eq $config -or $config.id -ne $ConfigId) {
    Send-Error $Context.Response 404 "TSD_CONFIG_NOT_FOUND" "TS-D1000 configuration not found"
    return
  }

  $status = if ($null -ne $config.status -and -not [string]::IsNullOrWhiteSpace([string]$config.status)) { [string]$config.status } else { "ACTIVE" }
  if ($status -eq "INACTIVE") {
    Send-Error $Context.Response 409 "INVALID_TSD_CONFIG_STATE" "TS-D1000 configuration is already inactive"
    return
  }

  $config.status = "INACTIVE"
  $config.updated_at = Get-NowUtcString
  Save-TsdConfig $config
  Add-AuditLog ([guid]$auth.user.id) "DEACTIVATE_TSD_CONFIG" "TSD_CONFIG" $config.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      id = $config.id
      status = $config.status
      updatedAt = $config.updated_at
    }
  }
}

function Handle-GetCurrentLayout([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }

  Send-Json $Context.Response 200 @{
    success = $true
    data = Convert-LayoutToResponse (Get-Layout)
  }
}

function Handle-DeletePreset([System.Net.HttpListenerContext]$Context, [string]$PresetId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }

  $presets = @(Get-Presets)
  $preset = $presets | Where-Object { $_.id -eq $PresetId } | Select-Object -First 1
  if ($null -eq $preset) {
    Send-Error $Context.Response 404 "PRESET_NOT_FOUND" "Preset not found"
    return
  }

  $activeMapping = Get-Mappings | Where-Object { $_.preset_id -eq $PresetId -and [bool]$_.is_active } | Select-Object -First 1
  if ($null -ne $activeMapping) {
    Send-Error $Context.Response 422 "PRESET_ALREADY_IN_USE" "This preset is used by active mappings and cannot be deleted."
    return
  }

  $remaining = @($presets | Where-Object { $_.id -ne $PresetId })
  Save-Presets $remaining
  Add-AuditLog ([guid]$auth.user.id) "DELETE_PRESET" "CAMERA_PRESET" $PresetId "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      id = $PresetId
      deleted = $true
    }
  }
}

function Handle-DeactivateMapping([System.Net.HttpListenerContext]$Context, [string]$MappingId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }

  $mappings = @(Get-Mappings)
  $mapping = $mappings | Where-Object { $_.id -eq $MappingId } | Select-Object -First 1
  if ($null -eq $mapping) {
    Send-Error $Context.Response 404 "MAPPING_NOT_FOUND" "Mapping not found"
    return
  }
  if (-not [bool]$mapping.is_active) {
    Send-Error $Context.Response 409 "INVALID_MAPPING_STATE" "Mapping is already inactive"
    return
  }

  $mapping.is_active = $false
  $mapping.updated_at = Get-NowUtcString
  Save-Mappings $mappings
  Add-AuditLog ([guid]$auth.user.id) "DEACTIVATE_MAPPING" "MIC_CAMERA_MAPPING" $mapping.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = New-MappingResponse $mapping
  }
}

function Handle-CreateMapping([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $payload = Read-JsonPayload $Context
  if (-not (Validate-MappingPayload $payload $Context.Response)) { return }
  $relation = Validate-MappingRelations ([string]$payload.unitId) ([string]$payload.cameraId) ([string]$payload.presetId) -CheckActiveConflict -Response $Context.Response
  if ($null -eq $relation) { return }

  $mappings = @(Get-Mappings)
  $mapping = [pscustomobject]@{
    id = New-Id
    room_id = $relation.room.id
    unit_id = $relation.unit.id
    camera_id = $relation.camera.id
    preset_id = $relation.preset.id
    is_active = $true
    created_at = Get-NowUtcString
    updated_at = Get-NowUtcString
  }
  $mappings += $mapping
  Save-Mappings $mappings
  Add-AuditLog ([guid]$auth.user.id) "CREATE_MAPPING" "MIC_CAMERA_MAPPING" $mapping.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = New-MappingResponse $mapping
  }
}

function Handle-UpdateMapping([System.Net.HttpListenerContext]$Context, [string]$MappingId) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $payload = Read-JsonPayload $Context
  if (-not (Validate-MappingPayload $payload $Context.Response -RequireIsActive)) { return }
  $mappings = @(Get-Mappings)
  $mapping = $mappings | Where-Object { $_.id -eq $MappingId } | Select-Object -First 1
  if ($null -eq $mapping) {
    Send-Error $Context.Response 404 "MAPPING_NOT_FOUND" "Mapping not found"
    return
  }
  $relation = Validate-MappingRelations $mapping.unit_id ([string]$payload.cameraId) ([string]$payload.presetId) -CheckActiveConflict:([bool]$payload.isActive) -IgnoreMappingId $mapping.id -Response $Context.Response
  if ($null -eq $relation) { return }

  $mapping.camera_id = $relation.camera.id
  $mapping.preset_id = $relation.preset.id
  $mapping.is_active = [bool]$payload.isActive
  $mapping.updated_at = Get-NowUtcString
  Save-Mappings $mappings
  Add-AuditLog ([guid]$auth.user.id) "UPDATE_MAPPING" "MIC_CAMERA_MAPPING" $mapping.id "SUCCESS" @{}
  Send-Json $Context.Response 200 @{
    success = $true
    data = New-MappingResponse $mapping
  }
}

function Handle-GetMode([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $room = Get-Room
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      mode = $room.operation_mode
    }
  }
}

function Handle-UpdateMode([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $payload = Read-JsonPayload $Context
  if ($null -eq $payload -or @("MANUAL", "AUTOMATIC") -notcontains [string]$payload.mode) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "Mode is required"
    return
  }
  $room = Get-Room
  $room.operation_mode = [string]$payload.mode
  Save-Room $room
  Add-AuditLog ([guid]$auth.user.id) "UPDATE_MODE" "ROOM" $room.id "SUCCESS" @{ mode = $room.operation_mode }
  Handle-GetMode $Context
}

function Handle-GetRuntimeMode([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }
  $room = Get-Room
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      roomId = $room.id
      mode = $room.operation_mode
    }
  }
}

function Handle-UpdateRuntimeMode([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }

  $payload = Read-JsonPayload $Context
  if ($null -eq $payload -or @("MANUAL", "AUTOMATIC") -notcontains [string]$payload.mode) {
    Send-Error $Context.Response 400 "VALIDATION_ERROR" "Mode is required"
    return
  }

  $room = Get-Room
  $room.operation_mode = [string]$payload.mode
  Save-Room $room
  Add-AuditLog ([guid]$auth.user.id) "UPDATE_MODE" "ROOM" $room.id "SUCCESS" @{ mode = $room.operation_mode }
  Handle-GetRuntimeMode $Context
}

function Handle-GetRuntimeModeSwitchImpact([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }

  $snap = Compute-RuntimeSnapshot
  $hasActiveSpeakers = (@($snap.activeSpeakers)).Count -gt 0
  $hasPendingRequests = (@($snap.pendingRequests)).Count -gt 0
  $warning = if ($hasActiveSpeakers -or $hasPendingRequests) {
    "There are active speakers or pending requests. Switching mode may affect the current speaking session."
  } else {
    $null
  }

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      hasActiveSpeakers = $hasActiveSpeakers
      hasPendingRequests = $hasPendingRequests
      warningMessage = $warning
    }
  }
}

function Handle-ReadinessCheck([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }
  $room = Get-Room
  $config = Get-TsdConfig
  if ($null -ne $config -and ([string]$config.status) -eq "INACTIVE") {
    $config = $null
  }
  $units = @(Get-TsdUnits)
  $cameras = @(Get-Cameras)
  $activeCameras = @($cameras | Where-Object { $_.status -eq "ACTIVE" })
  $layout = Get-Layout
  $mappings = @(Get-Mappings | Where-Object { $_.is_active })

  $items = @()
  if ($null -eq $config) {
    $items += @{ category = "TSD"; status = "FAILED"; message = "TS-D1000 connection is not configured" }
  } elseif ($config.last_test_result -eq "SUCCESS") {
    $items += @{ category = "TSD"; status = "PASSED"; message = "TS-D1000 connection is configured and test passed" }
  } else {
    $items += @{ category = "TSD"; status = "WARNING"; message = "TS-D1000 connection is configured but should be tested again" }
  }

  if ($activeCameras.Count -gt 0) {
    $items += @{ category = "CAMERA"; status = "PASSED"; message = "$($activeCameras.Count) active camera(s) configured" }
  } else {
    $items += @{ category = "CAMERA"; status = "FAILED"; message = "No active camera configured" }
  }

  if ($null -ne $layout) {
    $items += @{ category = "LAYOUT"; status = "PASSED"; message = "Layout exists" }
  } else {
    $items += @{ category = "LAYOUT"; status = "FAILED"; message = "Layout is missing" }
  }

  if ($units.Count -eq 0) {
    $items += @{ category = "MAPPING"; status = "WARNING"; message = "No units have been synced yet" }
  } elseif ($mappings.Count -lt $units.Count) {
    $items += @{ category = "MAPPING"; status = "WARNING"; message = "$($units.Count - $mappings.Count) units do not have active mapping" }
  } else {
    $items += @{ category = "MAPPING"; status = "PASSED"; message = "All synced units have active mappings" }
  }

  $items += @{ category = "MODE"; status = "PASSED"; message = "Operation mode is $($room.operation_mode)" }

  $overall = if ($items | Where-Object { $_.status -eq "FAILED" } | Select-Object -First 1) {
    "FAILED"
  } elseif ($items | Where-Object { $_.status -eq "WARNING" } | Select-Object -First 1) {
    "WARNING"
  } else {
    "PASSED"
  }

  Add-AuditLog ([guid]$auth.user.id) "RUN_READINESS_CHECK" "ROOM" $room.id "SUCCESS" @{ overallStatus = $overall }
  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      overallStatus = $overall
      items = $items
    }
  }
}

function Parse-QueryString([string]$Query) {
  $result = @{}
  if ([string]::IsNullOrWhiteSpace($Query)) {
    return $result
  }

  $trimmed = $Query.TrimStart("?")
  if ([string]::IsNullOrWhiteSpace($trimmed)) {
    return $result
  }

  foreach ($pair in $trimmed.Split("&")) {
    if ([string]::IsNullOrWhiteSpace($pair)) { continue }
    $parts = $pair.Split("=", 2)
    $key = [uri]::UnescapeDataString($parts[0])
    $value = if ($parts.Length -gt 1) { [uri]::UnescapeDataString($parts[1]) } else { "" }
    if (-not [string]::IsNullOrWhiteSpace($key)) {
      $result[$key] = $value
    }
  }

  return $result
}

function Handle-GetRuntimeSnapshot([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }

  Send-Json $Context.Response 200 @{
    success = $true
    data = (Compute-RuntimeSnapshot)
  }
}

function Handle-ListRuntimeRequests([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }

  $query = Parse-QueryString $Context.Request.Url.Query
  $status = if ($query.ContainsKey("status")) { ([string]$query["status"]).Trim() } else { "" }
  $pageRaw = if ($query.ContainsKey("page")) { ([string]$query["page"]).Trim() } else { "" }
  $pageSizeRaw = if ($query.ContainsKey("pageSize")) { ([string]$query["pageSize"]).Trim() } else { "" }

  $page = 1
  $pageSize = 20
  if (-not [string]::IsNullOrWhiteSpace($pageRaw)) {
    if (-not [int]::TryParse($pageRaw, [ref]$page) -or $page -lt 1) {
      Send-Error $Context.Response 400 "VALIDATION_ERROR" "page must be >= 1"
      return
    }
  }
  if (-not [string]::IsNullOrWhiteSpace($pageSizeRaw)) {
    if (-not [int]::TryParse($pageSizeRaw, [ref]$pageSize) -or $pageSize -lt 1 -or $pageSize -gt 100) {
      Send-Error $Context.Response 400 "VALIDATION_ERROR" "pageSize must be between 1 and 100"
      return
    }
  }

  $requests = @(Get-SpeakingRequests)
  if (-not [string]::IsNullOrWhiteSpace($status)) {
    $valid = @("PENDING", "APPROVED", "REJECTED", "CANCELLED")
    if (-not ($valid -contains $status)) {
      Send-Error $Context.Response 400 "VALIDATION_ERROR" "status is invalid"
      return
    }
    $requests = @($requests | Where-Object { $_.status -eq $status })
  }

  $requests = @(
    $requests |
      Sort-Object -Property @{ Expression = { if ($null -ne $_.created_at) { $_.created_at } else { "" } } }, @{ Expression = { $_.id } }
  )

  $pageResult = Get-PaginatedResult $requests $page $pageSize
  $items = @(
    $pageResult.items | ForEach-Object {
      @{
        id = $_.id
        unitId = $_.unit_id
        status = $_.status
        createdAt = $_.created_at
        updatedAt = $_.updated_at
        handledBy = $_.handled_by
      }
    }
  )

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      items = $items
      pagination = $pageResult.pagination
    }
  }
}

function Upsert-RuntimeUnitState([string]$UnitId, [string]$State) {
  $now = Get-NowUtcString
  $items = @(Get-RuntimeUnitsState)
  $existing = $items | Where-Object { $_.unit_id -eq $UnitId } | Select-Object -First 1
  if ($null -eq $existing) {
    $items = @(
      $items + [pscustomobject]@{
        id = New-Id
        unit_id = $UnitId
        state = $State
        last_event_at = $now
      }
    )
  }
  else {
    foreach ($item in $items) {
      if ($item.unit_id -eq $UnitId) {
        $item.state = $State
        $item.last_event_at = $now
      }
    }
  }
  Save-RuntimeUnitsState $items
}

function Handle-ApproveRuntimeRequest([System.Net.HttpListenerContext]$Context, [string]$RequestId) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }

  if ((Get-CurrentOperationMode) -ne "MANUAL") {
    Send-Error $Context.Response 422 "MANUAL_MODE_REQUIRED" "Manual mode is required"
    return
  }

  $requests = @(Get-SpeakingRequests)
  $req = $requests | Where-Object { $_.id -eq $RequestId } | Select-Object -First 1
  if ($null -eq $req) {
    Send-Error $Context.Response 404 "REQUEST_NOT_FOUND" "Request not found"
    return
  }
  if ($req.status -ne "PENDING") {
    Send-Error $Context.Response 422 "REQUEST_NOT_PENDING" "Request is not in pending state"
    return
  }

  $now = Get-NowUtcString
  $req.status = "APPROVED"
  $req.handled_by = $auth.user.id
  $req.updated_at = $now

  $updated = @(
    foreach ($item in $requests) {
      if ($item.id -eq $RequestId) { $req } else { $item }
    }
  )
  Save-SpeakingRequests $updated
  Add-AuditLog ([guid]$auth.user.id) "APPROVE_SPEAKING_REQUEST" "SPEAKING_REQUEST" $RequestId "SUCCESS" @{}

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      requestId = $RequestId
      status = "APPROVED"
      actedAt = $now
    }
  }
}

function Handle-RejectRuntimeRequest([System.Net.HttpListenerContext]$Context, [string]$RequestId) {
  $auth = Get-AuthOrSend $Context
  if ($null -eq $auth) { return }

  if ((Get-CurrentOperationMode) -ne "MANUAL") {
    Send-Error $Context.Response 422 "MANUAL_MODE_REQUIRED" "Manual mode is required"
    return
  }

  $requests = @(Get-SpeakingRequests)
  $req = $requests | Where-Object { $_.id -eq $RequestId } | Select-Object -First 1
  if ($null -eq $req) {
    Send-Error $Context.Response 404 "REQUEST_NOT_FOUND" "Request not found"
    return
  }
  if ($req.status -ne "PENDING") {
    Send-Error $Context.Response 422 "REQUEST_NOT_PENDING" "Request is not in pending state"
    return
  }

  $now = Get-NowUtcString
  $req.status = "REJECTED"
  $req.handled_by = $auth.user.id
  $req.updated_at = $now

  $updated = @(
    foreach ($item in $requests) {
      if ($item.id -eq $RequestId) { $req } else { $item }
    }
  )
  Save-SpeakingRequests $updated
  Upsert-RuntimeUnitState $req.unit_id "IDLE"
  Add-AuditLog ([guid]$auth.user.id) "REJECT_SPEAKING_REQUEST" "SPEAKING_REQUEST" $RequestId "SUCCESS" @{}

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      requestId = $RequestId
      status = "REJECTED"
      actedAt = $now
    }
  }
}

function Test-WorkerRunning([int]$Pid) {
  if ($Pid -le 0) { return $false }
  try {
    [void](Get-Process -Id $Pid -ErrorAction Stop)
    return $true
  }
  catch {
    return $false
  }
}

function Handle-InternalRuntimeStart([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }

  $info = Get-RuntimeWorkerInfo
  if ($null -ne $info -and $null -ne $info.pid -and (Test-WorkerRunning ([int]$info.pid))) {
    $snapshot = Compute-RuntimeSnapshot
    Send-Json $Context.Response 200 @{
      success = $true
      data = @{
        started = $true
        sseStatus = $snapshot.sseStatus
      }
    }
    return
  }

  $psExe = Join-Path $env:SystemRoot "System32\\WindowsPowerShell\\v1.0\\powershell.exe"
  $workerPath = Join-Path $PSScriptRoot "runtime-worker.ps1"
  if (-not (Test-Path -LiteralPath $workerPath)) {
    Send-Error $Context.Response 500 "SYSTEM_ERROR" "Runtime worker script is missing"
    return
  }

  $stdout = Join-Path $Script:DataDir "runtime-worker.log"
  $stderr = Join-Path $Script:DataDir "runtime-worker.err.log"
  $args = @(
    "-NoLogo",
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $workerPath,
    "-RootDir", $Script:Root
  )

  $proc = Start-Process -FilePath $psExe -ArgumentList $args -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -WindowStyle Hidden
  Save-RuntimeWorkerInfo ([pscustomobject]@{
    pid = $proc.Id
    startedAt = Get-NowUtcString
  })

  $state = Get-RuntimeRoomState
  $state.sse_status = "RECONNECTING"
  Save-RuntimeRoomState $state

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      started = $true
      sseStatus = $state.sse_status
    }
  }
}

function Handle-InternalRuntimeStop([System.Net.HttpListenerContext]$Context) {
  $auth = Get-AuthOrSend $Context
  if (-not (Require-AdminOrSend $Context $auth)) { return }

  $info = Get-RuntimeWorkerInfo
  if ($null -ne $info -and $null -ne $info.pid -and (Test-WorkerRunning ([int]$info.pid))) {
    try { Stop-Process -Id ([int]$info.pid) -Force -ErrorAction Stop } catch { }
  }

  Save-RuntimeWorkerInfo $null
  $state = Get-RuntimeRoomState
  $state.sse_status = "DISCONNECTED"
  Save-RuntimeRoomState $state

  Send-Json $Context.Response 200 @{
    success = $true
    data = @{
      stopped = $true
      sseStatus = $state.sse_status
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
# Bind to both IPv4/IPv6 loopback variants to avoid "localhost -> ::1" connection refused issues.
foreach ($prefix in @(
    "http://localhost:$Port/",
    "http://127.0.0.1:$Port/",
    "http://[::1]:$Port/"
  )) {
  try {
    $listener.Prefixes.Add($prefix)
  } catch {
    # Some environments don't support IPv6 prefix; best effort.
  }
}
$listener.Start()

Write-Host "TS-D1000 demo server is running at http://localhost:$Port/"
Write-Host "Seed users:"
Write-Host "  admin / Admin123!"
Write-Host "  operator / Operator123!"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.AbsolutePath
    $method = $context.Request.HttpMethod.ToUpperInvariant()

    try {
      if ($method -eq "POST" -and $path -eq "/api/v1/auth/login") { Handle-Login $context; continue }
      if ($method -eq "POST" -and $path -eq "/api/v1/auth/logout") { Handle-Logout $context; continue }
      if ($method -eq "GET" -and $path -eq "/api/v1/auth/me") { Handle-AuthMe $context; continue }
      if ($method -eq "GET" -and $path -eq "/api/v1/health") { Handle-Health $context; continue }

      if ($method -eq "GET" -and $path -eq "/api/v1/config/overview") { Handle-ConfigOverviewCrud $context; continue }
      if ($method -eq "GET" -and $path -eq "/api/v1/config/tsd/current") { Handle-GetCurrentTsdConfig $context; continue }
      if ($method -eq "GET" -and $path -eq "/api/v1/config/tsd") { Handle-GetTsdConfig $context; continue }
      if ($method -eq "POST" -and $path -eq "/api/v1/config/tsd") { Handle-CreateCrudTsdConfig $context; continue }
      if ($method -eq "PUT" -and $path -match "^/api/v1/config/tsd/([^/]+)$") { Handle-UpdateCrudTsdConfig $context $Matches[1]; continue }
      if ($method -eq "PATCH" -and $path -match "^/api/v1/config/tsd/([^/]+)/deactivate$") { Handle-DeactivateCrudTsdConfig $context $Matches[1]; continue }
      if ($method -eq "POST" -and $path -match "^/api/v1/config/tsd/([^/]+)/test$") { Handle-TestTsdConfig $context $Matches[1]; continue }
      if ($method -eq "POST" -and $path -match "^/api/v1/config/tsd/([^/]+)/sync-units$") { Handle-SyncTsdUnits $context $Matches[1]; continue }
      if ($method -eq "GET" -and $path -match "^/api/v1/config/tsd/([^/]+)/units$") { Handle-ListUnits $context $Matches[1]; continue }

      if ($method -eq "GET" -and $path -eq "/api/v1/config/cameras") { Handle-ListCameras $context; continue }
      if ($method -eq "POST" -and $path -eq "/api/v1/config/cameras") { Handle-CreateCamera $context; continue }
      if ($method -eq "GET" -and $path -match "^/api/v1/config/cameras/([^/]+)$") { Handle-GetCamera $context $Matches[1]; continue }
      if ($method -eq "PUT" -and $path -match "^/api/v1/config/cameras/([^/]+)$") { Handle-UpdateCamera $context $Matches[1]; continue }
      if ($method -eq "PATCH" -and $path -match "^/api/v1/config/cameras/([^/]+)/deactivate$") { Handle-DeactivateCamera $context $Matches[1]; continue }
      if ($method -eq "POST" -and $path -match "^/api/v1/config/cameras/([^/]+)/test$") { Handle-TestCamera $context $Matches[1]; continue }
      if ($method -eq "GET" -and $path -match "^/api/v1/config/cameras/([^/]+)/presets$") { Handle-ListPresets $context $Matches[1]; continue }
      if ($method -eq "POST" -and $path -match "^/api/v1/config/cameras/([^/]+)/presets$") { Handle-CreatePreset $context $Matches[1]; continue }
      if ($method -eq "PUT" -and $path -match "^/api/v1/config/presets/([^/]+)$") { Handle-UpdatePreset $context $Matches[1]; continue }
      if ($method -eq "DELETE" -and $path -match "^/api/v1/config/presets/([^/]+)$") { Handle-DeletePreset $context $Matches[1]; continue }

      if ($method -eq "GET" -and $path -eq "/api/v1/config/layout/current") { Handle-GetCurrentLayout $context; continue }
      if ($method -eq "GET" -and $path -eq "/api/v1/config/layout") { Handle-GetLayout $context; continue }
      if ($method -eq "POST" -and $path -eq "/api/v1/config/layout") { Handle-UploadLayout $context; continue }
      if ($method -eq "PUT" -and $path -match "^/api/v1/config/layout/([^/]+)/replace$") { Handle-UploadLayout $context; continue }
      if ($method -eq "GET" -and $path -eq "/api/v1/config/layout/devices") { Handle-ListLayoutDevices $context; continue }
      if ($method -eq "PUT" -and $path -eq "/api/v1/config/layout/devices") { Handle-SaveLayoutDevices $context; continue }
      if ($method -eq "GET" -and $path -eq "/api/v1/config/layout/annotations") { Handle-ListAnnotations $context; continue }
      if ($method -eq "POST" -and $path -eq "/api/v1/config/layout/annotations") { Handle-CreateAnnotation $context; continue }
      if ($method -eq "PUT" -and $path -match "^/api/v1/config/layout/annotations/([^/]+)$") { Handle-UpdateAnnotation $context $Matches[1]; continue }

      if ($method -eq "GET" -and $path -eq "/api/v1/config/mappings") { Handle-ListMappings $context; continue }
      if ($method -eq "POST" -and $path -eq "/api/v1/config/mappings") { Handle-CreateMapping $context; continue }
      if ($method -eq "PUT" -and $path -match "^/api/v1/config/mappings/([^/]+)$") { Handle-UpdateMapping $context $Matches[1]; continue }
      if ($method -eq "PATCH" -and $path -match "^/api/v1/config/mappings/([^/]+)/deactivate$") { Handle-DeactivateMapping $context $Matches[1]; continue }

      if ($method -eq "GET" -and $path -eq "/api/v1/config/mode") { Handle-GetMode $context; continue }
      if ($method -eq "PUT" -and $path -eq "/api/v1/config/mode") { Handle-UpdateMode $context; continue }
      if ($method -eq "POST" -and $path -eq "/api/v1/config/readiness/check") { Handle-ReadinessCheck $context; continue }

      if ($method -eq "GET" -and $path -eq "/api/v1/runtime/mode") { Handle-GetRuntimeMode $context; continue }
      if ($method -eq "PUT" -and $path -eq "/api/v1/runtime/mode") { Handle-UpdateRuntimeMode $context; continue }
      if ($method -eq "GET" -and $path -eq "/api/v1/runtime/mode/switch-impact") { Handle-GetRuntimeModeSwitchImpact $context; continue }

      if ($method -eq "GET" -and $path -eq "/api/v1/runtime/snapshot") { Handle-GetRuntimeSnapshot $context; continue }
      if ($method -eq "GET" -and $path -eq "/api/v1/runtime/requests") { Handle-ListRuntimeRequests $context; continue }
      if ($method -eq "POST" -and $path -match "^/api/v1/runtime/requests/([^/]+)/approve$") { Handle-ApproveRuntimeRequest $context $Matches[1]; continue }
      if ($method -eq "POST" -and $path -match "^/api/v1/runtime/requests/([^/]+)/reject$") { Handle-RejectRuntimeRequest $context $Matches[1]; continue }

      if ($method -eq "POST" -and $path -eq "/internal/runtime/start") { Handle-InternalRuntimeStart $context; continue }
      if ($method -eq "POST" -and $path -eq "/internal/runtime/stop") { Handle-InternalRuntimeStop $context; continue }

      Handle-Static $context
      continue
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
