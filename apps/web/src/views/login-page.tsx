import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { ApiClientError } from '../shared/services/api-client';
import { useAuth } from '../shared/providers/auth-provider';

export function LoginPage() {
  const { isAuthenticated, isBootstrapping, login, authMessage, clearAuthMessage } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isBootstrapping) {
    return <div className="auth-loading">Loading session...</div>;
  }

  if (isAuthenticated) {
    return <Navigate replace to="/" />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    clearAuthMessage();

    const nextFieldErrors: { username?: string; password?: string } = {};
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      nextFieldErrors.username = 'Username is required';
    }

    if (!password) {
      nextFieldErrors.password = 'Password is required';
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(normalizedUsername, password);
    } catch (submissionError) {
      setError(mapLoginErrorToMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <p className="eyebrow">Authentication</p>
        <h1>Login</h1>
        <label className="field">
          <span>Username</span>
          <input
            autoFocus
            value={username}
            onBlur={() =>
              setFieldErrors((current) => ({
                ...current,
                username: username.trim() ? undefined : 'Username is required',
              }))
            }
            onChange={(event) => {
              setUsername(event.target.value);
              clearAuthMessage();
              setFieldErrors((current) => ({
                ...current,
                username: event.target.value.trim() ? undefined : current.username,
              }));
            }}
          />
          {fieldErrors.username ? <span className="field-error">{fieldErrors.username}</span> : null}
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onBlur={() =>
              setFieldErrors((current) => ({
                ...current,
                password: password ? undefined : 'Password is required',
              }))
            }
            onChange={(event) => {
              setPassword(event.target.value);
              clearAuthMessage();
              setFieldErrors((current) => ({
                ...current,
                password: event.target.value ? undefined : current.password,
              }));
            }}
          />
          {fieldErrors.password ? <span className="field-error">{fieldErrors.password}</span> : null}
        </label>
        {authMessage ? <div className="error-banner">{authMessage}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

function mapLoginErrorToMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Invalid username or password';
      case 'USER_INACTIVE':
        return 'User account is inactive';
      default:
        return 'System error';
    }
  }

  if (error instanceof Error) {
    return 'Unable to connect. Please check network.';
  }

  return 'System error';
}
