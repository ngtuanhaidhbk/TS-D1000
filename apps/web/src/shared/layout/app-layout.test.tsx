import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import { useAuth } from '../providers/auth-provider';
import { AppLayout } from './app-layout';

vi.mock('../providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows system configuration navigation for admin users and keeps admin-only entries visible', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      user: {
        id: 'u1',
        username: 'admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      token: 'jwt',
      authMessage: null,
      clearAuthMessage: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText('System Configuration')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('TS-D1000')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
  });

  it('keeps system configuration visible for operator users but hides admin-only entries', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      user: {
        id: 'u2',
        username: 'operator1',
        role: 'OPERATOR',
        status: 'ACTIVE',
      },
      token: 'jwt',
      authMessage: null,
      clearAuthMessage: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderWithRouter();

    expect(screen.getByText('System Configuration')).toBeInTheDocument();
    expect(screen.getByText('Readiness Check')).toBeInTheDocument();
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Logs')).not.toBeInTheDocument();
  });

  it('opens logout confirmation dialog before calling logout', () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      user: {
        id: 'u1',
        username: 'admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      token: 'jwt',
      authMessage: null,
      clearAuthMessage: vi.fn(),
      login: vi.fn(),
      logout,
    });

    renderWithRouter();

    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(screen.getByText('Are you sure you want to logout?')).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Logout' })[1]);
    expect(logout).toHaveBeenCalledTimes(1);
  });
});

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}
