import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { AppBindings, AppVariables } from '../types';
import {
  getBlogPosts, getBlogPost, insertBlogPost,
  updateBlogPost, publishBlogPost, archiveBlogPost, deleteBlogPost,
} from '../../server/db/blog';

type Env = { Bindings: Partial<AppBindings>; Variables: AppVariables };

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
  const body = await c.req.json<{
    titulo: string; subtitulo?: string; cuerpo_md?: string;
    extracto?: string; autor?: string; tags?: string[];
  }>();
  const result = await insertBlogPost(c.env.DB!, body);
  return c.json({ ok: true, ...result }, 201);
});

blogRoutes.patch('/:id', requireAuth('blog:write'), async (c) => {
  const body = await c.req.json();
  await updateBlogPost(c.env.DB!, c.req.param('id')!, body);
  return c.json({ ok: true });
});

blogRoutes.post('/:id/publicar', requireAuth('blog:publish'), async (c) => {
  await publishBlogPost(c.env.DB!, c.req.param('id')!);
  return c.json({ ok: true });
});

blogRoutes.post('/:id/archivar', requireAuth('blog:publish'), async (c) => {
  await archiveBlogPost(c.env.DB!, c.req.param('id')!);
  return c.json({ ok: true });
});

blogRoutes.delete('/:id', requireAuth('blog:delete'), async (c) => {
  await deleteBlogPost(c.env.DB!, c.req.param('id')!);
  return c.json({ ok: true });
});

// Upload de imagen a R2
blogRoutes.post('/:id/imagen', requireAuth('blog:write'), async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('imagen') as File;

  if (!file || !file.type.startsWith('image/')) {
    return c.json({ ok: false, error: 'invalid_file' }, 400);
  }

  if (file.size > 5 * 1024 * 1024) {
    return c.json({ ok: false, error: 'file_too_large' }, 400);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const key = `blog/${c.req.param('id')}/${crypto.randomUUID()}.${ext}`;

  await c.env.MEDIA!.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const url = `${c.env.PUBLIC_SITE_URL ?? ''}/media/${key}`;

  await c.env.DB!
    .prepare('UPDATE blog_posts SET imagen_url = ? WHERE id = ?')
    .bind(url, c.req.param('id'))
    .run();

  return c.json({ ok: true, url });
});
