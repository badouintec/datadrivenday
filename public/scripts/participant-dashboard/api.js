const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function parseJson(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json().catch(() => null);
}

async function request(path, options) {
  const response = await fetch(path, options);
  const data = await parseJson(response);
  return { response, data };
}

function requestJson(path, method, body) {
  return request(path, {
    method,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

export function fetchDashboard() {
  return request('/api/participant/dashboard');
}

export function fetchDatallerWorkspace() {
  return request('/api/participant/dataller/workspace');
}

export function signupParticipant(payload) {
  return requestJson('/api/participant/signup', 'POST', payload);
}

export function loginParticipant(payload) {
  return requestJson('/api/participant/login', 'POST', payload);
}

export function logoutParticipant() {
  return request('/api/participant/logout', { method: 'POST' });
}

export function resendVerification() {
  return request('/api/participant/resend-verification', { method: 'POST' });
}

export function updateDatallerRegistration(payload) {
  return requestJson('/api/participant/dataller', 'PATCH', payload);
}

export function publishDatallerComment(payload) {
  return requestJson('/api/participant/dataller/comments', 'POST', payload);
}

export function updateParticipantProfile(payload) {
  return requestJson('/api/participant/profile', 'PATCH', payload);
}

export function sendForgotPasswordLink(payload) {
  return requestJson('/api/participant/forgot-password', 'POST', payload);
}

export function resetParticipantPassword(payload) {
  return requestJson('/api/participant/reset-password', 'POST', payload);
}

export function deleteParticipantAccount(payload) {
  return requestJson('/api/participant/account', 'DELETE', payload);
}