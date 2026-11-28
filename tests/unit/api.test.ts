import { describe, it, expect, vi, afterEach } from 'vitest';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe('separate backend boundary', () => {
  it('does not send credentials anywhere without a configured backend', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const { request } = await import('../../src/lib/api');
    await expect(request('/api/auth/login', {})).rejects.toMatchObject({ code: 'not-configured' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('keeps credentials in a POST body and uses cookie credentials', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.test/');
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ authenticated: true })));
    vi.stubGlobal('fetch', fetcher);
    const { api } = await import('../../src/lib/api');
    await api.login('viewer@example.test', 'example-only-test-value');
    expect(fetcher.mock.calls[0][0]).toBe('https://api.example.test/api/auth/login');
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Hik-Local': '1' },
    });
    expect(fetcher.mock.calls[0][1].body).toContain('viewer@example.test');
  });
  it('sends the provider origin and durable recovery opt-in using backend field names', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.test');
    const fetcher = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetcher);
    const { api } = await import('../../src/lib/api');
    await api.connect(
      'provider@example.test',
      'synthetic-only',
      'https://iindia.hik-connect.com',
      true,
    );
    const input = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(input).toMatchObject({
      origin: 'https://iindia.hik-connect.com',
      automaticReconnect: true,
    });
    expect(input).not.toHaveProperty('autoReconnect');
  });
  it('uses the dedicated driver API routes without moving driver data into browser storage', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.test');
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ drivers: [] }))),
    );
    vi.stubGlobal('fetch', fetcher);
    const { fleetApi } = await import('../../src/lib/api');
    await fleetApi.drivers();
    await fleetApi.saveDriver({ fullName: 'Test Driver', phone: '9000000000', status: 'active' });
    await fleetApi.assignDriver('bus-id', 'driver-id');
    await fleetApi.removeDriver('driver-id');
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      'https://api.example.test/api/fleet/drivers',
      'https://api.example.test/api/fleet/drivers',
      'https://api.example.test/api/fleet/drivers/assign',
      'https://api.example.test/api/fleet/drivers/remove',
    ]);
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({ busId: 'bus-id', driverId: 'driver-id' });
  });
  it('uses the dedicated route API routes without putting route records in browser storage', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.test');
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ routes: [] }))),
    );
    vi.stubGlobal('fetch', fetcher);
    const { fleetApi } = await import('../../src/lib/api');
    await fleetApi.routes();
    await fleetApi.saveRoute({ name: 'Campus loop', description: 'Main service', status: 'active' });
    await fleetApi.assignRoute('bus-id', 'route-id');
    await fleetApi.removeRoute('route-id');
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      'https://api.example.test/api/fleet/routes',
      'https://api.example.test/api/fleet/routes',
      'https://api.example.test/api/fleet/routes/assign',
      'https://api.example.test/api/fleet/routes/remove',
    ]);
    expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({ busId: 'bus-id', routeId: 'route-id' });
  });
  it('retains authorization error codes', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Sign in again.', code: 'viewer-auth-required' }), {
          status: 401,
        }),
      ),
    );
    const { request } = await import('../../src/lib/api');
    await expect(request('/api/auth/status')).rejects.toMatchObject({
      status: 401,
      code: 'viewer-auth-required',
      message: 'Sign in again.',
    });
  });
  it('reports malformed server responses without exposing body text', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private-response')));
    const { request } = await import('../../src/lib/api');
    await expect(request('/api/auth/status')).rejects.toMatchObject({ code: 'invalid-response' });
  });
  it('surfaces the HTTP status when the API proxy answers with a non-JSON error', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '/rgu');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Infinite loop detected', { status: 508 })),
    );
    const { request } = await import('../../src/lib/api');
    await expect(request('/api/auth/status')).rejects.toMatchObject({
      status: 508,
      code: 'invalid-response',
      message: 'Unexpected API response (HTTP 508) from the fleet service.',
    });
  });
  it('rejects non-API routes and reports network failure', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Error('internal-error')));
    const { request } = await import('../../src/lib/api');
    await expect(request('/other')).rejects.toMatchObject({ status: 400 });
    await expect(request('/api/auth/status')).rejects.toThrow('The backend could not be reached');
  });
});
