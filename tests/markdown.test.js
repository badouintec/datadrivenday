import { describe, expect, it } from 'vitest';

import { renderMarkdown } from '../src/lib/server/markdown.ts';

describe('renderMarkdown', () => {
  it('escapes raw html and script tags', () => {
    const html = renderMarkdown('# Hola\n\n<script>alert(1)</script>');

    expect(html).toContain('<h1>Hola</h1>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('drops unsafe javascript links while keeping the label', () => {
    const html = renderMarkdown('[Peligroso](javascript:alert(1))');

    expect(html).toContain('<p>Peligroso</p>');
    expect(html).not.toContain('href="javascript:alert(1)"');
    expect(html).not.toContain('<a ');
  });

  it('allows safe https links', () => {
    const html = renderMarkdown('[Seguro](https://datadriven.day)');

    expect(html).toContain('href="https://datadriven.day"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});