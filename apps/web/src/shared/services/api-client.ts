type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
};

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiClientError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

async function request<T>(
  path: string,
  init?: RequestInit,
  token?: string | null,
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T> | ApiErrorEnvelope;

  if (!response.ok || !payload.success) {
    const error =
      'error' in payload
        ? payload.error
        : { code: 'INTERNAL_ERROR', message: 'Unknown API error', details: [] };
    throw new ApiClientError(error.code, error.message, error.details);
  }

  return payload.data;
}

export const apiClient = {
  get<T>(path: string, token?: string | null) {
    return request<T>(path, { method: 'GET' }, token);
  },
  post<T>(path: string, body?: unknown, token?: string | null) {
    return request<T>(
      path,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      token,
    );
  },
  put<T>(path: string, body?: unknown, token?: string | null) {
    return request<T>(
      path,
      {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      },
      token,
    );
  },
  patch<T>(path: string, body?: unknown, token?: string | null) {
    return request<T>(
      path,
      {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      },
      token,
    );
  },
  del<T>(path: string, token?: string | null) {
    return request<T>(path, { method: 'DELETE' }, token);
  },
  upload<T>(path: string, body: FormData, token?: string | null) {
    return request<T>(
      path,
      {
        method: 'POST',
        body,
      },
      token,
    );
  },
};
