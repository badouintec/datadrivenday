import { describe, expect, it } from 'vitest';

import { countAuditChanges, pickAuditFields } from '../src/lib/server/audit.ts';

describe('audit helpers', () => {
  it('picks only the whitelisted fields', () => {
    expect(
      pickAuditFields(
        { titulo: 'Post', estado: 'borrador', cuerpo_md: 'Muy largo' },
        ['titulo', 'estado'],
      ),
    ).toEqual({ titulo: 'Post', estado: 'borrador' });
  });

  it('counts only actual field changes between snapshots', () => {
    expect(
      countAuditChanges(
        { estado: 'borrador', tags: ['uno'], autor: 'DDD' },
        { estado: 'publicado', tags: ['uno'], autor: 'DDD 2026' },
      ),
    ).toBe(2);
  });
});