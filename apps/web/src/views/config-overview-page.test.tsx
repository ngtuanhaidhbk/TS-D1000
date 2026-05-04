import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { useAuth } from '../shared/providers/auth-provider';
import { systemConfigApi } from '../shared/services/system-config-api';
import { ConfigOverviewPage } from './config-overview-page';

vi.mock('../shared/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../shared/services/system-config-api', () => ({
  systemConfigApi: {
    getOverview: vi.fn(),
    checkReadiness: vi.fn(),
  },
}));

describe('ConfigOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(systemConfigApi.getOverview).mockResolvedValue({
      room: {
        id: 'room-001',
        name: 'Meeting Room A',
        operationMode: 'MANUAL',
      },
      tsdConnection: {
        configured: true,
        lastTestResult: 'SUCCESS',
        lastTestAt: '2026-04-20T10:00:00Z',
      },
      layout: {
        configured: true,
        fileType: 'PDF',
      },
      cameraSummary: {
        total: 2,
        active: 2,
      },
      mappingSummary: {
        total: 2,
        active: 1,
      },
    });
  });

  it('shows readiness action for admin users and renders overview data', async () => {
    vi.mocked(useAuth).mockReturnValue(buildAuthValue('ADMIN'));
    vi.mocked(systemConfigApi.checkReadiness).mockResolvedValue({
      overallStatus: 'WARNING',
      items: [
        {
          category: 'MAPPING',
          status: 'WARNING',
          message: '1 unit does not have active mapping',
        },
      ],
    });

    render(
      <MemoryRouter>
        <ConfigOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Meeting Room A')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Run Readiness Check' }));

    await waitFor(() => expect(systemConfigApi.checkReadiness).toHaveBeenCalledWith('jwt-token'));
    expect(await screen.findByText('1 unit does not have active mapping')).toBeInTheDocument();
  });

  it('hides readiness action for operator users', async () => {
    vi.mocked(useAuth).mockReturnValue(buildAuthValue('OPERATOR'));

    render(
      <MemoryRouter>
        <ConfigOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Meeting Room A')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run Readiness Check' })).not.toBeInTheDocument();
  });
});

function buildAuthValue(role: 'ADMIN' | 'OPERATOR') {
  return {
    isAuthenticated: true,
    isBootstrapping: false,
    user: {
      id: role === 'ADMIN' ? 'admin-1' : 'operator-1',
      username: role === 'ADMIN' ? 'admin' : 'operator',
      role,
      status: 'ACTIVE' as const,
    },
    token: 'jwt-token',
    authMessage: null,
    clearAuthMessage: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  };
}
