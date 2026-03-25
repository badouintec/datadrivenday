import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkPasswordResetToken: vi.fn(),
  checkVerificationToken: vi.fn(),
  deleteParticipant: vi.fn(),
  generatePasswordResetToken: vi.fn(),
  generateVerificationToken: vi.fn(),
  getParticipantByEmail: vi.fn(),
  getParticipantById: vi.fn(),
  getRateLimitCount: vi.fn(),
  hashPassword: vi.fn(),
  incrementRateLimitCount: vi.fn(),
  insertParticipant: vi.fn(),
  markEmailVerified: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  serializeParticipant: vi.fn((value) => value),
  updateParticipantLastLogin: vi.fn(),
  updateParticipantPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock('../src/lib/api/auth.ts', () => ({
  getClientIp: vi.fn(() => '203.0.113.10'),
  getRateLimitCount: mocks.getRateLimitCount,
  hashPassword: mocks.hashPassword,
  incrementRateLimitCount: mocks.incrementRateLimitCount,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock('../src/lib/server/db/participants.ts', () => ({
  deleteParticipant: mocks.deleteParticipant,
  getParticipantByEmail: mocks.getParticipantByEmail,
  getParticipantById: mocks.getParticipantById,
  insertParticipant: mocks.insertParticipant,
  markEmailVerified: mocks.markEmailVerified,
  serializeParticipant: mocks.serializeParticipant,
  updateParticipantLastLogin: mocks.updateParticipantLastLogin,
  updateParticipantPassword: mocks.updateParticipantPassword,
}));

vi.mock('../src/lib/server/email.ts', () => ({
  checkPasswordResetToken: mocks.checkPasswordResetToken,
  checkVerificationToken: mocks.checkVerificationToken,
  generatePasswordResetToken: mocks.generatePasswordResetToken,
  generateVerificationToken: mocks.generateVerificationToken,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  sendVerificationEmail: mocks.sendVerificationEmail,
}));

import {
  handleForgotPassword,
  handleParticipantSignup,
  handleResendVerification,
} from '../src/lib/api/participant-auth.ts';

function createContext(url, options = {}) {
  const request = new Request(url, options.requestInit);
  return {
    env: options.env,
    get: (key) => options.values?.[key],
    json: (payload, status = 200) => Response.json(payload, { status }),
    redirect: (location) => new Response(null, { status: 302, headers: { Location: location } }),
    req: {
      header: (name) => request.headers.get(name) ?? undefined,
      json: async () => (options.jsonBody ?? null),
      query: (name) => new URL(request.url).searchParams.get(name) ?? undefined,
      url: request.url,
    },
    set: vi.fn(),
  };
}

describe('participant auth hardening', () => {
  it('does not expose verificationDirectUrl during signup without explicit debug header', async () => {
    mocks.insertParticipant.mockResolvedValue({ id: 'p1', email: 'ana@example.com', fullName: 'Ana' });
    mocks.serializeParticipant.mockReturnValue({ id: 'p1', email: 'ana@example.com', fullName: 'Ana' });
    mocks.generateVerificationToken.mockResolvedValue('verify-token');

    const kv = {
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };

    const context = createContext('http://localhost/api/participant/signup', {
      env: { APP_SESSION: kv, DB: {} },
      jsonBody: { fullName: 'Ana', email: 'ana@example.com', password: 'supersegura123' },
    });

    const response = await handleParticipantSignup(context);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.verificationDirectUrl).toBeUndefined();
  });

  it('exposes verificationDirectUrl only with explicit debug header in local env', async () => {
    mocks.sendVerificationEmail.mockResolvedValue({ ok: false, error: 'domain_not_verified' });

    const context = createContext('http://localhost/api/participant/resend-verification', {
      env: { APP_SESSION: {}, RESEND_API_KEY: 'test-key' },
      requestInit: { headers: { 'X-DDD-Debug-Direct-Links': '1' } },
      values: {
        participant: { id: 'p1', email: 'ana@example.com', fullName: 'Ana', emailVerified: false },
      },
    });
    mocks.getRateLimitCount.mockResolvedValue(0);
    mocks.incrementRateLimitCount.mockResolvedValue(undefined);
    mocks.generateVerificationToken.mockResolvedValue('verify-token');

    const response = await handleResendVerification(context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.verificationDirectUrl).toBeUndefined();
    expect(payload.verificationError).toBe('domain_not_verified');
  });

  it('keeps resetDirectUrl behind explicit debug header', async () => {
    mocks.getRateLimitCount.mockResolvedValue(0);
    mocks.incrementRateLimitCount.mockResolvedValue(undefined);
    mocks.getParticipantByEmail.mockResolvedValue({ id: 'p1', email: 'ana@example.com', full_name: 'Ana' });
    mocks.serializeParticipant.mockReturnValue({ id: 'p1', email: 'ana@example.com', fullName: 'Ana' });
    mocks.generatePasswordResetToken.mockResolvedValue('reset-token');

    const context = createContext('http://localhost/api/participant/forgot-password', {
      env: { APP_SESSION: {}, DB: {} },
      jsonBody: { email: 'ana@example.com' },
    });

    const response = await handleForgotPassword(context);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.resetDirectUrl).toBeUndefined();
  });
});