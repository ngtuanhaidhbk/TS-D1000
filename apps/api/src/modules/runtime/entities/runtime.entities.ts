import { OperationMode, UnitRuntimeState } from '../../system-config/entities/system-config.entities';

export enum SseStatus {
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  DISCONNECTED = 'DISCONNECTED',
}

export enum SpeakingRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export type CameraTarget = {
  unitId: string;
  cameraId: string;
  presetId: string;
};

export type RuntimeRoomStateEntity = {
  id: string; // roomId
  roomId: string;
  operationMode: OperationMode;
  sseStatus: SseStatus;
  currentCameraTarget: CameraTarget | null;
  updatedAt: string;
};

export type SpeakingRequestEntity = {
  id: string;
  roomId: string;
  unitId: string;
  status: SpeakingRequestStatus;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RuntimeSnapshot = {
  roomId: string;
  operationMode: OperationMode;
  sseStatus: SseStatus;
  activeSpeakers: string[];
  pendingRequests: string[];
  currentCameraTarget: CameraTarget | null;
  units: Record<string, { state: UnitRuntimeState; lastEventAt: string | null }>;
};

export enum CameraActionType {
  TRIGGER_PRESET = 'TRIGGER_PRESET',
  MANUAL_PRESET = 'MANUAL_PRESET',
  MOVE = 'MOVE',
  STOP = 'STOP',
  TEST = 'TEST',
  DETECT_CAPABILITIES = 'DETECT_CAPABILITIES',
}

export enum CameraTriggerResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export type RuntimeCameraLogEntity = {
  id: string;
  roomId: string;
  cameraId: string;
  unitId: string | null;
  presetId: string | null;
  actionType: CameraActionType;
  result: CameraTriggerResult;
  reason: string | null;
  triggeredAt: string;
  actorUserId: string | null;
};

export type RuntimeCameraStateEntity = {
  id: string; // cameraId
  cameraId: string;
  currentTargetUnitId: string | null;
  currentPresetId: string | null;
  lastSwitchAt: string | null;
  lastResult: CameraTriggerResult | null;
  lastReason: string | null;
  updatedAt: string;
};
