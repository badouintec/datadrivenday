import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { AppBindings, AppVariables } from '../types';
import { logAdminAuditEvent, pickAuditFields } from '../../server/audit';
import { getSafeImageUpload } from '../../server/uploads';
import {
  getBlogPosts, getBlogPost, insertBlogPost,
  updateBlogPost, publishBlogPost, archiveBlogPost, deleteBlogPost,
} from '../../server/db/blog';

type Env = { Bindings: Partial<AppBindings>; Variables: AppVariables };

const VALID_BLOG_STATES = new Set(['borrador', 'publicado', 'archivado']);
const VALID_SLUG_RE = /^[a-z0-9-]+$/;
const BLOG_AUDIT_FIELDS = ['titulo', 'slug', 'estado', 'autor', 'tags', 'imagen_url'] as const;

function buildBlogAuditSnapshot(post: Awaited<ReturnType<typeof getBlogPost>>) {
  return pickAuditFields(post as Record<string, unknown> | null, BLOG_AUDIT_FIELDS);
}

function sanitizeBlogTags(tags: unknown): string[] | null {
  if (!Array.isArray(tags)) return null;
  const unique = new Set<string>();
  for (const rawTag of tags) {
    const tag = String(rawTag ?? '').trim();
    if (!tag || tag.length > 40) continue;
    unique.add(tag);
    if (unique.size >= 20) break;
  }
  return [...unique];
}

function sanitizeBlogInput(body: unknown, mode: 'create' | 'patch') {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false as const, error: 'invalid_json' as const };
  }

  const source = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (mode === 'create' || source.titulo !== undefined) {
    const titulo = String(source.titulo ?? '').trim();
    if (!titulo || titulo.length > 200) {
      return { ok: false as const, error: 'invalid_titulo' as const };
    }
    patch.titulo = titulo;
  }

  if (source.subtitulo !== undefined) {
    const subtitulo = String(source.subtitulo ?? '').trim();
    patch.subtitulo = subtitulo ? subtitulo.slice(0, 300) : null;
  }

  if (source.cuerpo_md !== undefined) {
    const cuerpoMd = String(source.cuerpo_md ?? '');
    if (cuerpoMd.length > 100_000) {
      return { ok: false as const, error: 'invalid_cuerpo_md' as const };
    }
    patch.cuerpo_md = cuerpoMd;
  } else if (mode === 'create') {
    patch.cuerpo_md = '';
  }

  if (source.extracto !== undefined) {
    const extracto = String(source.extracto ?? '').trim();
    patch.extracto = extracto ? extracto.slice(0, 600) : null;
  }

  if (source.autor !== undefined) {
    const autor = String(source.autor ?? '').trim();
    patch.autor = (autor || 'Data Driven Day').slice(0, 120);
  } else if (mode === 'create') {
    patch.autor = 'Data Driven Day';
  }

  if (source.tags !== undefined) {
    const tags = sanitizeBlogTags(source.tags);
    if (!tags) {
      return { ok: false as const, error: 'invalid_tags' as const };
    }
    patch.tags = tags;
  }

  if (source.estado !== undefined) {
    const estado = String(source.estado ?? '').trim();
    if (!VALID_BLOG_STATES.has(estado)) {
      return { ok: false as const, error: 'invalid_estado' as const };
    }
    patch.estado = estado;
  }

  if (source.slug !== undefined) {
    const slug = String(source.slug ?? '').trim().toLowerCase();
    if (!slug || slug.length > 140 || !VALID_SLUG_RE.test(slug)) {
      return { ok: false as const, error: 'invalid_slug' as const };
    }
    patch.slug = slug;
  }

  return { ok: true as const, patch };
}

export const blogRoutes = new Hono<Env>();
blogRoutes.use('*', requireAuth('blog:read'));

blogRoutes.get('/', async (c) => {
  const estado = c.req.query('estado') ?? undefined;
  const posts = await getBlogPosts(c.env.DB!, estado);
  return c.json({ ok: true, posts });
});

blogRoutes.get('/:id', async (c) => {
  const post = await getBlogPost(c.env.DB!, c.req.param('id'));
  if (!post) return c.json({ ok: false, error: 'not_found' }, 404);
  return c.json({ ok: true, post });
});

blogRoutes.post('/', requireAuth('blog:write'), async (c) => {
  const body = await c.req.json().catch(() => null);
  const sanitized = sanitizeBlogInput(body, 'create');
  if (!sanitized.ok) return c.json({ ok: false, error: sanitized.error }, 400);

  const result = await insertBlogPost(c.env.DB!, sanitized.patch as {
    titulo: string;
    subtitulo?: string;
    cuerpo_md?: string;
    extracto?: string;
    autor?: string;
    tags?: string[];
  });

  const created = await getBlogPost(c.env.DB!, result.id);
  await logAdminAuditEvent(c, {
    resourceType: 'blog_post',
    resourceId: result.id,
    action: 'CREATE',
    newValues: buildBlogAuditSnapshot(created),
  });

  return c.json({ ok: true, ...result }, 201);
});

blogRoutes.patch('/:id', requireAuth('blog:write'), async (c) => {
  const postId = c.req.param('id')!;
  const before = await getBlogPost(c.env.DB!, postId);
  if (!before) return c.json({ ok: false, error: 'not_found' }, 404);

  const body = await c.req.json().catch(() => null);
  const sanitized = sanitizeBlogInput(body, 'patch');
  if (!sanitized.ok) return c.json({ ok: false, error: sanitized.error }, 400);

  await updateBlogPost(c.env.DB!, postId, sanitized.patch);

  const after = await getBlogPost(c.env.DB!, postId);
  await logAdminAuditEvent(c, {
    resourceType: 'blog_post',
    resourceId: postId,
    action: 'PATCH',
    oldValues: buildBlogAuditSnapshot(before),
    newValues: buildBlogAuditSnapshot(after),
  });

  return c.json({ ok: true });
});

blogRoutes.post('/:id/publicar', requireAuth('blog:publish'), async (c) => {
  const postId = c.req.param('id')!;
  const before = await getBlogPost(c.env.DB!, postId);
  if (!before) return c.json({ ok: false, error: 'not_found' }, 404);

  await publishBlogPost(c.env.DB!, postId);

  const after = await getBlogPost(c.env.DB!, postId);
  await logAdminAuditEvent(c, {
    resourceType: 'blog_post',
    resourceId: postId,
    action: 'PUBLISH',
    oldValues: buildBlogAuditSnapshot(before),
    newValues: buildBlogAuditSnapshot(after),
  });

  return c.json({ ok: true });
});

blogRoutes.post('/:id/archivar', requireAuth('blog:publish'), async (c) => {
  const postId = c.req.param('id')!;
  const before = await getBlogPost(c.env.DB!, postId);
  if (!before) return c.json({ ok: false, error: 'not_found' }, 404);

  await archiveBlogPost(c.env.DB!, postId);

  const after = await getBlogPost(c.env.DB!, postId);
  await logAdminAuditEvent(c, {
    resourceType: 'blog_post',
    resourceId: postId,
    action: 'ARCHIVE',
    oldValues: buildBlogAuditSnapshot(before),
    newValues: buildBlogAuditSnapshot(after),
  });

  return c.json({ ok: true });
});

blogRoutes.delete('/:id', requireAuth('blog:delete'), async (c) => {
  const postId = c.req.param('id')!;
  const before = await getBlogPost(c.env.DB!, postId);
  if (!before) return c.json({ ok: false, error: 'not_found' }, 404);

  await deleteBlogPost(c.env.DB!, postId);

  await logAdminAuditEvent(c, {
    resourceType: 'blog_post',
    resourceId: postId,
    action: 'DELETE',
    oldValues: buildBlogAuditSnapshot(before),
  });

  return c.json({ ok: true });
});

// Upload de imagen a R2
blogRoutes.post('/:id/imagen', requireAuth('blog:write'), async (c) => {
  const postId = c.req.param('id')!;
  const before = await getBlogPost(c.env.DB!, postId);
  if (!before) return c.json({ ok: false, error: 'not_found' }, 404);

  const formData = await c.req.formData();
  const file = formData.get('imagen') as File | null;
  const upload = await getSafeImageUpload(file);
  if (!upload.ok) {
    return c.json({ ok: false, error: upload.error }, 400);
  }

  const key = `blog/${postId}/${crypto.randomUUID()}.${upload.extension}`;

  await c.env.MEDIA!.put(key, upload.buffer, {
    httpMetadata: { contentType: upload.contentType },
  });

  const url = `${c.env.PUBLIC_SITE_URL ?? ''}/media/${key}`;

  await c.env.DB!
    .prepare('UPDATE blog_posts SET imagen_url = ? WHERE id = ?')
    .bind(url, postId)
    .run();

  const after = await getBlogPost(c.env.DB!, postId);
  await logAdminAuditEvent(c, {
    resourceType: 'blog_post',
    resourceId: postId,
    action: 'PATCH',
    oldValues: buildBlogAuditSnapshot(before),
    newValues: buildBlogAuditSnapshot(after),
  });

  return c.json({ ok: true, url });
});
