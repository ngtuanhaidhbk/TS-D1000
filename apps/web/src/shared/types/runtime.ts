import type { PaginatedResponse, TsdUnit } from './system-config';

export type RuntimeModeResponse = {
  roomId: string;
  mode: 'MANUAL' | 'AUTOMATIC';
};

export type RuntimeSwitchImpact = {
  hasActiveSpeakers: boolean;
  hasPendingRequests: boolean;
  warningMessage: string | null;
};

export type RuntimeSnapshot = {
  roomId: string;
  operationMode: 'MANUAL' | 'AUTOMATIC';
  sseStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  activeSpeakers: string[];
  pendingRequests: string[];
  currentCameraTarget: null | {
    unitId: string;
    cameraId: string;
    presetId: string;
  };
  units: Record<string, { state: TsdUnit['runtimeState']; lastEventAt: string | null }>;
};

export type RuntimeRequestItem = {
  id: string;
  unitId: string;
  unitName: string | null;
  deviceType: TsdUnit['deviceType'] | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  handledBy: string | null;
};

export type RuntimeRequestsResponse = PaginatedResponse<RuntimeRequestItem>;

export type RuntimeRequestActionResponse = {
  requestId: string;
  status: RuntimeRequestItem['status'];
};

export type RuntimeCameraStatus = {
  cameraId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'OFFLINE';
  currentTargetUnitId: string | null;
  currentPresetId: string | null;
  lastSwitchAt: string | null;
  lastResult: 'SUCCESS' | 'FAILED' | 'SKIPPED' | null;
  lastReason: string | null;
  updatedAt: string;
};

export type RuntimeCameraLogItem = {
  id: string;
  roomId: string;
  cameraId: string;
  unitId: string | null;
  presetId: string | null;
  actionType:
    | 'TRIGGER_PRESET'
    | 'MANUAL_PRESET'
    | 'MOVE'
    | 'STOP'
    | 'TEST'
    | 'DETECT_CAPABILITIES';
  result: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  reason: string | null;
  triggeredAt: string;
  actorUserId: string | null;
};

export type RuntimeCameraLogsResponse = PaginatedResponse<RuntimeCameraLogItem>;
