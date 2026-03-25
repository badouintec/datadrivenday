import { describe, expect, it } from 'vitest';

import { getClientIp } from '../src/lib/api/auth.ts';

function createReq(headers = {}) {
  return {
    header(name) {
      const direct = headers[name];
      if (typeof direct === 'string') return direct;
      const lowered = headers[name.toLowerCase()];
      return typeof lowered === 'string' ? lowered : undefined;
    },
  };
}

describe('auth utils', () => {
  it('returns the first valid forwarded ip', () => {
    const req = createReq({ 'X-Forwarded-For': '203.0.113.10, 10.0.0.1' });
    expect(getClientIp(req)).toBe('203.0.113.10');
  });

  it('ignores invalid ip headers and falls back to a deterministic fingerprint', () => {
    const req = createReq({
      'CF-Connecting-IP': 'not-an-ip',
      'User-Agent': 'Vitest Browser',
      'Accept-Language': 'es-MX',
    });

    expect(getClientIp(req)).toMatch(/^fingerprint:/);
    expect(getClientIp(req)).toBe(getClientIp(req));
  });
});