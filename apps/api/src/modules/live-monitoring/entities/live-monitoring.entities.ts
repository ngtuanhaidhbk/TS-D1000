export type RuntimeConnectionStatus = 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export type CameraRuntimeResult = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface CurrentCameraTarget {
  cameraId: string;
  cameraName: string;
  unitId: string;
  unitName: string;
  presetId: string;
  presetName: string;
}

export interface RuntimeAlert {
  id: string;
  severity: AlertSeverity;
  source: string;
  message: string;
  status: AlertStatus;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
}

export type RuntimeAlertEntity = {
  id: string;
  roomId: string;
  severity: AlertSeverity;
  source: string;
  message: string;
  status: AlertStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
};

export interface DashboardResponse {
  roomId: string;
  operationMode: 'MANUAL' | 'AUTOMATIC';
  sseStatus: RuntimeConnectionStatus;
  lastEventAt: string | null;
  activeSpeakerCount: number;
  pendingRequestCount: number;
  currentCameraTarget: CurrentCameraTarget | null;
  activeAlerts: RuntimeAlert[];
}

export interface SnapshotResponse {
  roomId: string;
  operationMode: 'MANUAL' | 'AUTOMATIC';
  sseStatus: RuntimeConnectionStatus;
  lastEventAt: string | null;
  roomState: {
    operationMode: 'MANUAL' | 'AUTOMATIC';
    sseStatus: RuntimeConnectionStatus;
  };
  units: Array<{
    unitId: string;
    unitName: string | null;
    deviceType: 'CHAIRMAN' | 'DELEGATE';
    state: 'IDLE' | 'REQUEST' | 'SPEAKING' | 'OFFLINE';
    lastEventAt: string | null;
  }>;
  cameras: Array<{
    cameraId: string;
    cameraName: string;
    status: 'ACTIVE' | 'INACTIVE' | 'OFFLINE';
    currentTarget: {
      unitId: string | null;
      presetId: string | null;
    } | null;
  }>;
  alerts: RuntimeAlert[];
}

export interface MapResponse {
  roomId: string;
  layout: LayoutData | null;
  devices: MapDevice[];
}

export interface LayoutData {
  layoutId: string;
  fileName: string;
  fileType: string;
  width: number | null;
  height: number | null;
}

export interface MapDevice {
  id: string;
  type: 'UNIT' | 'CAMERA';
  refType: string;
  refId: string;
  label: string;
  posX: number;
  posY: number;
  runtimeState?: 'IDLE' | 'REQUEST' | 'SPEAKING' | 'OFFLINE' | 'ACTIVE' | 'INACTIVE' | 'OFFLINE';
  icon?: string;
}

export interface ActiveSpeakerResponse {
  unitId: string;
  unitName: string | null;
  deviceType: 'CHAIRMAN' | 'DELEGATE';
  lastEventAt: string | null;
  mappedCamera: {
    cameraId: string;
    cameraName: string;
    presetId: string;
    presetName: string | null;
  } | null;
}

export interface PendingRequestsResponse {
  queueUsed: boolean;
  pendingRequestCount: number;
  requests: Array<{
    requestId: string;
    unitId: string;
    unitName: string | null;
    deviceType: 'CHAIRMAN' | 'DELEGATE';
    requestedAt: string;
  }>;
}

export interface UnitDetailResponse {
  unitId: string;
  unitName: string | null;
  deviceType: 'CHAIRMAN' | 'DELEGATE';
  runtimeState: 'IDLE' | 'REQUEST' | 'SPEAKING' | 'OFFLINE';
  lastEventAt: string | null;
  mappedCamera: {
    cameraId: string;
    cameraName: string;
    presetId: string;
    presetName: string | null;
  } | null;
  hasWarning: boolean;
  warningMessage?: string;
}

export interface CameraStatusResponse {
  cameraId: string;
  cameraName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'OFFLINE';
  lastTestAt: string | null;
  lastTestResult: string | null;
}

export interface CameraTargetResponse {
  currentTargets: Array<{
    cameraId: string;
    cameraName: string;
    currentTarget: {
      unitId: string;
      unitName: string;
      presetId: string;
      presetName: string | null;
    } | null;
  }>;
}

export interface CameraTriggerResponse {
  triggerId: string;
  cameraId: string;
  cameraName: string;
  action: string;
  result: CameraRuntimeResult;
  reason: string | null;
  executedAt: string;
}

export type RuntimeEventEntity = {
  id: string;
  roomId: string;
  eventType: string;
  unitId: string | null;
  unitName: string | null;
  result: string;
  occurredAt: string;
};

export interface RuntimeEventResponse {
  eventId: string;
  eventType: string;
  unitId: string | null;
  unitName: string | null;
  result: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  receivedAt: string;
  processedAt: string | null;
}

export interface AlertsResponse {
  alerts: RuntimeAlert[];
  total: number;
}

export interface RuntimeStatusResponse {
  roomId: string;
  sseStatus: RuntimeConnectionStatus;
  isConnected: boolean;
  isDataStale: boolean;
  lastEventAt: string | null;
  staleThresholdSeconds: number;
}

export type RuntimeRecoveryLogEntity = {
  id: string;
  roomId: string;
  action: 'RECONNECT' | 'RECOVER_STATE' | 'REFRESH_SNAPSHOT';
  result: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'TIMEOUT';
  message: string | null;
  executedBy: string;
  executedAt: string;
};

export interface RecoveryResponse {
  recoveryId: string;
  action: 'RECONNECT' | 'RECOVER_STATE' | 'REFRESH_SNAPSHOT';
  result: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'TIMEOUT';
  message?: string;
  executedAt: string;
}

