export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
    public code = 'network-error',
  ) {
    super(message);
  }
}
export const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
export async function request<T>(path: string, data?: unknown, signal?: AbortSignal): Promise<T> {
  if (!apiBase)
    throw new ApiError(
      'The camera backend is not configured yet. You can explore the preview workspace.',
      0,
      'not-configured',
    );
  if (!path.startsWith('/api/')) throw new ApiError('Invalid API path.', 400);
  let response: Response;
  try {
    response = await fetch(apiBase + path, {
      method: data === undefined ? 'GET' : 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Hik-Local': '1' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: signal || AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError('The backend could not be reached. Check its address and connection.');
  }
  let result: Record<string, unknown>;
  try {
    result = await response.json();
  } catch {
    throw new ApiError(
      'The backend returned an unexpected response.',
      response.status,
      'invalid-response',
    );
  }
  if (!response.ok)
    throw new ApiError(
      typeof result.error === 'string' ? result.error : 'The request could not be completed.',
      response.status,
      typeof result.code === 'string' ? result.code : 'request-failed',
    );
  return result as T;
}
export const api = {
  status: () =>
    request<{
      authenticated: boolean;
      user?: { fullName: string; role: import('./model').Role };
      setupRequired: boolean;
    }>('/api/auth/status'),
  login: (email: string, password: string) =>
    request<{ authenticated: boolean }>('/api/auth/login', { email, password }),
  signup: (fullName: string, email: string, password: string, workspaceName: string) =>
    request('/api/auth/signup', { fullName, email, password, workspaceName }),
  logout: () => request('/api/auth/logout', {}),
  connect: (account: string, password: string, region: string, autoReconnect: boolean) =>
    request('/api/connect/personal', { account, password, region, autoReconnect }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/api/auth/password', { currentPassword, newPassword }),
};
