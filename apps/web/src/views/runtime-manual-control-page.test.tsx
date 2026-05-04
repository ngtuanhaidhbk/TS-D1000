import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { useAuth } from '../shared/providers/auth-provider';
import { ApiClientError } from '../shared/services/api-client';
import { runtimeApi } from '../shared/services/runtime-api';
import { systemConfigApi } from '../shared/services/system-config-api';
import { RuntimeManualControlPage } from './runtime-manual-control-page';

vi.mock('../shared/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../shared/services/runtime-api', () => ({
  runtimeApi: {
    getSnapshot: vi.fn(),
    listRequests: vi.fn(),
    approveRequest: vi.fn(),
    rejectRequest: vi.fn(),
  },
}));

vi.mock('../shared/services/system-config-api', () => ({
  systemConfigApi: {
    getTsdConfig: vi.fn(),
    listUnits: vi.fn(),
  },
}));

describe('RuntimeManualControlPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      user: {
        id: 'op-1',
        username: 'operator',
        role: 'OPERATOR',
        status: 'ACTIVE',
      },
      token: 'jwt-token',
      authMessage: null,
      clearAuthMessage: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(systemConfigApi.getTsdConfig).mockRejectedValue(
      new ApiClientError('CONFIG_NOT_FOUND', 'Config not found'),
    );
  });

  it('hides queue/actions in AUTOMATIC mode', async () => {
    vi.mocked(runtimeApi.getSnapshot).mockResolvedValue({
      roomId: 'room-1',
      operationMode: 'AUTOMATIC',
      sseStatus: 'CONNECTED',
      activeSpeakers: [],
      pendingRequests: ['req-1'],
      currentCameraTarget: null,
      units: {},
    });
    vi.mocked(runtimeApi.listRequests).mockResolvedValue({
      items: [
        {
          id: 'req-1',
          unitId: 'unit-1',
          unitName: null,
          deviceType: null,
          status: 'PENDING',
          createdAt: '2026-04-22T09:00:00Z',
          updatedAt: '2026-04-22T09:00:00Z',
          handledBy: null,
        },
      ],
      pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    });

    render(<RuntimeManualControlPage />);

    expect(await screen.findByText('Manual Control')).toBeInTheDocument();
    expect(await screen.findByText('Request queue is hidden in AUTOMATIC mode.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows pending queue in MANUAL mode', async () => {
    vi.mocked(runtimeApi.getSnapshot).mockResolvedValue({
      roomId: 'room-1',
      operationMode: 'MANUAL',
      sseStatus: 'CONNECTED',
      activeSpeakers: [],
      pendingRequests: ['req-1'],
      currentCameraTarget: null,
      units: {},
    });
    vi.mocked(runtimeApi.listRequests).mockResolvedValue({
      items: [
        {
          id: 'req-1',
          unitId: 'unit-1',
          unitName: null,
          deviceType: null,
          status: 'PENDING',
          createdAt: '2026-04-22T09:00:00Z',
          updatedAt: '2026-04-22T09:00:00Z',
          handledBy: null,
        },
      ],
      pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    });

    render(<RuntimeManualControlPage />);

    await waitFor(() => expect(screen.getByText('Pending Requests')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
  });
});
