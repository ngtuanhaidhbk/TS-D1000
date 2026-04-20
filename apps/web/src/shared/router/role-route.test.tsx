import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';

import { useAuth } from '../providers/auth-provider';
import { RoleRoute } from './role-route';

vi.mock('../providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

describe('RoleRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state while auth bootstrap is in progress', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: true,
      user: null,
      token: null,
      authMessage: null,
      clearAuthMessage: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <RoleRoute allowedRoles={['ADMIN']}>
          <div>Admin Page</div>
        </RoleRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading session...')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
      user: null,
      token: null,
      authMessage: null,
      clearAuthMessage: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route
            path="/admin-only"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <div>Admin Page</div>
              </RoleRoute>
            }
          />
          <Route path="/login" element={<div>Login Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Route')).toBeInTheDocument();
  });

  it('redirects operator to unauthorized page for admin-only route', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      user: {
        id: 'u-operator-001',
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

    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route
            path="/admin-only"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <div>Admin Page</div>
              </RoleRoute>
            }
          />
          <Route path="/unauthorized" element={<div>Access Denied</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });

  it('allows admin into admin-only route', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isBootstrapping: false,
      user: {
        id: 'u-admin-001',
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

    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <Routes>
          <Route
            path="/admin-only"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <div>Admin Page</div>
              </RoleRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });
});
