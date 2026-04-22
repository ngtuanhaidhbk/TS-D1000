import { apiClient } from './api-client';
import type {
  RuntimeModeResponse,
  RuntimeCameraLogsResponse,
  RuntimeCameraStatus,
  RuntimeRequestActionResponse,
  RuntimeRequestsResponse,
  RuntimeSnapshot,
  RuntimeSwitchImpact,
} from '../types/runtime';

export const runtimeApi = {
  getMode(token: string) {
    return apiClient.get<RuntimeModeResponse>('/runtime/mode', token);
  },
  updateMode(mode: 'MANUAL' | 'AUTOMATIC', token: string) {
    return apiClient.put<RuntimeModeResponse>('/runtime/mode', { mode }, token);
  },
  getSwitchImpact(token: string) {
    return apiClient.get<RuntimeSwitchImpact>('/runtime/mode/switch-impact', token);
  },
  getSnapshot(token: string) {
    return apiClient.get<RuntimeSnapshot>('/runtime/snapshot', token);
  },
  listRequests(
    token: string,
    params?: URLSearchParams,
  ) {
    return apiClient.get<RuntimeRequestsResponse>(
      `/runtime/requests${params ? `?${params.toString()}` : ''}`,
      token,
    );
  },
  approveRequest(id: string, token: string) {
    return apiClient.post<RuntimeRequestActionResponse>(`/runtime/requests/${id}/approve`, undefined, token);
  },
  rejectRequest(id: string, token: string) {
    return apiClient.post<RuntimeRequestActionResponse>(`/runtime/requests/${id}/reject`, undefined, token);
  },
  recallPreset(cameraId: string, presetId: string, token: string) {
    return apiClient.post<{ result: 'SUCCESS' | 'FAILED'; executedAt: string }>(
      `/runtime/cameras/${cameraId}/recall-preset`,
      { presetId },
      token,
    );
  },
  moveCamera(
    cameraId: string,
    payload: { action: 'PAN_LEFT' | 'PAN_RIGHT' | 'TILT_UP' | 'TILT_DOWN' | 'ZOOM_IN' | 'ZOOM_OUT'; speed?: number },
    token: string,
  ) {
    return apiClient.post<{ result: 'SUCCESS' | 'FAILED'; executedAt: string }>(
      `/runtime/cameras/${cameraId}/move`,
      payload,
      token,
    );
  },
  stopCamera(cameraId: string, token: string) {
    return apiClient.post<{ result: 'SUCCESS' | 'FAILED'; executedAt: string }>(
      `/runtime/cameras/${cameraId}/stop`,
      undefined,
      token,
    );
  },
  getCameraStatus(cameraId: string, token: string) {
    return apiClient.get<RuntimeCameraStatus>(`/runtime/cameras/${cameraId}/status`, token);
  },
  listCameraLogs(cameraId: string, token: string, params?: URLSearchParams) {
    return apiClient.get<RuntimeCameraLogsResponse>(
      `/runtime/cameras/${cameraId}/logs${params ? `?${params.toString()}` : ''}`,
      token,
    );
  },
};
