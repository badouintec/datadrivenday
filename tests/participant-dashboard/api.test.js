import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchDashboard,
  signupParticipant,
} from '../../public/scripts/participant-dashboard/api.js';

describe('participant dashboard api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetchDashboard requests the dashboard endpoint and parses json', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: { get: () => 'application/json; charset=utf-8' },
      json: vi.fn().mockResolvedValue({ participant: { id: 'p-1' } }),
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', fetchMock);

    const { response, data } = await fetchDashboard();

    expect(fetchMock).toHaveBeenCalledWith('/api/participant/dashboard', undefined);
    expect(response.ok).toBe(true);
    expect(data).toEqual({ participant: { id: 'p-1' } });
  });

  it('signupParticipant sends json payload with the expected method and headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: { get: () => 'application/json' },
      json: vi.fn().mockResolvedValue({ ok: true }),
      ok: true,
      status: 200,
    });
    vi.stubGlobal('fetch', fetchMock);

    await signupParticipant({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'super-secret',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/participant/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'super-secret',
      }),
    });
  });
});