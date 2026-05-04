import { apiClient } from './api-client';
import type {
  Camera,
  CameraPreset,
  ConfigOverview,
  Layout,
  LayoutAnnotation,
  LayoutDevice,
  Mapping,
  OperationMode,
  PaginatedResponse,
  ReadinessResult,
  TsdConfig,
  TsdUnit,
} from '../types/system-config';

export const systemConfigApi = {
  getOverview(token?: string | null) {
    return apiClient.get<ConfigOverview>('/config/overview', token);
  },
  getTsdConfig(token?: string | null) {
    return apiClient.get<TsdConfig>('/config/tsd', token);
  },
  createTsdConfig(
    payload: { baseUrl: string; username?: string; password?: string; sseEndpoint?: string },
    token?: string | null,
  ) {
    return apiClient.post<TsdConfig>('/config/tsd', payload, token);
  },
  updateTsdConfig(
    id: string,
    payload: { baseUrl: string; username?: string; password?: string; sseEndpoint?: string },
    token?: string | null,
  ) {
    return apiClient.put<TsdConfig>(`/config/tsd/${id}`, payload, token);
  },
  testTsdConfig(id: string, token?: string | null) {
    return apiClient.post<{ result: string; testedAt: string }>(`/config/tsd/${id}/test`, undefined, token);
  },
  syncUnits(id: string, token?: string | null) {
    return apiClient.post<{ synced: number; created: number; updated: number; skipped: number }>(
      `/config/tsd/${id}/sync-units`,
      undefined,
      token,
    );
  },
  listUnits(id: string, token?: string | null, params?: URLSearchParams) {
    return apiClient.get<PaginatedResponse<TsdUnit>>(
      `/config/tsd/${id}/units${params ? `?${params.toString()}` : ''}`,
      token,
    );
  },
  listCameras(token?: string | null, params?: URLSearchParams) {
    return apiClient.get<PaginatedResponse<Camera>>(
      `/config/cameras${params ? `?${params.toString()}` : ''}`,
      token,
    );
  },
  getCamera(id: string, token?: string | null) {
    return apiClient.get<Camera>(`/config/cameras/${id}`, token);
  },
  createCamera(
    payload: {
      name: string;
      protocol: 'ONVIF' | 'VISCA' | 'AXIS_VAPIX' | 'VENDOR_API';
      ipAddress: string;
      port?: number;
      username?: string;
      password?: string;
      rtspUrl?: string;
      vendor?: string;
      model?: string;
    },
    token?: string | null,
  ) {
    return apiClient.post<Camera>('/config/cameras', payload, token);
  },
  updateCamera(
    id: string,
    payload: {
      name: string;
      protocol: 'ONVIF' | 'VISCA' | 'AXIS_VAPIX' | 'VENDOR_API';
      ipAddress: string;
      port?: number;
      username?: string;
      password?: string;
      rtspUrl?: string;
      vendor?: string;
      model?: string;
    },
    token?: string | null,
  ) {
    return apiClient.put<Camera>(`/config/cameras/${id}`, payload, token);
  },
  deactivateCamera(id: string, reason: string, token?: string | null) {
    return apiClient.patch<Camera>(`/config/cameras/${id}/deactivate`, { reason }, token);
  },
  testCamera(id: string, token?: string | null) {
    return apiClient.post<{
      result: 'SUCCESS' | 'PARTIAL' | 'FAILED';
      testedAt: string;
      capabilities: { ptz: boolean; preset: boolean; stream: boolean; manualControl: boolean; positionQuery: boolean };
    }>(`/config/cameras/${id}/test`, undefined, token);
  },
  getCameraCapabilities(id: string, token?: string | null) {
    return apiClient.get<{
      cameraId: string;
      canStream: boolean;
      canPtz: boolean;
      canPreset: boolean;
      supportsManualControl: boolean;
      supportsPositionQuery: boolean;
    }>(`/config/cameras/${id}/capabilities`, token);
  },
  detectCameraCapabilities(id: string, token?: string | null) {
    return apiClient.post<{
      cameraId: string;
      canStream: boolean;
      canPtz: boolean;
      canPreset: boolean;
      supportsManualControl: boolean;
      supportsPositionQuery: boolean;
    }>(`/config/cameras/${id}/capabilities/detect`, undefined, token);
  },
  listPresets(id: string, token?: string | null) {
    return apiClient.get<{ items: CameraPreset[] }>(`/config/cameras/${id}/presets`, token);
  },
  createPreset(
    cameraId: string,
    payload: { presetCode: string; presetName?: string },
    token?: string | null,
  ) {
    return apiClient.post<CameraPreset>(`/config/cameras/${cameraId}/presets`, payload, token);
  },
  updatePreset(
    presetId: string,
    payload: { presetCode: string; presetName?: string },
    token?: string | null,
  ) {
    return apiClient.put<CameraPreset>(`/config/presets/${presetId}`, payload, token);
  },
  deletePreset(presetId: string, token?: string | null) {
    return apiClient.del<{ id: string }>(`/config/presets/${presetId}`, token);
  },
  getLayout(token?: string | null) {
    return apiClient.get<Layout>('/config/layout', token);
  },
  uploadLayout(file: File, token?: string | null) {
    const body = new FormData();
    body.append('file', file);
    return apiClient.upload<Layout>('/config/layout', body, token);
  },
  listLayoutDevices(token?: string | null) {
    return apiClient.get<{ items: LayoutDevice[] }>('/config/layout/devices', token);
  },
  saveLayoutDevices(
    payload: { devices: Array<{ refType: 'TSD_UNIT' | 'CAMERA'; refId: string; posX: number; posY: number; iconLabel?: string }> },
    token?: string | null,
  ) {
    return apiClient.put<{ items: LayoutDevice[] }>('/config/layout/devices', payload, token);
  },
  listAnnotations(token?: string | null) {
    return apiClient.get<{ items: LayoutAnnotation[] }>('/config/layout/annotations', token);
  },
  createAnnotation(
    payload: { text: string; posX: number; posY: number },
    token?: string | null,
  ) {
    return apiClient.post<LayoutAnnotation>('/config/layout/annotations', payload, token);
  },
  updateAnnotation(
    id: string,
    payload: { text: string; posX: number; posY: number },
    token?: string | null,
  ) {
    return apiClient.put<LayoutAnnotation>(`/config/layout/annotations/${id}`, payload, token);
  },
  listMappings(token?: string | null, params?: URLSearchParams) {
    return apiClient.get<PaginatedResponse<Mapping>>(
      `/config/mappings${params ? `?${params.toString()}` : ''}`,
      token,
    );
  },
  createMapping(
    payload: { unitId: string; cameraId: string; presetId: string },
    token?: string | null,
  ) {
    return apiClient.post<Mapping>('/config/mappings', payload, token);
  },
  updateMapping(
    id: string,
    payload: { cameraId: string; presetId: string; isActive: boolean },
    token?: string | null,
  ) {
    return apiClient.put<Mapping>(`/config/mappings/${id}`, payload, token);
  },
  getMode(token?: string | null) {
    return apiClient.get<OperationMode>('/config/mode', token);
  },
  updateMode(mode: 'MANUAL' | 'AUTOMATIC', token?: string | null) {
    return apiClient.put<OperationMode>('/config/mode', { mode }, token);
  },
  checkReadiness(token?: string | null) {
    return apiClient.post<ReadinessResult>('/config/readiness/check', undefined, token);
  },
};
