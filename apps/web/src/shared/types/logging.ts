export type LogType = 'AUDIT' | 'RUNTIME' | 'CAMERA' | 'SYSTEM_ERROR' | 'MANUAL_OPERATION';
export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type LogResult = 'SUCCESS' | 'FAILED' | 'SKIPPED';
export type LogSource = 'USER' | 'SYSTEM' | 'TSD1000' | 'CAMERA' | 'RUNTIME_ENGINE';

export type LogListItem = {
  id: string;
  createdAt: string;
  logType: LogType;
  level: LogLevel;
  source: LogSource;
  action: string | null;
  result: LogResult | null;
  actorUserId: string | null;
  roomId: string | null;
  targetType: string | null;
  targetId: string | null;
  eventType: string | null;
  message: string;
  archivedAt: string | null;
};

export type LogDetail = LogListItem & {
  detailJson: unknown | null;
  errorCode: string | null;
  errorStack: string | null;
};

export type PaginatedLogs = {
  items: LogListItem[];
  page: number;
  pageSize: number;
  total: number;
};

