import { apiClient } from './api-client';
import type { LogDetail, PaginatedLogs } from '../types/logging';

export type AuditLogsQuery = {
  actorUserId?: string;
  action?: string;
  result?: 'SUCCESS' | 'FAILED';
  from?: string;
  to?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
};

export type RuntimeLogsQuery = {
  eventType?: string;
  result?: string;
  level?: string;
  unitId?: string;
  cameraId?: string;
  keyword?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

export type GenericLogsQuery = {
  logType?: string;
  level?: string;
  source?: string;
  action?: string;
  result?: string;
  targetType?: string;
  targetId?: string;
  roomId?: string;
  keyword?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
};

function toQueryString(params: Record<string, string | number | undefined | null>) {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    usp.set(key, String(value));
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export const loggingApi = {
  listAudit(query: AuditLogsQuery, token: string) {
    return apiClient.get<PaginatedLogs>(`/logs/audit${toQueryString(query as any)}`, token);
  },
  listRuntime(query: RuntimeLogsQuery, token: string) {
    return apiClient.get<PaginatedLogs>(`/logs/runtime${toQueryString(query as any)}`, token);
  },
  list(query: GenericLogsQuery, token: string) {
    return apiClient.get<PaginatedLogs>(`/logs${toQueryString(query as any)}`, token);
  },
  detail(id: string, token: string) {
    return apiClient.get<LogDetail>(`/logs/${encodeURIComponent(id)}`, token);
  },
  archive(payload: { before: string; logTypes?: string[] }, token: string) {
    return apiClient.post<{ archivedCount: number; archivedAt: string }>(`/logs/archive`, payload, token);
  },
};
