export type ConfigOverview = {
  room: {
    id: string;
    name: string;
    operationMode: 'MANUAL' | 'AUTOMATIC';
  };
  tsdConnection: {
    configured: boolean;
    lastTestResult: 'SUCCESS' | 'PARTIAL' | 'FAILED' | null;
    lastTestAt: string | null;
  };
  layout: {
    configured: boolean;
    fileType: 'PDF' | 'JPG' | 'JPEG' | null;
  };
  cameraSummary: {
    total: number;
    active: number;
  };
  mappingSummary: {
    total: number;
    active: number;
  };
};

export type TsdConfig = {
  id: string;
  baseUrl: string;
  username: string | null;
  sseEndpoint: string;
  isActive: boolean;
  lastTestResult: 'SUCCESS' | 'PARTIAL' | 'FAILED' | null;
  lastTestAt: string | null;
};

export type TsdUnit = {
  id: string;
  externalUnitId: string;
  unitName: string | null;
  deviceType: 'CHAIRMAN' | 'DELEGATE';
  runtimeState: 'IDLE' | 'REQUEST' | 'SPEAKING' | 'OFFLINE';
  isConnected: boolean;
  lastEventAt: string | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type Camera = {
  id: string;
  name: string;
  protocol: 'ONVIF' | 'VISCA';
  ipAddress: string;
  port: number | null;
  rtspUrl: string | null;
  vendor: string | null;
  model: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'OFFLINE';
  capabilities: {
    ptz: boolean;
    preset: boolean;
    stream: boolean;
  };
  lastTestResult: 'SUCCESS' | 'PARTIAL' | 'FAILED' | null;
  lastTestAt: string | null;
};

export type CameraPreset = {
  id: string;
  cameraId: string;
  presetCode: string;
  presetName: string | null;
};

export type Layout = {
  id: string;
  fileName: string;
  filePath: string;
  fileType: 'PDF' | 'JPG' | 'JPEG';
  width: number | null;
  height: number | null;
};

export type LayoutDevice = {
  id: string;
  refType: 'TSD_UNIT' | 'CAMERA';
  refId: string;
  posX: number;
  posY: number;
  iconLabel: string | null;
};

export type LayoutAnnotation = {
  id: string;
  text: string;
  posX: number;
  posY: number;
};

export type Mapping = {
  id: string;
  unit: {
    id: string;
    externalUnitId: string;
    unitName: string | null;
    deviceType: 'CHAIRMAN' | 'DELEGATE';
  };
  camera: {
    id: string;
    name: string;
    status: 'ACTIVE' | 'INACTIVE' | 'OFFLINE';
  };
  preset: {
    id: string;
    presetCode: string;
    presetName: string | null;
  };
  isActive: boolean;
};

export type OperationMode = {
  mode: 'MANUAL' | 'AUTOMATIC';
};

export type ReadinessResult = {
  overallStatus: 'PASSED' | 'WARNING' | 'FAILED';
  items: Array<{
    category: 'TSD' | 'CAMERA' | 'LAYOUT' | 'MAPPING' | 'MODE';
    status: 'PASSED' | 'WARNING' | 'FAILED';
    message: string;
  }>;
};
