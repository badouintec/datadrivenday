import { describe, expect, it } from 'vitest';

import {
  escapeHtml,
  isValidHttpUrl,
  nl2br,
} from '../../public/scripts/participant-dashboard/utils.js';

describe('participant dashboard utils', () => {
  it('escapes HTML-sensitive characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it('converts line breaks after escaping HTML', () => {
    expect(nl2br('Hola\n<b>mundo</b>')).toBe('Hola<br>&lt;b&gt;mundo&lt;/b&gt;');
  });

  it('accepts only http and https URLs while allowing empty values', () => {
    expect(isValidHttpUrl('')).toBe(true);
    expect(isValidHttpUrl('   ')).toBe(true);
    expect(isValidHttpUrl('https://datadriven.day')).toBe(true);
    expect(isValidHttpUrl('http://localhost:4321/registro')).toBe(true);
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isValidHttpUrl('nota-url-valida')).toBe(false);
  });
});