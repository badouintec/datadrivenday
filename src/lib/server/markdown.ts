function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function sanitizeHref(rawHref: string) {
  const href = rawHref.trim();
  if (!href) return null;
  if (href.startsWith('/')) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:/i.test(href)) return href;
  return null;
}

function renderInlineMarkdown(text: string) {
  const codeStore: string[] = [];
  let html = escapeHtml(text).replace(/`([^`]+)`/g, (_match, code) => {
    const token = `__INLINE_CODE_${codeStore.length}__`;
    codeStore.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  html = html.replace(/\[([^\]]+)\]\(((?:[^()]|\([^()]*\))+)\)/g, (_match, label, href) => {
    const safeHref = sanitizeHref(href);
    if (!safeHref) return label;
    return `<a href="${escapeAttribute(safeHref)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });

  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

  codeStore.forEach((snippet, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, snippet);
  });

  return html;
}

function renderTextBlock(block: string) {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return '';

  if (lines.every((line) => line.startsWith('- '))) {
    const items = lines.map((line) => `<li>${renderInlineMarkdown(line.slice(2))}</li>`).join('');
    return `<ul>${items}</ul>`;
  }

  if (lines.length === 1) {
    const line = lines[0];
    if (line.startsWith('### ')) return `<h3>${renderInlineMarkdown(line.slice(4))}</h3>`;
    if (line.startsWith('## ')) return `<h2>${renderInlineMarkdown(line.slice(3))}</h2>`;
    if (line.startsWith('# ')) return `<h1>${renderInlineMarkdown(line.slice(2))}</h1>`;
  }

  return `<p>${renderInlineMarkdown(lines.join(' '))}</p>`;
}

export function renderMarkdown(md: string): string {
  const normalized = String(md ?? '').replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';

  const pieces: string[] = [];
  const codeBlockRe = /```(\w*)\n([\s\S]*?)```/g;
  let cursor = 0;

  for (const match of normalized.matchAll(codeBlockRe)) {
    const start = match.index ?? 0;
    const before = normalized.slice(cursor, start).trim();
    if (before) {
      const blocks = before.split(/\n\s*\n/).map(renderTextBlock).filter(Boolean);
      pieces.push(...blocks);
    }

    const lang = escapeAttribute(match[1] ?? '');
    const code = escapeHtml(match[2] ?? '');
    pieces.push(`<pre><code${lang ? ` class="language-${lang}"` : ''}>${code}</code></pre>`);
    cursor = start + match[0].length;
  }

  const tail = normalized.slice(cursor).trim();
  if (tail) {
    const blocks = tail.split(/\n\s*\n/).map(renderTextBlock).filter(Boolean);
    pieces.push(...blocks);
  }

  return pieces.join('\n');
}
