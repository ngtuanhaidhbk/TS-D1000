import { apiClient } from './api-client';
import type {
  ActiveSpeakerResponse,
  AlertsResponse,
  CameraStatusResponse,
  CameraTargetResponse,
  CameraTriggerResponse,
  DashboardResponse,
  MapResponse,
  PendingRequestsResponse,
  RecoveryResponse,
  RuntimeStatusResponse,
  SnapshotResponse,
  RuntimeAlert,
  UnitDetailResponse,
  RuntimeEventResponse,
} from '../types/live-monitoring';

export const liveMonitoringApi = {
  getDashboard(token: string) {
    return apiClient.get<DashboardResponse>('/live/dashboard', token);
  },
  getSnapshot(token: string) {
    return apiClient.get<SnapshotResponse>('/live/snapshot', token);
  },
  getMap(token: string) {
    return apiClient.get<MapResponse>('/live/map', token);
  },
  getActiveSpeakers(token: string) {
    return apiClient.get<ActiveSpeakerResponse[]>('/live/speakers/active', token);
  },
  getPendingRequests(token: string) {
    return apiClient.get<PendingRequestsResponse>('/live/requests/summary', token);
  },
  getUnitDetail(unitId: string, token: string) {
    return apiClient.get<UnitDetailResponse>(`/live/units/${unitId}`, token);
  },
  getCameraStatuses(token: string) {
    return apiClient.get<CameraStatusResponse[]>('/live/cameras/status', token);
  },
  getCameraTargets(token: string) {
    return apiClient.get<CameraTargetResponse>('/live/cameras/target', token);
  },
  getCameraTriggers(token: string, params?: URLSearchParams) {
    return apiClient.get<CameraTriggerResponse[]>(
      `/live/cameras/triggers${params ? `?${params.toString()}` : ''}`,
      token,
    );
  },
  getEventFeed(
    token: string,
    params?: URLSearchParams,
  ) {
    return apiClient.get<{
      items: RuntimeEventResponse[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>(`/live/events${params ? `?${params.toString()}` : ''}`, token);
  },
  getAlerts(token: string, params?: URLSearchParams) {
    return apiClient.get<AlertsResponse>(`/live/alerts${params ? `?${params.toString()}` : ''}`, token);
  },
  acknowledgeAlert(alertId: string, token: string) {
    return apiClient.post<RuntimeAlert>(`/live/alerts/${alertId}/acknowledge`, undefined, token);
  },
  getRuntimeStatus(token: string) {
    return apiClient.get<RuntimeStatusResponse>('/live/runtime/status', token);
  },
  runRecovery(action: 'RECONNECT' | 'RECOVER_STATE' | 'REFRESH_SNAPSHOT', token: string) {
    return apiClient.post<RecoveryResponse>('/live/runtime/recovery', { action }, token);
  },
};

