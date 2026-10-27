import type { Principal } from './model';
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
let viewerId: string | null = null,
  connectionId: string | null = null;
export function bindViewer(id: string | null) {
  viewerId = id;
  connectionId = null;
}
export function currentViewerId() {
  return viewerId;
}
export function bindProvider(id: string | null) {
  connectionId = id;
}
export function apiUrl(path: string) {
  if (!apiBase)
    throw new ApiError(
      'Configure NEXT_PUBLIC_API_BASE_URL to connect the Windows API.',
      0,
      'not-configured',
    );
  if (!path.startsWith('/api/')) throw new ApiError('Invalid API path.', 400);
  return apiBase + path;
}
export function streamUrl(path: string) {
  const q = new URLSearchParams();
  if (viewerId) q.set('user', viewerId);
  if (connectionId) q.set('connection', connectionId);
  return apiUrl(path) + (q.size ? '?' + q : '');
}
export async function request<T = any>(
  path: string,
  data?: unknown,
  signal?: AbortSignal,
  method?: 'GET' | 'POST' | 'DELETE',
): Promise<T> {
  const timeoutMs =
    path.includes('/live/start') || path.includes('/previews/') || path.includes('/connect/')
      ? 60000
      : path === '/api/auth/status' || path === '/api/health'
        ? 5000
        : 10000;
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: method || (data === undefined ? 'GET' : 'POST'),
      credentials: 'include',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-Hik-Local': '1',
        ...(viewerId ? { 'X-Saas-User': viewerId } : {}),
        ...(connectionId && path.startsWith('/api/live/')
          ? { 'X-Hik-Connection': connectionId }
          : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof ApiError || (error instanceof Error && error.name === 'AbortError'))
      throw error;
    throw new ApiError('The backend could not be reached. Check its connection.');
  }
  let result: any;
  try {
    result = await response.json();
  } catch {
    throw new ApiError('Unexpected API response.', response.status, 'invalid-response');
  }
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined')
      window.dispatchEvent(new Event('rgu-session-expired'));
    throw new ApiError(result.error || 'The request failed.', response.status, result.code);
  }
  return result as T;
}
export const api = {
  status: () =>
    request<{ authenticated: boolean; user: Principal | null; setupRequired: boolean }>(
      '/api/auth/status',
    ),
  login: (email: string, password: string) => request('/api/auth/login', { email, password }),
  googleLogin: (credential: string) => request('/api/auth/google/login', { credential }),
  linkGoogle: (credential: string) => request('/api/auth/google/link', { credential }),
  googleStatus: () => request<{ linked: boolean }>('/api/auth/google/status'),
  unlinkGoogle: () => request('/api/auth/google/unlink', {}),
  setup: (fullName: string, email: string, password: string) =>
    request('/api/auth/setup', { fullName, email, password }),
  signup: (fullName: string, email: string, password: string, workspaceName: string) =>
    request('/api/auth/signup', { fullName, email, password, workspaceName }),
  logout: () => request('/api/auth/logout', {}),
  connect: (account: string, password: string, origin: string, autoReconnect: boolean) =>
    request('/api/connect/personal', {
      account,
      password,
      origin,
      automaticReconnect: autoReconnect,
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/api/auth/password', { currentPassword, newPassword }),
};
export const fleetApi = {
  buses: () => request('/api/fleet/buses'),
  saveBus: (bus: import('./fleet').Bus) =>
    request('/api/fleet/buses', { ...bus, ...(!bus.id ? { id: undefined } : {}) }),
  removeBus: (id: string) => request('/api/fleet/buses/remove', { id }),
  telemetry: () => request<import('./fleet').TelemetryEnvelope>('/api/fleet/telemetry'),
  pollWheelseye: () => request('/api/fleet/vendor/poll', {}),
  wheelseyeSources: () => request('/api/fleet/wheelseye/sources'),
  addWheelseyeSource: (label: string, url: string) =>
    request('/api/fleet/wheelseye/sources', { label, url }),
  removeWheelseyeSource: (id: string) =>
    request(
      '/api/fleet/wheelseye/sources/' + encodeURIComponent(id),
      undefined,
      undefined,
      'DELETE',
    ),
  history: (busId: string, from: number, to: number, signal?: AbortSignal) =>
    request<{
      samples: {
        vehicle: import('./fleet').Vehicle;
        source: 'vendor';
        receivedAt: string;
      }[];
    }>(
      '/api/fleet/history?' + new URLSearchParams({ busId, from: String(from), to: String(to) }),
      undefined,
      signal,
    ),
};
export async function uploadRecording(
  blob: Blob,
  metadata: unknown,
  signal?: AbortSignal,
  expectedUser = viewerId,
) {
  const res = await fetch(apiUrl('/api/recordings'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-Hik-Local': '1',
      'Content-Type': blob.type || 'video/webm',
      'X-Recording-Id': crypto.randomUUID(),
      'X-Recording-Meta': encodeURIComponent(JSON.stringify(metadata)),
      ...(expectedUser ? { 'X-Saas-User': expectedUser } : {}),
    },
    body: blob,
    signal,
  });
  const value = await res.json();
  if (!res.ok)
    throw new ApiError(value.error || 'Recording upload failed.', res.status, value.code);
  return value;
}
