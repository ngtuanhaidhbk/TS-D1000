import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { useAuth } from '../shared/providers/auth-provider';
import { LoginPage } from './login-page';

vi.mock('../shared/providers/auth-provider', () => ({
  useAuth: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits trimmed credentials through auth provider', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
      user: null,
      token: null,
      authMessage: null,
      clearAuthMessage: vi.fn(),
      login,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: '  admin  ' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Admin123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('admin', 'Admin123!'));
  });

  it('shows required field errors and does not submit invalid form', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
      user: null,
      token: null,
      authMessage: null,
      clearAuthMessage: vi.fn(),
      login,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText('Username is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('shows bootstrap auth message when session has expired', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isBootstrapping: false,
      user: null,
      token: null,
      authMessage: 'Session expired. Please login again.',
      clearAuthMessage: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Session expired. Please login again.')).toBeInTheDocument();
  });
});
