export enum LogType {
  AUDIT = 'AUDIT',
  RUNTIME = 'RUNTIME',
  CAMERA = 'CAMERA',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  MANUAL_OPERATION = 'MANUAL_OPERATION',
}

export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum LogResult {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum LogSource {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  TSD1000 = 'TSD1000',
  CAMERA = 'CAMERA',
  RUNTIME_ENGINE = 'RUNTIME_ENGINE',
}

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

