export enum OperationMode {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC',
}

export enum LayoutFileType {
  PDF = 'PDF',
  JPG = 'JPG',
  JPEG = 'JPEG',
}

export enum DeviceType {
  CHAIRMAN = 'CHAIRMAN',
  DELEGATE = 'DELEGATE',
}

export enum UnitRuntimeState {
  IDLE = 'IDLE',
  REQUEST = 'REQUEST',
  SPEAKING = 'SPEAKING',
  OFFLINE = 'OFFLINE',
}

export enum CameraProtocol {
  ONVIF = 'ONVIF',
  VISCA = 'VISCA',
  AXIS_VAPIX = 'AXIS_VAPIX',
  VENDOR_API = 'VENDOR_API',
}

export enum CameraStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  OFFLINE = 'OFFLINE',
}

export enum ConnectionTestResult {
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

export enum ReadinessStatus {
  PASSED = 'PASSED',
  WARNING = 'WARNING',
  FAILED = 'FAILED',
}

export enum LayoutRefType {
  TSD_UNIT = 'TSD_UNIT',
  CAMERA = 'CAMERA',
}

export type RoomEntity = {
  id: string;
  name: string;
  operationMode: OperationMode;
  createdAt: string;
  updatedAt: string;
};

export type TsdConnectionConfigEntity = {
  id: string;
  roomId: string;
  baseUrl: string;
  username: string | null;
  passwordEncrypted: string | null;
  sseEndpoint: string;
  isActive: boolean;
  lastTestResult: ConnectionTestResult | null;
  lastTestAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TsdUnitEntity = {
  id: string;
  roomId: string;
  externalUnitId: string;
  unitName: string | null;
  deviceType: DeviceType;
  runtimeState: UnitRuntimeState;
  isConnected: boolean;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CameraEntity = {
  id: string;
  roomId: string;
  name: string;
  protocol: CameraProtocol;
  ipAddress: string;
  port: number | null;
  username: string | null;
  passwordEncrypted: string | null;
  rtspUrl: string | null;
  vendor: string | null;
  model: string | null;
  status: CameraStatus;
  capabilityPtz: boolean;
  capabilityPreset: boolean;
  capabilityStream: boolean;
  capabilityManualControl: boolean;
  capabilityPositionQuery: boolean;
  lastTestResult: ConnectionTestResult | null;
  lastTestAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CameraPresetEntity = {
  id: string;
  cameraId: string;
  presetCode: string;
  presetName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LayoutEntity = {
  id: string;
  roomId: string;
  fileName: string;
  filePath: string;
  fileType: LayoutFileType;
  width: number | null;
  height: number | null;
  createdAt: string;
  updatedAt: string;
};

export type LayoutDeviceEntity = {
  id: string;
  roomId: string;
  refType: LayoutRefType;
  refId: string;
  posX: number;
  posY: number;
  iconLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LayoutAnnotationEntity = {
  id: string;
  roomId: string;
  text: string;
  posX: number;
  posY: number;
  createdAt: string;
  updatedAt: string;
};

export type MicCameraMappingEntity = {
  id: string;
  roomId: string;
  unitId: string;
  cameraId: string;
  presetId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
