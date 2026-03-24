import { Hono } from 'hono';
import { getRateLimitCount, incrementRateLimitCount, requireAuth } from '../auth';
import type { AppBindings, AppVariables } from '../types';
import {
  handleParticipantLogin,
  handleParticipantLogout,
  handleParticipantMe,
  handleParticipantSignup,
  handleResendVerification,
  handleVerifyEmail,
  handleForgotPassword,
  handleResetPassword,
  handleDeleteAccount,
  normalizeOptionalUrl,
  requireParticipantAuth,
  requireVerifiedParticipantAuth,
} from '../participant-auth';
import {
  getOpenTeams,
  getParticipantTeamById,
  getParticipantTeams,
  insertParticipantTeam,
  insertPresentationComment,
  joinParticipantTeam,
  listDatallerParticipants,
  listParticipants,
  listPresentationComments,
  serializeParticipant,
  updateParticipantAdminFlags,
  updateParticipantDatallerRegistration,
  updateParticipantProfile,
} from '../../server/db/participants';
import { getPublicRecursos } from '../../server/db/recursos';
import { getPresentation, getPresentations, getSlides } from '../../server/db/slides';

type Env = { Bindings: Partial<AppBindings>; Variables: AppVariables };

const COMMENT_RATE_LIMIT = { max: 5, ttlSeconds: 60 };
const TEAM_CREATE_RATE_LIMIT = { max: 3, ttlSeconds: 3600 };
const TEAM_JOIN_RATE_LIMIT = { max: 10, ttlSeconds: 900 };

export const participantRoutes = new Hono<Env>();

async function consumeParticipantRateLimit(
  kv: KVNamespace | undefined,
  key: string,
  limit: { max: number; ttlSeconds: number },
) {
  if (!kv) return true;

  const attempts = await getRateLimitCount(kv, key, limit.ttlSeconds);
  if (attempts >= limit.max) {
    return false;
  }

  await incrementRateLimitCount(kv, key, limit.ttlSeconds);
  return true;
}

async function getParticipantWorkspacePresentation(db: D1Database) {
  const preferredPresentationId = 'pres-dataller-2026';
  const preferredPresentation = await getPresentation(db, preferredPresentationId);

  if (preferredPresentation && preferredPresentation.estado !== 'archivado') {
    return preferredPresentation;
  }

  return (await getPresentations(db)).find((presentation) => presentation.estado !== 'archivado') ?? null;
}

participantRoutes.post('/signup', handleParticipantSignup);
participantRoutes.post('/login', handleParticipantLogin);
participantRoutes.post('/logout', handleParticipantLogout);
participantRoutes.get('/me', requireParticipantAuth(), handleParticipantMe);
participantRoutes.get('/verify-email', handleVerifyEmail);
participantRoutes.post('/resend-verification', requireParticipantAuth(), handleResendVerification);
participantRoutes.post('/forgot-password', handleForgotPassword);
participantRoutes.post('/reset-password', handleResetPassword);
participantRoutes.delete('/account', requireParticipantAuth(), handleDeleteAccount);

// PDF is now generated client-side (src/lib/client/recognition-pdf.ts).
// This endpoint is kept only as a validation check (e.g. for future API consumers).
participantRoutes.get('/recognition', requireVerifiedParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  if (!participant.datallerRegistered) {
    return c.json({ ok: false, error: 'dataller_required' }, 403);
  }
  if (!participant.workshopCompleted) {
    return c.json({ ok: false, error: 'workshop_pending' }, 403);
  }
  if (!participant.recognitionEnabled) {
    return c.json({ ok: false, error: 'recognition_locked' }, 403);
  }
  return c.json({ ok: true });
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

  return c.json({
    ok: true,
    participant,
    recursos,
    myTeams,
    openTeams,
    verificationEmailAvailable: Boolean(c.env.RESEND_API_KEY),
  });
});

participantRoutes.patch('/dataller', requireVerifiedParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }

  const body = await c.req.json<{ datallerRegistered?: boolean }>().catch(() => null);
  if (!body || typeof body.datallerRegistered !== 'boolean') {
    return c.json({ ok: false, error: 'invalid_body' }, 400);
  }

  const updated = await updateParticipantDatallerRegistration(
    c.env.DB!,
    participant.id,
    body.datallerRegistered,
  );

  if (!updated) {
    return c.json({ ok: false, error: 'not_found' }, 404);
  }

  return c.json({ ok: true, participant: serializeParticipant(updated) });
});

participantRoutes.get('/dataller/workspace', requireVerifiedParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }

  if (!participant.datallerRegistered) {
    return c.json({ ok: false, error: 'dataller_required' }, 403);
  }

  const presentation = await getParticipantWorkspacePresentation(c.env.DB!);

  if (!presentation) {
    return c.json({ ok: true, presentation: null, comments: [], members: [] });
  }

  const [slides, comments, members] = await Promise.all([
    getSlides(c.env.DB!, presentation.id),
    listPresentationComments(c.env.DB!, presentation.id),
    listDatallerParticipants(c.env.DB!, participant.id),
  ]);

  return c.json({
    ok: true,
    presentation: {
      id: presentation.id,
      nombre: presentation.nombre,
      descripcion: presentation.descripcion,
      estado: presentation.estado,
      slides: slides
        .filter((slide) => slide.isActive)
        .map((slide) => ({
          id: slide.id,
          numero: slide.numero,
          tag: slide.tag,
          titulo: slide.titulo,
          subtitulo: slide.subtitulo,
          cuerpo: slide.cuerpo,
          conceptosClave: slide.conceptosClave,
          referencias: slide.referencias,
          accentColor: slide.accentColor,
        })),
    },
    comments,
    members,
  });
});

participantRoutes.post('/dataller/comments', requireVerifiedParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }

  if (!participant.datallerRegistered) {
    return c.json({ ok: false, error: 'dataller_required' }, 403);
  }

  const body = await c.req.json<{ presentacionId?: string; body?: string }>().catch(() => null);
  const commentBody = body?.body?.trim();
  const presentacionId = body?.presentacionId?.trim();

  if (!presentacionId || !commentBody) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }

  if (commentBody.length < 3 || commentBody.length > 800) {
    return c.json({ ok: false, error: 'invalid_length' }, 400);
  }

  const canComment = await consumeParticipantRateLimit(
    c.env.APP_SESSION,
    `participant-comment:${participant.id}`,
    COMMENT_RATE_LIMIT,
  );
  if (!canComment) {
    return c.json({ ok: false, error: 'too_many_attempts' }, 429);
  }

  const presentation = await getParticipantWorkspacePresentation(c.env.DB!);
  if (!presentation || presentation.id !== presentacionId) {
    return c.json({ ok: false, error: 'presentation_not_found' }, 404);
  }

  const comment = await insertPresentationComment(c.env.DB!, {
    participantId: participant.id,
    presentacionId,
    body: commentBody,
  });

  if (!comment) {
    return c.json({ ok: false, error: 'comment_not_created' }, 500);
  }

  return c.json({ ok: true, comment }, 201);
});

participantRoutes.patch('/profile', requireVerifiedParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  if (!participant.profileEnabled && !participant.workshopCompleted) {
    return c.json({ ok: false, error: 'profile_locked' }, 403);
  }

  const body = await c.req.json<{
    fullName?: string;
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
  const fullName = body.fullName?.trim();

  if (body.fullName !== undefined && !fullName) {
    return c.json({ ok: false, error: 'invalid_full_name' }, 400);
  }

  if (fullName && fullName.length > 120) {
    return c.json({ ok: false, error: 'invalid_full_name' }, 400);
  }

  if (body.occupation && body.occupation.trim().length > 120) {
    return c.json({ ok: false, error: 'invalid_field' }, 400);
  }

  if (body.organization && body.organization.trim().length > 120) {
    return c.json({ ok: false, error: 'invalid_field' }, 400);
  }

  if (body.bio && body.bio.trim().length > 500) {
    return c.json({ ok: false, error: 'invalid_field' }, 400);
  }

  if (body.projectUrl?.trim() && !projectUrl) {
    return c.json({ ok: false, error: 'invalid_project_url' }, 400);
  }

  if (body.avatarUrl?.trim() && !avatarUrl) {
    return c.json({ ok: false, error: 'invalid_avatar_url' }, 400);
  }

  // Build patch with only keys explicitly present in the request body.
  // Spreading body directly would cause omitted fields to be set to null (data loss).
  const profilePatch: Parameters<typeof updateParticipantProfile>[2] = {};
  if (body.fullName !== undefined) profilePatch.fullName = fullName ?? null;
  if (body.occupation !== undefined) profilePatch.occupation = body.occupation?.trim() || null;
  if (body.organization !== undefined) profilePatch.organization = body.organization?.trim() || null;
  if (body.projectUrl !== undefined) profilePatch.projectUrl = projectUrl;
  if (body.bio !== undefined) profilePatch.bio = body.bio?.trim() || null;
  if (body.avatarUrl !== undefined) profilePatch.avatarUrl = avatarUrl;

  const updated = await updateParticipantProfile(c.env.DB!, participant.id, profilePatch);
  if (!updated) {
    return c.json({ ok: false, error: 'not_found' }, 404);
  }

  return c.json({ ok: true, participant: serializeParticipant(updated) });
});

participantRoutes.get('/teams', requireVerifiedParticipantAuth(), async (c) => {
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

participantRoutes.post('/teams', requireVerifiedParticipantAuth(), async (c) => {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  const body = await c.req.json<{ name: string; description?: string; focusArea?: string }>().catch(() => null);

  if (!body?.name) {
    return c.json({ ok: false, error: 'missing_name' }, 400);
  }

  const teamName = body.name.trim();
  if (!teamName) {
    return c.json({ ok: false, error: 'missing_name' }, 400);
  }
  if (teamName.length > 120) {
    return c.json({ ok: false, error: 'name_too_long' }, 400);
  }
  if (body.description && body.description.trim().length > 500) {
    return c.json({ ok: false, error: 'description_too_long' }, 400);
  }
  if (body.focusArea && body.focusArea.trim().length > 120) {
    return c.json({ ok: false, error: 'focus_area_too_long' }, 400);
  }

  const canCreateTeam = await consumeParticipantRateLimit(
    c.env.APP_SESSION,
    `participant-team-create:${participant.id}`,
    TEAM_CREATE_RATE_LIMIT,
  );
  if (!canCreateTeam) {
    return c.json({ ok: false, error: 'too_many_attempts' }, 429);
  }

  const teamId = await insertParticipantTeam(c.env.DB!, {
    ownerId: participant.id,
    name: body.name,
    description: body.description,
    focusArea: body.focusArea,
  });

  return c.json({ ok: true, id: teamId }, 201);
});

participantRoutes.post('/teams/:id/join', requireVerifiedParticipantAuth(), async (c) => {
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

  const canJoinTeam = await consumeParticipantRateLimit(
    c.env.APP_SESSION,
    `participant-team-join:${participant.id}`,
    TEAM_JOIN_RATE_LIMIT,
  );
  if (!canJoinTeam) {
    return c.json({ ok: false, error: 'too_many_attempts' }, 429);
  }

  const memberCountRow = await c.env.DB!.prepare(
    'SELECT COUNT(*) as count FROM participant_team_members WHERE team_id = ?',
  ).bind(team.id).first<{ count: number }>();
  if ((memberCountRow?.count ?? 0) >= 20) {
    return c.json({ ok: false, error: 'team_full' }, 400);
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
    datallerRegistered?: boolean;
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
    datallerRegistered: body.datallerRegistered,
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