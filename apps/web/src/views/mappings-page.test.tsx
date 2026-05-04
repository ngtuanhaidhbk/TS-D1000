import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { useAuth } from '../shared/providers/auth-provider';
import { systemConfigApi } from '../shared/services/system-config-api';
import { MappingsPage } from './mappings-page';

vi.mock('../shared/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../shared/services/system-config-api', () => ({
  systemConfigApi: {
    listMappings: vi.fn(),
    listCameras: vi.fn(),
    getTsdConfig: vi.fn(),
    listUnits: vi.fn(),
    listPresets: vi.fn(),
  },
}));

describe('MappingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      user: {
        id: 'admin-1',
        username: 'admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      token: 'jwt-token',
      authMessage: null,
      clearAuthMessage: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(systemConfigApi.listMappings).mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      },
    });
    vi.mocked(systemConfigApi.listCameras).mockResolvedValue({
      items: [
        {
          id: 'camera-1',
          name: 'Camera 1',
          protocol: 'ONVIF',
          ipAddress: '192.168.1.10',
          port: 80,
          rtspUrl: null,
          vendor: null,
          model: null,
          status: 'ACTIVE',
          capabilities: { ptz: true, preset: true, stream: false },
          lastTestResult: null,
          lastTestAt: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    });
    vi.mocked(systemConfigApi.getTsdConfig).mockResolvedValue({
      id: 'tsd-1',
      baseUrl: 'http://127.0.0.1',
      username: 'admin',
      sseEndpoint: '/api/event',
      isActive: true,
      lastTestResult: 'SUCCESS',
      lastTestAt: '2026-04-20T10:00:00Z',
    });
    vi.mocked(systemConfigApi.listUnits).mockResolvedValue({
      items: [
        {
          id: 'unit-1',
          externalUnitId: 'D01',
          unitName: 'Delegate 01',
          deviceType: 'DELEGATE',
          runtimeState: 'IDLE',
          isConnected: true,
          lastEventAt: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    });
    vi.mocked(systemConfigApi.listPresets).mockResolvedValue({ items: [] });
  });

  it('disables preset selector until a camera is selected and shows helper text when no preset exists', async () => {
    render(<MappingsPage />);

    const presetSelect = await screen.findByLabelText('Preset');
    expect(presetSelect).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Camera'), {
      target: { value: 'camera-1' },
    });

    await waitFor(() => expect(systemConfigApi.listPresets).toHaveBeenCalledWith('camera-1', 'jwt-token'));
    expect(await screen.findByText('No presets available for selected camera.')).toBeInTheDocument();
    expect(screen.getByLabelText('Preset')).toBeDisabled();
  });
});
