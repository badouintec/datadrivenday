export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function nl2br(value) {
  return escapeHtml(value).replaceAll('\n', '<br>');
}

export function setStatus(element, message, kind = 'info') {
  if (!element) return;
  if (!message) {
    element.hidden = true;
    element.textContent = '';
    element.className = 'registro-status';
    return;
  }

  element.hidden = false;
  element.textContent = message;
  element.className = `registro-status registro-status--${kind}`;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}