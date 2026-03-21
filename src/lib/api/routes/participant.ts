import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { AppBindings, AppVariables } from '../types';
import {
  handleParticipantLogin,
  handleParticipantLogout,
  handleParticipantMe,
  handleParticipantSignup,
  normalizeOptionalUrl,
  requireParticipantAuth,
} from '../participant-auth';
import {
  getOpenTeams,
  getParticipantTeamById,
  getParticipantTeams,
  insertParticipantTeam,
  joinParticipantTeam,
  listParticipants,
  serializeParticipant,
  updateParticipantAdminFlags,
  updateParticipantProfile,
} from '../../server/db/participants';
import { buildParticipantRecognitionPdf } from '../../server/documents/participant-recognition';
import { getPublicRecursos } from '../../server/db/recursos';

type Env = { Bindings: Partial<AppBindings>; Variables: AppVariables };

export const participantRoutes = new Hono<Env>();

participantRoutes.post('/signup', handleParticipantSignup);
participantRoutes.post('/login', handleParticipantLogin);
participantRoutes.post('/logout', handleParticipantLogout);
participantRoutes.get('/me', requireParticipantAuth(), handleParticipantMe);

participantRoutes.get('/recognition', requireParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }

  if (!participant.workshopCompleted) {
    return c.json({ ok: false, error: 'workshop_pending' }, 403);
  }

  if (!participant.recognitionEnabled) {
    return c.json({ ok: false, error: 'recognition_locked' }, 403);
  }

  const { bytes, filename } = await buildParticipantRecognitionPdf(participant);
  const payload = Uint8Array.from(bytes);
  return new Response(payload.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
});

participantRoutes.get('/dashboard', requireParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  const recursos = await getPublicRecursos(c.env.DB!);
  const [myTeams, openTeams] = await Promise.all([
    getParticipantTeams(c.env.DB!, participant.id),
    getOpenTeams(c.env.DB!, participant.id),
  ]);

  return c.json({ ok: true, participant, recursos, myTeams, openTeams });
});

participantRoutes.patch('/profile', requireParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  if (!participant.profileEnabled && !participant.workshopCompleted) {
    return c.json({ ok: false, error: 'profile_locked' }, 403);
  }

  const body = await c.req.json<{
    occupation?: string;
    organization?: string;
    projectUrl?: string;
    bio?: string;
    avatarUrl?: string;
  }>().catch(() => null);

  if (!body) {
    return c.json({ ok: false, error: 'invalid_body' }, 400);
  }

  const projectUrl = normalizeOptionalUrl(body.projectUrl);
  const avatarUrl = normalizeOptionalUrl(body.avatarUrl);

  if (body.projectUrl?.trim() && !projectUrl) {
    return c.json({ ok: false, error: 'invalid_project_url' }, 400);
  }

  if (body.avatarUrl?.trim() && !avatarUrl) {
    return c.json({ ok: false, error: 'invalid_avatar_url' }, 400);
  }

  const updated = await updateParticipantProfile(c.env.DB!, participant.id, {
    ...body,
    projectUrl,
    avatarUrl,
  });
  if (!updated) {
    return c.json({ ok: false, error: 'not_found' }, 404);
  }

  return c.json({ ok: true, participant: serializeParticipant(updated) });
});

participantRoutes.get('/teams', requireParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  const [myTeams, openTeams] = await Promise.all([
    getParticipantTeams(c.env.DB!, participant.id),
    getOpenTeams(c.env.DB!, participant.id),
  ]);

  return c.json({ ok: true, myTeams, openTeams });
});

participantRoutes.post('/teams', requireParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  const body = await c.req.json<{ name: string; description?: string; focusArea?: string }>().catch(() => null);

  if (!body?.name) {
    return c.json({ ok: false, error: 'missing_name' }, 400);
  }

  const teamId = await insertParticipantTeam(c.env.DB!, {
    ownerId: participant.id,
    name: body.name,
    description: body.description,
    focusArea: body.focusArea,
  });

  return c.json({ ok: true, id: teamId }, 201);
});

participantRoutes.post('/teams/:id/join', requireParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  const teamId = c.req.param('id');
  if (!participant || !teamId) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }

  const team = await getParticipantTeamById(c.env.DB!, teamId);

  if (!team) {
    return c.json({ ok: false, error: 'not_found' }, 404);
  }

  if (!team.is_open) {
    return c.json({ ok: false, error: 'team_closed' }, 400);
  }

  await joinParticipantTeam(c.env.DB!, team.id, participant.id);
  return c.json({ ok: true });
});

export const adminParticipantsRoutes = new Hono<Env>();
adminParticipantsRoutes.use('*', requireAuth('participants:read'));

adminParticipantsRoutes.get('/', async (c) => {
  const participants = await listParticipants(c.env.DB!);
  return c.json({ ok: true, participants });
});

adminParticipantsRoutes.patch('/:id', requireAuth('participants:write'), async (c) => {
  const participantId = c.req.param('id');
  if (!participantId) {
    return c.json({ ok: false, error: 'missing_id' }, 400);
  }

  const body = await c.req.json<{
    workshopCompleted?: boolean;
    profileEnabled?: boolean;
    recognitionEnabled?: boolean;
    recognitionFolio?: string | null;
  }>().catch(() => null);

  if (!body) {
    return c.json({ ok: false, error: 'invalid_body' }, 400);
  }

  let recognitionFolio = body.recognitionFolio;
  if (body.recognitionEnabled && !recognitionFolio) {
    recognitionFolio = `DDD-2026-${participantId.slice(0, 8).toUpperCase()}`;
  }

  const updated = await updateParticipantAdminFlags(c.env.DB!, participantId, {
    workshopCompleted: body.workshopCompleted,
    profileEnabled: body.profileEnabled,
    recognitionEnabled: body.recognitionEnabled,
    recognitionFolio,
  });

  if (!updated) {
    return c.json({ ok: false, error: 'not_found' }, 404);
  }

  return c.json({ ok: true, participant: serializeParticipant(updated) });
});