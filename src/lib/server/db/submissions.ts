import type { SubmissionPayload } from '../../api/types';

export async function insertSubmission(db: D1Database, payload: SubmissionPayload) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `
        INSERT INTO submissions (
          id,
          type,
          name,
          email,
          organization,
          message,
          metadata,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      id,
      payload.type,
      payload.name,
      payload.email,
      payload.organization ?? null,
      payload.message ?? null,
      JSON.stringify(payload.metadata ?? {}),
      now
    )
    .run();

  return {
    id,
    createdAt: now
  };
}
