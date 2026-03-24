import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentParticipant: {
    id: 'participant-1',
    datallerRegistered: true,
    emailVerified: true,
    fullName: 'Ana Torres',
    workshopCompleted: false,
  },
  getOpenTeams: vi.fn(),
  getParticipantTeamById: vi.fn(),
  getParticipantTeams: vi.fn(),
  getPresentation: vi.fn(),
  getPresentations: vi.fn(),
  getPublicRecursos: vi.fn(),
  getRateLimitCount: vi.fn(),
  getSlides: vi.fn(),
  incrementRateLimitCount: vi.fn(),
  insertParticipantTeam: vi.fn(),
  insertPresentationComment: vi.fn(),
  joinParticipantTeam: vi.fn(),
  listDatallerParticipants: vi.fn(),
  listParticipants: vi.fn(),
  listPresentationComments: vi.fn(),
  serializeParticipant: vi.fn((participant) => participant),
  updateParticipantAdminFlags: vi.fn(),
  updateParticipantDatallerRegistration: vi.fn(),
  updateParticipantProfile: vi.fn(),
}));

vi.mock('../src/lib/api/auth.ts', () => ({
  getRateLimitCount: mocks.getRateLimitCount,
  incrementRateLimitCount: mocks.incrementRateLimitCount,
  requireAuth: () => async (_c, next) => next(),
}));

vi.mock('../src/lib/api/participant-auth.ts', () => ({
  handleDeleteAccount: vi.fn(),
  handleForgotPassword: vi.fn(),
  handleParticipantLogin: vi.fn(),
  handleParticipantLogout: vi.fn(),
  handleParticipantMe: vi.fn(),
  handleParticipantSignup: vi.fn(),
  handleResendVerification: vi.fn(),
  handleResetPassword: vi.fn(),
  handleVerifyEmail: vi.fn(),
  normalizeOptionalUrl: (value) => {
    const trimmed = String(value ?? '').trim();
    if (!trimmed) return null;
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : null;
  },
  requireParticipantAuth: () => async (c, next) => {
    c.set('participant', mocks.currentParticipant);
    await next();
  },
  requireVerifiedParticipantAuth: () => async (c, next) => {
    c.set('participant', mocks.currentParticipant);
    await next();
  },
}));

vi.mock('../src/lib/server/db/participants.ts', () => ({
  getOpenTeams: mocks.getOpenTeams,
  getParticipantTeamById: mocks.getParticipantTeamById,
  getParticipantTeams: mocks.getParticipantTeams,
  insertParticipantTeam: mocks.insertParticipantTeam,
  insertPresentationComment: mocks.insertPresentationComment,
  joinParticipantTeam: mocks.joinParticipantTeam,
  listDatallerParticipants: mocks.listDatallerParticipants,
  listParticipants: mocks.listParticipants,
  listPresentationComments: mocks.listPresentationComments,
  serializeParticipant: mocks.serializeParticipant,
  updateParticipantAdminFlags: mocks.updateParticipantAdminFlags,
  updateParticipantDatallerRegistration: mocks.updateParticipantDatallerRegistration,
  updateParticipantProfile: mocks.updateParticipantProfile,
}));

vi.mock('../src/lib/server/db/slides.ts', () => ({
  getPresentation: mocks.getPresentation,
  getPresentations: mocks.getPresentations,
  getSlides: mocks.getSlides,
}));

vi.mock('../src/lib/server/db/recursos.ts', () => ({
  getPublicRecursos: mocks.getPublicRecursos,
}));

import { adminParticipantsRoutes, participantRoutes } from '../src/lib/api/routes/participant.ts';

function createEnv(memberCount = 0) {
  return {
    APP_SESSION: {},
    DB: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({ count: memberCount }),
        })),
      })),
    },
  };
}

async function readJson(response) {
  return response.json();
}

describe('participant routes', () => {
  beforeEach(() => {
    mocks.currentParticipant = {
      id: 'participant-1',
      datallerRegistered: true,
      emailVerified: true,
      fullName: 'Ana Torres',
      workshopCompleted: false,
    };

    mocks.getOpenTeams.mockResolvedValue([]);
    mocks.getParticipantTeamById.mockResolvedValue({ id: 'team-1', is_open: true });
    mocks.getParticipantTeams.mockResolvedValue([]);
    mocks.getPresentation.mockResolvedValue({ id: 'pres-dataller-2026', estado: 'publicado' });
    mocks.getPresentations.mockResolvedValue([]);
    mocks.getPublicRecursos.mockResolvedValue([]);
    mocks.getRateLimitCount.mockResolvedValue(0);
    mocks.getSlides.mockResolvedValue([]);
    mocks.incrementRateLimitCount.mockResolvedValue(undefined);
    mocks.insertParticipantTeam.mockResolvedValue('team-1');
    mocks.insertPresentationComment.mockResolvedValue({ id: 'comment-1', body: 'Hola mundo' });
    mocks.joinParticipantTeam.mockResolvedValue(undefined);
    mocks.listDatallerParticipants.mockResolvedValue([]);
    mocks.listParticipants.mockResolvedValue([]);
    mocks.listPresentationComments.mockResolvedValue([]);
    mocks.serializeParticipant.mockImplementation((participant) => participant);
    mocks.updateParticipantAdminFlags.mockResolvedValue(null);
    mocks.updateParticipantDatallerRegistration.mockResolvedValue(null);
    mocks.updateParticipantProfile.mockResolvedValue(null);
  });

  it('rejects Dataller comments when the participant hits the comment rate limit', async () => {
    mocks.getRateLimitCount.mockResolvedValue(5);

    const response = await participantRoutes.request(
      'http://localhost/dataller/comments',
      {
        method: 'POST',
        body: JSON.stringify({ presentacionId: 'pres-dataller-2026', body: 'Comentario con contexto' }),
        headers: { 'Content-Type': 'application/json' },
      },
      createEnv(),
    );
    const payload = await readJson(response);

    expect(response.status).toBe(429);
    expect(payload).toEqual({ ok: false, error: 'too_many_attempts' });
    expect(mocks.incrementRateLimitCount).not.toHaveBeenCalled();
    expect(mocks.insertPresentationComment).not.toHaveBeenCalled();
  });

  it('creates a Dataller comment when under the rate limit', async () => {
    const response = await participantRoutes.request(
      'http://localhost/dataller/comments',
      {
        method: 'POST',
        body: JSON.stringify({ presentacionId: 'pres-dataller-2026', body: 'Comentario con contexto' }),
        headers: { 'Content-Type': 'application/json' },
      },
      createEnv(),
    );
    const payload = await readJson(response);

    expect(response.status).toBe(201);
    expect(mocks.incrementRateLimitCount).toHaveBeenCalledWith(
      expect.any(Object),
      'participant-comment:participant-1',
      60,
    );
    expect(mocks.insertPresentationComment).toHaveBeenCalledWith(expect.any(Object), {
      participantId: 'participant-1',
      presentacionId: 'pres-dataller-2026',
      body: 'Comentario con contexto',
    });
    expect(payload).toEqual({ ok: true, comment: { id: 'comment-1', body: 'Hola mundo' } });
  });

  it('rejects team creation when the participant hits the create-team rate limit', async () => {
    mocks.getRateLimitCount.mockResolvedValue(3);

    const response = await participantRoutes.request(
      'http://localhost/teams',
      {
        method: 'POST',
        body: JSON.stringify({ name: 'Equipo Sonora' }),
        headers: { 'Content-Type': 'application/json' },
      },
      createEnv(),
    );
    const payload = await readJson(response);

    expect(response.status).toBe(429);
    expect(payload).toEqual({ ok: false, error: 'too_many_attempts' });
    expect(mocks.insertParticipantTeam).not.toHaveBeenCalled();
  });

  it('joins an open team and consumes the join-team rate limit counter', async () => {
    const env = createEnv(4);
    const response = await participantRoutes.request(
      'http://localhost/teams/team-1/join',
      {
        method: 'POST',
      },
      env,
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(mocks.incrementRateLimitCount).toHaveBeenCalledWith(
      expect.any(Object),
      'participant-team-join:participant-1',
      900,
    );
    expect(mocks.joinParticipantTeam).toHaveBeenCalledWith(expect.any(Object), 'team-1', 'participant-1');
    expect(payload).toEqual({ ok: true });
  });

  it('returns the recognition eligibility error that matches the participant state', async () => {
    mocks.currentParticipant = {
      ...mocks.currentParticipant,
      datallerRegistered: false,
      workshopCompleted: false,
      recognitionEnabled: false,
    };

    const response = await participantRoutes.request(
      'http://localhost/recognition',
      { method: 'GET' },
      createEnv(),
    );
    const payload = await readJson(response);

    expect(response.status).toBe(403);
    expect(payload).toEqual({ ok: false, error: 'dataller_required' });
  });

  it('updates the Dataller registration state and serializes the participant response', async () => {
    mocks.updateParticipantDatallerRegistration.mockResolvedValue({
      id: 'participant-1',
      datallerRegistered: false,
      fullName: 'Ana Torres',
    });

    const response = await participantRoutes.request(
      'http://localhost/dataller',
      {
        method: 'PATCH',
        body: JSON.stringify({ datallerRegistered: false }),
        headers: { 'Content-Type': 'application/json' },
      },
      createEnv(),
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(mocks.updateParticipantDatallerRegistration).toHaveBeenCalledWith(
      expect.any(Object),
      'participant-1',
      false,
    );
    expect(mocks.serializeParticipant).toHaveBeenCalledWith({
      id: 'participant-1',
      datallerRegistered: false,
      fullName: 'Ana Torres',
    });
    expect(payload).toEqual({
      ok: true,
      participant: {
        id: 'participant-1',
        datallerRegistered: false,
        fullName: 'Ana Torres',
      },
    });
  });

  it('builds the Dataller workspace payload with only active slides', async () => {
    mocks.getSlides.mockResolvedValue([
      {
        id: 'slide-1',
        numero: 1,
        tag: 'Intro',
        titulo: 'Uno',
        subtitulo: 'Primero',
        cuerpo: 'Contenido',
        conceptosClave: ['Dato'],
        referencias: [],
        accentColor: '#000',
        isActive: true,
      },
      {
        id: 'slide-2',
        numero: 2,
        tag: 'Oculta',
        titulo: 'Dos',
        subtitulo: 'Segundo',
        cuerpo: 'Oculto',
        conceptosClave: ['Privado'],
        referencias: [],
        accentColor: '#111',
        isActive: false,
      },
    ]);
    mocks.listPresentationComments.mockResolvedValue([{ id: 'comment-1' }]);
    mocks.listDatallerParticipants.mockResolvedValue([{ id: 'member-1' }]);

    const response = await participantRoutes.request(
      'http://localhost/dataller/workspace',
      { method: 'GET' },
      createEnv(),
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload.presentation.slides).toHaveLength(1);
    expect(payload.presentation.slides[0]).toEqual({
      id: 'slide-1',
      numero: 1,
      tag: 'Intro',
      titulo: 'Uno',
      subtitulo: 'Primero',
      cuerpo: 'Contenido',
      conceptosClave: ['Dato'],
      referencias: [],
      accentColor: '#000',
    });
    expect(payload.comments).toEqual([{ id: 'comment-1' }]);
    expect(payload.members).toEqual([{ id: 'member-1' }]);
  });

  it('rejects profile updates when the project URL is invalid', async () => {
    mocks.currentParticipant = {
      ...mocks.currentParticipant,
      profileEnabled: true,
    };

    const response = await participantRoutes.request(
      'http://localhost/profile',
      {
        method: 'PATCH',
        body: JSON.stringify({ projectUrl: 'nota-url-valida' }),
        headers: { 'Content-Type': 'application/json' },
      },
      createEnv(),
    );
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({ ok: false, error: 'invalid_project_url' });
    expect(mocks.updateParticipantProfile).not.toHaveBeenCalled();
  });

  it('filters and paginates admin participants by search term', async () => {
    mocks.listParticipants.mockResolvedValue([
      { id: 'p-1', email: 'ana@datadriven.day', fullName: 'Ana Torres' },
      { id: 'p-2', email: 'bruno@datadriven.day', fullName: 'Bruno Diaz' },
      { id: 'p-3', email: 'ana.maria@datadriven.day', fullName: 'Ana Maria' },
    ]);

    const response = await adminParticipantsRoutes.request(
      'http://localhost/?search=ana&limit=1&offset=1',
      { method: 'GET' },
      createEnv(),
    );
    const payload = await readJson(response);

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      participants: [{ id: 'p-3', email: 'ana.maria@datadriven.day', fullName: 'Ana Maria' }],
      pagination: {
        limit: 1,
        offset: 1,
        returned: 1,
        total: 2,
      },
    });
  });

  it('rejects invalid admin participants pagination parameters', async () => {
    const response = await adminParticipantsRoutes.request(
      'http://localhost/?limit=0',
      { method: 'GET' },
      createEnv(),
    );
    const payload = await readJson(response);

    expect(response.status).toBe(400);
    expect(payload).toEqual({ ok: false, error: 'invalid_limit' });
  });
});