import type { ParticipantUser } from '../../api/types';

export interface ParticipantRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  email_verified: number;
  dataller_registered: number;
  occupation: string | null;
  organization: string | null;
  project_url: string | null;
  education_level: string | null;
  age: number | null;
  bio: string | null;
  avatar_url: string | null;
  workshop_completed: number;
  profile_enabled: number;
  recognition_enabled: number;
  recognition_folio: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export interface ParticipantTeamRow {
  id: string;
  name: string;
  description: string | null;
  focus_area: string | null;
  is_open: number;
  owner_id: string;
  created_at: string;
}

export interface ParticipantTeamSummary extends ParticipantTeamRow {
  owner_name: string | null;
  member_count: number;
  role: string | null;
}

export interface DatallerMemberSummary {
  id: string;
  firstName: string;
  joinedAt: string;
}

interface PresentationCommentRow {
  id: string;
  participant_id: string;
  presentacion_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author_name: string;
}

export interface PresentationCommentSummary {
  id: string;
  participantId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorFirstName: string;
}

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? 'Participante';
}

function serializePresentationComment(row: PresentationCommentRow): PresentationCommentSummary {
  return {
    id: row.id,
    participantId: row.participant_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorFirstName: getFirstName(row.author_name),
  };
}

export function serializeParticipant(row: ParticipantRow): ParticipantUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    emailVerified: Boolean(row.email_verified),
    datallerRegistered: Boolean(row.dataller_registered),
    occupation: row.occupation,
    organization: row.organization,
    projectUrl: row.project_url,
    educationLevel: row.education_level,
    age: row.age,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    workshopCompleted: Boolean(row.workshop_completed),
    profileEnabled: Boolean(row.profile_enabled),
    recognitionEnabled: Boolean(row.recognition_enabled),
    recognitionFolio: row.recognition_folio,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

export async function getParticipantByEmail(db: D1Database, email: string) {
  return db
    .prepare('SELECT * FROM participants WHERE email = ?')
    .bind(email.trim().toLowerCase())
    .first<ParticipantRow>();
}

export async function getParticipantById(db: D1Database, id: string) {
  return db
    .prepare('SELECT * FROM participants WHERE id = ?')
    .bind(id)
    .first<ParticipantRow>();
}

export async function insertParticipant(
  db: D1Database,
  data: {
    email: string;
    passwordHash: string;
    fullName: string;
    occupation?: string;
    organization?: string;
    projectUrl?: string;
    educationLevel?: string;
    age?: number | null;
  }
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO participants (
        id, email, password_hash, full_name, dataller_registered, occupation, organization,
        project_url, education_level, age, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.email.trim().toLowerCase(),
      data.passwordHash,
      data.fullName.trim(),
      0,
      data.occupation?.trim() || null,
      data.organization?.trim() || null,
      data.projectUrl?.trim() || null,
      data.educationLevel?.trim() || null,
      data.age ?? null,
      now,
      now,
    )
    .run();

  return getParticipantById(db, id);
}

export async function markEmailVerified(db: D1Database, id: string) {
  const now = new Date().toISOString();
  await db
    .prepare('UPDATE participants SET email_verified = 1, updated_at = ? WHERE id = ?')
    .bind(now, id)
    .run();
}

export async function updateParticipantLastLogin(db: D1Database, id: string) {
  const now = new Date().toISOString();
  await db
    .prepare('UPDATE participants SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, id)
    .run();
}

export async function updateParticipantPassword(db: D1Database, id: string, passwordHash: string) {
  const now = new Date().toISOString();
  await db
    .prepare('UPDATE participants SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now, id)
    .run();
}

export async function deleteParticipant(db: D1Database, id: string) {
  await db
    .prepare('DELETE FROM participants WHERE id = ?')
    .bind(id)
    .run();
}

export async function updateParticipantProfile(
  db: D1Database,
  id: string,
  patch: {
    fullName?: string | null;
    occupation?: string | null;
    organization?: string | null;
    projectUrl?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
  }
) {
  const now = new Date().toISOString();
  const setClauses: string[] = [];
  const values: unknown[] = [];

  // Only update fields that are explicitly present in the patch object.
  // This prevents partial updates from silently nulling out omitted fields.
  const fieldMap: [keyof typeof patch, string][] = [
    ['fullName', 'full_name'],
    ['occupation', 'occupation'],
    ['organization', 'organization'],
    ['projectUrl', 'project_url'],
    ['bio', 'bio'],
    ['avatarUrl', 'avatar_url'],
  ];

  for (const [patchKey, col] of fieldMap) {
    if (patchKey in patch) {
      setClauses.push(`${col} = ?`);
      const val = patch[patchKey];
      values.push(typeof val === 'string' ? val.trim() || null : null);
    }
  }

  if (setClauses.length === 0) {
    return getParticipantById(db, id);
  }

  setClauses.push('updated_at = ?');
  values.push(now, id);

  await db
    .prepare(`UPDATE participants SET ${setClauses.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  return getParticipantById(db, id);
}

export async function listParticipants(db: D1Database) {
  const result = await db
    .prepare(
      `SELECT id, email, full_name, email_verified, dataller_registered, occupation, organization,
              project_url, education_level, age, bio, avatar_url, workshop_completed, profile_enabled,
              recognition_enabled, recognition_folio, created_at, updated_at, last_login_at
       FROM participants ORDER BY created_at DESC`
    )
    .all<ParticipantRow>();
  return result.results.map(serializeParticipant);
}

export async function updateParticipantAdminFlags(
  db: D1Database,
  id: string,
  patch: {
    datallerRegistered?: boolean;
    workshopCompleted?: boolean;
    profileEnabled?: boolean;
    recognitionEnabled?: boolean;
    recognitionFolio?: string | null;
  }
) {
  await db
    .prepare(
      `UPDATE participants
       SET dataller_registered = COALESCE(?, dataller_registered),
           workshop_completed = COALESCE(?, workshop_completed),
           profile_enabled = COALESCE(?, profile_enabled),
           recognition_enabled = COALESCE(?, recognition_enabled),
           recognition_folio = COALESCE(?, recognition_folio),
           updated_at = ?
       WHERE id = ?`
    )
    .bind(
      patch.datallerRegistered == null ? null : patch.datallerRegistered ? 1 : 0,
      patch.workshopCompleted == null ? null : patch.workshopCompleted ? 1 : 0,
      patch.profileEnabled == null ? null : patch.profileEnabled ? 1 : 0,
      patch.recognitionEnabled == null ? null : patch.recognitionEnabled ? 1 : 0,
      patch.recognitionFolio === undefined ? null : patch.recognitionFolio,
      new Date().toISOString(),
      id,
    )
    .run();

  return getParticipantById(db, id);
}

export async function updateParticipantDatallerRegistration(
  db: D1Database,
  id: string,
  datallerRegistered: boolean,
) {
  await db
    .prepare(
      `UPDATE participants
       SET dataller_registered = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(datallerRegistered ? 1 : 0, new Date().toISOString(), id)
    .run();

  return getParticipantById(db, id);
}

export async function getParticipantTeams(db: D1Database, participantId: string) {
  const result = await db
    .prepare(
      `SELECT t.*, p.full_name as owner_name, tm.role as role,
              (SELECT COUNT(*) FROM participant_team_members WHERE team_id = t.id) as member_count
       FROM participant_teams t
       LEFT JOIN participants p ON p.id = t.owner_id
       LEFT JOIN participant_team_members tm
         ON tm.team_id = t.id AND tm.participant_id = ?
       WHERE t.id IN (
         SELECT team_id FROM participant_team_members WHERE participant_id = ?
       )
       ORDER BY t.created_at DESC`
    )
    .bind(participantId, participantId)
    .all<ParticipantTeamSummary>();

  return result.results.map((row) => ({
    ...row,
    is_open: Boolean(row.is_open),
  }));
}

export async function getOpenTeams(db: D1Database, participantId: string) {
  const result = await db
    .prepare(
      `SELECT t.*, p.full_name as owner_name, NULL as role,
              (SELECT COUNT(*) FROM participant_team_members WHERE team_id = t.id) as member_count
       FROM participant_teams t
       LEFT JOIN participants p ON p.id = t.owner_id
       WHERE t.is_open = 1
         AND t.id NOT IN (
           SELECT team_id FROM participant_team_members WHERE participant_id = ?
         )
       ORDER BY t.created_at DESC`
    )
    .bind(participantId)
    .all<ParticipantTeamSummary>();

  return result.results.map((row) => ({
    ...row,
    is_open: Boolean(row.is_open),
  }));
}

export async function insertParticipantTeam(
  db: D1Database,
  data: {
    ownerId: string;
    name: string;
    description?: string;
    focusArea?: string;
  }
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.batch([
    db
      .prepare(
        `INSERT INTO participant_teams (id, name, description, focus_area, is_open, owner_id, created_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(id, data.name.trim(), data.description?.trim() || null, data.focusArea?.trim() || null, data.ownerId, now),
    db
      .prepare(
        `INSERT INTO participant_team_members (team_id, participant_id, role, joined_at)
         VALUES (?, ?, 'owner', ?)`
      )
      .bind(id, data.ownerId, now),
  ]);

  return id;
}

export async function joinParticipantTeam(db: D1Database, teamId: string, participantId: string) {
  await db
    .prepare(
      `INSERT OR IGNORE INTO participant_team_members (team_id, participant_id, role, joined_at)
       VALUES (?, ?, 'member', ?)`
    )
    .bind(teamId, participantId, new Date().toISOString())
    .run();
}

export async function getParticipantTeamById(db: D1Database, teamId: string) {
  return db
    .prepare('SELECT * FROM participant_teams WHERE id = ?')
    .bind(teamId)
    .first<ParticipantTeamRow>();
}

export async function listDatallerParticipants(db: D1Database, excludeParticipantId?: string) {
  let query = `SELECT id, full_name, updated_at
    FROM participants
    WHERE dataller_registered = 1`;
  const params: string[] = [];

  if (excludeParticipantId) {
    query += ' AND id != ?';
    params.push(excludeParticipantId);
  }

  query += ' ORDER BY updated_at DESC, full_name ASC';

  const stmt = params.length
    ? db.prepare(query).bind(...params)
    : db.prepare(query);

  const result = await stmt.all<{ id: string; full_name: string; updated_at: string }>();
  return result.results.map((row) => ({
    id: row.id,
    firstName: getFirstName(row.full_name),
    joinedAt: row.updated_at,
  })) satisfies DatallerMemberSummary[];
}

export async function listPresentationComments(db: D1Database, presentacionId: string, limit = 80) {
  const result = await db
    .prepare(
      `SELECT c.*, p.full_name AS author_name
       FROM participant_presentation_comments c
       INNER JOIN participants p ON p.id = c.participant_id
       WHERE c.presentacion_id = ?
       ORDER BY c.created_at DESC
       LIMIT ?`
    )
    .bind(presentacionId, limit)
    .all<PresentationCommentRow>();

  return result.results.map(serializePresentationComment);
}

export async function insertPresentationComment(
  db: D1Database,
  data: { participantId: string; presentacionId: string; body: string }
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO participant_presentation_comments (
        id, participant_id, presentacion_id, body, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, data.participantId, data.presentacionId, data.body.trim(), now, now)
    .run();

  const inserted = await db
    .prepare(
      `SELECT c.*, p.full_name AS author_name
       FROM participant_presentation_comments c
       INNER JOIN participants p ON p.id = c.participant_id
       WHERE c.id = ?`
    )
    .bind(id)
    .first<PresentationCommentRow>();

  return inserted ? serializePresentationComment(inserted) : null;
}