param(
  [Parameter(Mandatory = $true)]
  [string]$RootDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$DataDir = Join-Path $RootDir "data"
$RoomPath = Join-Path $DataDir "room.json"
$TsdConfigPath = Join-Path $DataDir "tsd-config.json"
$TsdUnitsPath = Join-Path $DataDir "tsd-units.json"
$CamerasPath = Join-Path $DataDir "cameras.json"
$PresetsPath = Join-Path $DataDir "camera-presets.json"
$MappingsPath = Join-Path $DataDir "mic-camera-mappings.json"
$RuntimeRoomStatePath = Join-Path $DataDir "runtime-room-state.json"
$RuntimeUnitsStatePath = Join-Path $DataDir "runtime-units-state.json"
$SpeakingRequestsPath = Join-Path $DataDir "speaking-requests.json"
$RuntimeEventsPath = Join-Path $DataDir "runtime-events.json"
$RuntimeCameraLogsPath = Join-Path $DataDir "runtime-camera-logs.json"

$AntiJitterMs = 2000

function Read-JsonArray([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return @() }
  $raw = Get-Content -LiteralPath $Path -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
  $parsed = $raw | ConvertFrom-Json
  if ($parsed -is [System.Array]) { return @($parsed) }
  return @($parsed)
}

function Write-JsonArray([string]$Path, [object[]]$Items) {
  $Items | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Read-JsonObject([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $raw = Get-Content -LiteralPath $Path -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
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

function New-Id {
  return [guid]::NewGuid().ToString()
}

function Ensure-RuntimeState {
  if (-not (Test-Path -LiteralPath $RuntimeUnitsStatePath)) { Write-JsonArray $RuntimeUnitsStatePath @() }
  if (-not (Test-Path -LiteralPath $SpeakingRequestsPath)) { Write-JsonArray $SpeakingRequestsPath @() }
  if (-not (Test-Path -LiteralPath $RuntimeEventsPath)) { Write-JsonArray $RuntimeEventsPath @() }
  if (-not (Test-Path -LiteralPath $RuntimeCameraLogsPath)) { Write-JsonArray $RuntimeCameraLogsPath @() }
  if (-not (Test-Path -LiteralPath $RuntimeRoomStatePath)) {
    $room = Read-JsonObject $RoomPath
    $now = Get-NowUtcString
    Write-JsonObject $RuntimeRoomStatePath ([pscustomobject][ordered]@{
      room_id = if ($null -ne $room) { $room.id } else { "room-001" }
      operation_mode = if ($null -ne $room) { $room.operation_mode } else { "MANUAL" }
      active_speakers = @()
      pending_requests = @()
      current_camera_target = $null
      sse_status = "DISCONNECTED"
      last_camera_switch_at = $null
      updated_at = $now
    })
  }
}

function Set-SseStatus([string]$Status) {
  $state = Read-JsonObject $RuntimeRoomStatePath
  if ($null -eq $state) { return }
  $state.sse_status = $Status
  $state.updated_at = Get-NowUtcString
  Write-JsonObject $RuntimeRoomStatePath $state
}

function Resolve-UnitByExternalId([string]$ExternalUnitId) {
  if ([string]::IsNullOrWhiteSpace($ExternalUnitId)) { return $null }
  $units = @(Read-JsonArray $TsdUnitsPath)
  return ($units | Where-Object { $_.external_unit_id -eq $ExternalUnitId } | Select-Object -First 1)
}

function Upsert-RuntimeUnitState([string]$UnitId, [string]$State) {
  if ([string]::IsNullOrWhiteSpace($UnitId)) { return }
  $now = Get-NowUtcString
  $items = @(Read-JsonArray $RuntimeUnitsStatePath)
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
  } else {
    foreach ($item in $items) {
      if ($item.unit_id -eq $UnitId) {
        $item.state = $State
        $item.last_event_at = $now
      }
    }
  }
  Write-JsonArray $RuntimeUnitsStatePath $items
}

function Add-RuntimeEvent([string]$EventType, [string]$ExternalUnitId, $Payload, [string]$Status, [string]$ErrorMessage) {
  $now = Get-NowUtcString
  $events = @(Read-JsonArray $RuntimeEventsPath)
  $events = @(
    $events + [pscustomobject]@{
      id = New-Id
      event_type = $EventType
      external_unit_id = $ExternalUnitId
      payload = $Payload
      occurred_at = $now
      processed_at = $now
      status = $Status
      error_message = $ErrorMessage
    }
  )
  # keep a small tail to avoid unbounded growth in demo
  if ($events.Count -gt 500) {
    $events = @($events | Select-Object -Last 500)
  }
  Write-JsonArray $RuntimeEventsPath $events
}

function Create-PendingRequest([string]$UnitId) {
  $requests = @(Read-JsonArray $SpeakingRequestsPath)
  $existing = $requests | Where-Object { $_.unit_id -eq $UnitId -and $_.status -eq "PENDING" } | Select-Object -First 1
  if ($null -ne $existing) { return }

  $now = Get-NowUtcString
  $requests = @(
    $requests + [pscustomobject]@{
      id = New-Id
      unit_id = $UnitId
      status = "PENDING"
      created_at = $now
      updated_at = $now
      handled_by = $null
    }
  )
  Write-JsonArray $SpeakingRequestsPath $requests
}

function Trigger-CameraForUnit([string]$UnitId) {
  $mappings = @(Read-JsonArray $MappingsPath | Where-Object { [bool]$_.is_active })
  $mapping = $mappings | Where-Object { $_.unit_id -eq $UnitId } | Select-Object -First 1
  if ($null -eq $mapping) { return }

  $cameras = @(Read-JsonArray $CamerasPath)
  $camera = $cameras | Where-Object { $_.id -eq $mapping.camera_id } | Select-Object -First 1
  if ($null -eq $camera -or $camera.status -ne "ACTIVE") { return }

  $presets = @(Read-JsonArray $PresetsPath)
  $preset = $presets | Where-Object { $_.id -eq $mapping.preset_id -and $_.camera_id -eq $camera.id } | Select-Object -First 1
  if ($null -eq $preset) { return }

  $state = Read-JsonObject $RuntimeRoomStatePath
  if ($null -eq $state) { return }

  $now = Get-Date -AsUTC
  $last = $null
  if ($null -ne $state.last_camera_switch_at -and -not [string]::IsNullOrWhiteSpace([string]$state.last_camera_switch_at)) {
    try { $last = [datetime]$state.last_camera_switch_at } catch { $last = $null }
  }

  $result = "SUCCESS"
  $reason = $null
  if ($null -ne $last) {
    $delta = ($now - $last).TotalMilliseconds
    if ($delta -lt $AntiJitterMs) {
      $result = "SKIPPED"
      $reason = "ANTI_JITTER"
    }
  }

  if ($result -eq "SUCCESS") {
    $state.current_camera_target = @{
      unitId = $UnitId
      cameraId = $camera.id
      presetId = $preset.id
    }
    $state.last_camera_switch_at = $now.ToString("o")
    $state.updated_at = Get-NowUtcString
    Write-JsonObject $RuntimeRoomStatePath $state
  }

  $logs = @(Read-JsonArray $RuntimeCameraLogsPath)
  $logs = @(
    $logs + [pscustomobject]@{
      id = New-Id
      unit_id = $UnitId
      camera_id = $camera.id
      preset_id = $preset.id
      triggered_at = Get-NowUtcString
      result = $result
      reason = $reason
    }
  )
  if ($logs.Count -gt 500) {
    $logs = @($logs | Select-Object -Last 500)
  }
  Write-JsonArray $RuntimeCameraLogsPath $logs
}

function Process-Event([string]$EventType, $PayloadObj, [string]$RawData) {
  $externalUnitId = $null
  if ($null -ne $PayloadObj) {
    foreach ($key in @("externalUnitId", "external_unit_id", "unitId", "unit_id", "unit")) {
      if ($PayloadObj.PSObject.Properties.Name -contains $key) {
        $externalUnitId = [string]$PayloadObj.$key
        break
      }
    }
  }

  $unit = Resolve-UnitByExternalId $externalUnitId
  $mode = $null
  $room = Read-JsonObject $RoomPath
  if ($null -ne $room) { $mode = [string]$room.operation_mode }
  $payloadToPersist = if ($null -ne $PayloadObj) { $PayloadObj } else { @{ raw = $RawData } }

  try {
    if ($EventType -eq "request-talkreq") {
      if ($mode -eq "MANUAL" -and $null -ne $unit) {
        Upsert-RuntimeUnitState $unit.id "REQUEST"
        Create-PendingRequest $unit.id
        Add-RuntimeEvent $EventType $externalUnitId $payloadToPersist "SUCCESS" $null
        return
      }
      Add-RuntimeEvent $EventType $externalUnitId $payloadToPersist "IGNORED" "Unit missing or mode not MANUAL"
      return
    }

    if ($EventType -eq "response-unitstart") {
      if ($null -ne $unit) {
        Upsert-RuntimeUnitState $unit.id "SPEAKING"
        Trigger-CameraForUnit $unit.id
        Add-RuntimeEvent $EventType $externalUnitId $payloadToPersist "SUCCESS" $null
        return
      }
      Add-RuntimeEvent $EventType $externalUnitId $payloadToPersist "IGNORED" "Unit missing"
      return
    }

    if ($EventType -eq "response-unitstop") {
      if ($null -ne $unit) {
        Upsert-RuntimeUnitState $unit.id "IDLE"
        Add-RuntimeEvent $EventType $externalUnitId $payloadToPersist "SUCCESS" $null
        return
      }
      Add-RuntimeEvent $EventType $externalUnitId $payloadToPersist "IGNORED" "Unit missing"
      return
    }

    Add-RuntimeEvent $EventType $externalUnitId $payloadToPersist "IGNORED" $null
  }
  catch {
    Add-RuntimeEvent $EventType $externalUnitId $payloadToPersist "FAILED" ([string]$_.Exception.Message)
  }
}

function Connect-And-ReadSse([string]$Url) {
  $client = [System.Net.Http.HttpClient]::new()
  $client.Timeout = [TimeSpan]::FromMinutes(30)

  $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $Url)
  $request.Headers.Accept.Add([System.Net.Http.Headers.MediaTypeWithQualityHeaderValue]::new("text/event-stream"))

  try {
    $response = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    if (-not $response.IsSuccessStatusCode) {
      throw "SSE request failed with HTTP $([int]$response.StatusCode)"
    }

    Set-SseStatus "CONNECTED"
    $stream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
    $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::UTF8)

    $currentEvent = ""
    $dataBuffer = New-Object System.Collections.Generic.List[string]

    try {
      while (-not $reader.EndOfStream) {
        $line = $reader.ReadLine()
        if ($null -eq $line) { continue }

        if ($line.StartsWith("event:")) {
          $currentEvent = $line.Substring(6).Trim()
          continue
        }

        if ($line.StartsWith("data:")) {
          [void]$dataBuffer.Add($line.Substring(5).Trim())
          continue
        }

        if ([string]::IsNullOrWhiteSpace($line)) {
          if (-not [string]::IsNullOrWhiteSpace($currentEvent) -and $dataBuffer.Count -gt 0) {
            $raw = ($dataBuffer -join "`n")
            $payloadObj = $null
            try { $payloadObj = $raw | ConvertFrom-Json } catch { $payloadObj = $null }
            Process-Event $currentEvent $payloadObj $raw
          }
          $currentEvent = ""
          $dataBuffer.Clear()
        }
      }
    }
    finally {
      $reader.Dispose()
      $stream.Dispose()
      $response.Dispose()
    }
  }
  finally {
    $client.Dispose()
  }
}

Ensure-RuntimeState

$backoffSeconds = 2
while ($true) {
  try {
    $config = Read-JsonObject $TsdConfigPath
    if ($null -eq $config -or ([string]$config.status) -eq "INACTIVE" -or [string]::IsNullOrWhiteSpace([string]$config.base_url)) {
      Set-SseStatus "DISCONNECTED"
      Start-Sleep -Seconds 5
      continue
    }

    $base = ([string]$config.base_url).TrimEnd("/")
    $endpoint = if (-not [string]::IsNullOrWhiteSpace([string]$config.sse_endpoint)) { [string]$config.sse_endpoint } else { "/api/event" }
    if (-not $endpoint.StartsWith("/")) { $endpoint = "/" + $endpoint }
    $url = $base + $endpoint

    Set-SseStatus "RECONNECTING"
    Connect-And-ReadSse $url
  }
  catch {
    Set-SseStatus "RECONNECTING"
    Start-Sleep -Seconds $backoffSeconds
    $backoffSeconds = [Math]::Min(10, $backoffSeconds + 2)
    continue
  }

  Set-SseStatus "RECONNECTING"
  Start-Sleep -Seconds $backoffSeconds
  $backoffSeconds = [Math]::Min(10, $backoffSeconds + 2)
}

