import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { ApiClientError, apiClient } from '../../shared/services/api-client';

type AuthUser = {
  id: string;
  username: string;
  role: 'ADMIN' | 'OPERATOR';
  status: 'ACTIVE' | 'INACTIVE';
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  user: AuthUser | null;
  token: string | null;
  authMessage: string | null;
  clearAuthMessage: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const storageKey = 'tsd1000.foundation.auth';

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      setIsBootstrapping(false);
      return;
    }

    let parsed: { token: string } | null = null;
    try {
      parsed = JSON.parse(raw) as { token: string };
    } catch {
      window.localStorage.removeItem(storageKey);
      setIsBootstrapping(false);
      return;
    }

    if (!parsed?.token) {
      window.localStorage.removeItem(storageKey);
      setIsBootstrapping(false);
      return;
    }

    setToken(parsed.token);

    let cancelled = false;

    void apiClient
      .get<{
        user: AuthUser;
        session: {
          id: string;
          expiresAt: string;
        };
      }>('/auth/me', parsed.token)
      .then((response) => {
        if (cancelled) {
          return;
        }

        setUser(response.user);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setToken(null);
        setUser(null);
        window.localStorage.removeItem(storageKey);

        if (error instanceof ApiClientError) {
          setAuthMessage(mapAuthErrorToMessage(error));
        } else {
          setAuthMessage('Unable to connect. Please check network.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setAuthMessage(null);
    const response = await apiClient.post<{
      token: string;
      expiresAt: string;
      user: AuthUser;
    }>('/auth/login', {
      username,
      password,
    });

    setToken(response.token);
    setUser(response.user);
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        token: response.token,
      }),
    );
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout', undefined, token ?? undefined);
    } finally {
      setToken(null);
      setUser(null);
      setAuthMessage(null);
      window.localStorage.removeItem(storageKey);
      window.location.href = '/login';
    }
  }, [token]);

  const clearAuthMessage = useCallback(() => {
    setAuthMessage(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(token && user),
      isBootstrapping,
      token,
      user,
      authMessage,
      clearAuthMessage,
      login,
      logout,
    }),
    [authMessage, clearAuthMessage, isBootstrapping, login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function mapAuthErrorToMessage(error: ApiClientError): string {
  switch (error.code) {
    case 'SESSION_EXPIRED':
      return 'Session expired. Please login again.';
    case 'SESSION_REVOKED':
    case 'UNAUTHORIZED':
      return 'Session expired. Please login again.';
    case 'USER_INACTIVE':
      return 'User account is inactive';
    default:
      return error.message;
  }
}
