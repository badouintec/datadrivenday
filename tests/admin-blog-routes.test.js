import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  archiveBlogPost: vi.fn(),
  deleteBlogPost: vi.fn(),
  getBlogPost: vi.fn(),
  getBlogPosts: vi.fn(),
  getSafeImageUpload: vi.fn(),
  insertBlogPost: vi.fn(),
  logAdminAuditEvent: vi.fn(),
  publishBlogPost: vi.fn(),
  updateBlogPost: vi.fn(),
}));

vi.mock('../src/lib/api/auth.ts', () => ({
  requireAuth: () => async (c, next) => {
    c.set('user', { id: 'admin-1', username: 'juan', rol: 'editor', nombre: 'Juan' });
    await next();
  },
}));

vi.mock('../src/lib/server/audit.ts', () => ({
  logAdminAuditEvent: mocks.logAdminAuditEvent,
  pickAuditFields: (source, fields) => {
    if (!source) return null;
    return Object.fromEntries(fields.filter((field) => field in source).map((field) => [field, source[field]]));
  },
}));

vi.mock('../src/lib/server/db/blog.ts', () => ({
  archiveBlogPost: mocks.archiveBlogPost,
  deleteBlogPost: mocks.deleteBlogPost,
  getBlogPost: mocks.getBlogPost,
  getBlogPosts: mocks.getBlogPosts,
  insertBlogPost: mocks.insertBlogPost,
  publishBlogPost: mocks.publishBlogPost,
  updateBlogPost: mocks.updateBlogPost,
}));

vi.mock('../src/lib/server/uploads.ts', () => ({
  getSafeImageUpload: mocks.getSafeImageUpload,
}));

import { blogRoutes } from '../src/lib/api/routes/admin-blog.ts';

function createEnv() {
  return {
    DB: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({ run: vi.fn().mockResolvedValue(undefined) })),
      })),
    },
    MEDIA: { put: vi.fn().mockResolvedValue(undefined) },
    PUBLIC_SITE_URL: 'https://datadriven.day',
  };
}

describe('admin blog routes', () => {
  beforeEach(() => {
    mocks.archiveBlogPost.mockResolvedValue(undefined);
    mocks.deleteBlogPost.mockResolvedValue(undefined);
    mocks.getBlogPosts.mockResolvedValue([]);
    mocks.insertBlogPost.mockResolvedValue({ id: 'blog-1', slug: 'titulo-blog-1' });
    mocks.logAdminAuditEvent.mockResolvedValue(true);
    mocks.publishBlogPost.mockResolvedValue(undefined);
    mocks.updateBlogPost.mockResolvedValue(undefined);
    mocks.getSafeImageUpload.mockResolvedValue({ ok: false, error: 'missing_file' });
  });

  it('logs a patch with selected before and after values', async () => {
    mocks.getBlogPost
      .mockResolvedValueOnce({
        id: 'blog-1',
        titulo: 'Antes',
        slug: 'post',
        estado: 'borrador',
        autor: 'DDD',
        tags: ['uno'],
        imagen_url: null,
      })
      .mockResolvedValueOnce({
        id: 'blog-1',
        titulo: 'Despues',
        slug: 'post',
        estado: 'publicado',
        autor: 'DDD',
        tags: ['uno'],
        imagen_url: null,
      });

    const response = await blogRoutes.request(
      'http://localhost/blog-1',
      {
        method: 'PATCH',
        body: JSON.stringify({ titulo: 'Despues', estado: 'publicado' }),
        headers: { 'Content-Type': 'application/json' },
      },
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(mocks.updateBlogPost).toHaveBeenCalledWith(expect.any(Object), 'blog-1', {
      titulo: 'Despues',
      estado: 'publicado',
    });
    expect(mocks.logAdminAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        resourceType: 'blog_post',
        resourceId: 'blog-1',
        action: 'PATCH',
        oldValues: expect.objectContaining({ titulo: 'Antes', estado: 'borrador' }),
        newValues: expect.objectContaining({ titulo: 'Despues', estado: 'publicado' }),
      }),
    );
  });
});