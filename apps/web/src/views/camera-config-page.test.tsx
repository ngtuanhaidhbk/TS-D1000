import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { useAuth } from '../shared/providers/auth-provider';
import { systemConfigApi } from '../shared/services/system-config-api';
import { CameraConfigPage } from './camera-config-page';

vi.mock('../shared/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../shared/services/system-config-api', () => ({
  systemConfigApi: {
    listCameras: vi.fn(),
    listPresets: vi.fn(),
  },
}));

describe('CameraConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(systemConfigApi.listCameras).mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    });
    vi.mocked(systemConfigApi.listPresets).mockResolvedValue({
      items: [],
    });
  });

  it('shows add camera action for admin users', async () => {
    vi.mocked(useAuth).mockReturnValue(buildAuthValue('ADMIN'));

    render(<CameraConfigPage />);

    expect(await screen.findByText('No cameras configured yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Camera' })).toBeInTheDocument();
  });

  it('hides add camera action for operator users', async () => {
    vi.mocked(useAuth).mockReturnValue(buildAuthValue('OPERATOR'));

    render(<CameraConfigPage />);

    expect(await screen.findByText('No cameras configured yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Camera' })).not.toBeInTheDocument();
    expect(screen.getByText('Read only')).toBeInTheDocument();
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
