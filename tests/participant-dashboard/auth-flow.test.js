import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthFlow } from '../../public/scripts/participant-dashboard/auth-flow.js';

function createElement() {
  return {
    hidden: false,
    disabled: false,
    textContent: '',
    className: '',
    style: {},
    value: '',
    listeners: {},
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      toggle: vi.fn(),
    },
    setAttribute: vi.fn(),
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    after: vi.fn(),
    reset: vi.fn(function () {
      this.wasReset = true;
    }),
  };
}

function createForm(fields = {}) {
  return {
    ...createElement(),
    ...fields,
  };
}

function createAuthFlowHarness(overrides = {}) {
  const removedResetLink = { remove: vi.fn() };
  const createdLinks = [];

  const dom = {
    authShell: createElement(),
    deleteAccountForm: createForm({ password: { value: '' } }),
    deleteAccountStatus: createElement(),
    forgotBackBtn: createElement(),
    forgotForm: createForm({ email: { value: '' } }),
    forgotPasswordBtn: createElement(),
    forgotShell: createElement(),
    forgotStatus: createElement(),
    loginForm: createForm({ email: { value: '' }, password: { value: '' } }),
    loginStatus: createElement(),
    logoutBtn: createElement(),
    panes: [],
    resendBtn: createElement(),
    resetForm: createForm({ password: { value: '' } }),
    resetShell: createElement(),
    resetStatus: createElement(),
    resetTokenInput: createElement(),
    signupForm: createForm({ fullName: { value: '' }, email: { value: '' }, password: { value: '' } }),
    signupStatus: createElement(),
    tabs: [],
    verifyEmail: createElement(),
    verifyShell: createElement(),
    verifyStatus: createElement(),
    ...overrides.dom,
  };

  const state = {
    participant: null,
    verificationDirectUrl: null,
    verificationEmailAvailable: true,
    verificationEmailSent: true,
    verificationError: null,
    ...overrides.state,
  };

  const api = {
    deleteParticipantAccount: vi.fn(),
    loginParticipant: vi.fn(),
    logoutParticipant: vi.fn(),
    resendVerification: vi.fn(),
    resetParticipantPassword: vi.fn(),
    sendForgotPasswordLink: vi.fn(),
    signupParticipant: vi.fn(),
    ...overrides.api,
  };

  const deps = {
    api,
    dom,
    loadDashboard: vi.fn(),
    renderLoggedOut: vi.fn(),
    setPageMode: vi.fn(),
    setStatus: vi.fn(),
    setVerificationDirectUrl: vi.fn((url) => {
      state.verificationDirectUrl = url;
    }),
    state,
    ...overrides.deps,
  };

  const querySelector = vi.fn((selector) => {
    if (selector === '[data-auth-tab="login"]') return dom.tabs[0] ?? null;
    if (selector === '[data-auth-pane="login"]') return dom.panes[0] ?? null;
    return null;
  });

  const getElementById = vi.fn((id) => {
    if (id === 'forgotResetDirectLink') return removedResetLink;
    return null;
  });

  vi.stubGlobal('document', {
    createElement: vi.fn((tagName) => {
      const element = createElement();
      element.tagName = tagName;
      createdLinks.push(element);
      return element;
    }),
    getElementById,
    querySelector,
  });

  vi.stubGlobal('location', new URL('https://example.com/registro'));
  vi.stubGlobal('history', { replaceState: vi.fn() });
  vi.stubGlobal('window', {
    history: { replaceState: vi.fn() },
    location: new URL('https://example.com/registro'),
  });
  vi.stubGlobal('setTimeout', vi.fn((handler) => {
    if (typeof handler === 'function') handler();
    return 1;
  }));

  return {
    createdLinks,
    deps,
    dom,
    flow: createAuthFlow(deps),
    removedResetLink,
    state,
  };
}

describe('participant dashboard auth flow', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows verification fallback when email delivery is unavailable', () => {
    const { flow, deps, dom, state } = createAuthFlowHarness({
      state: {
        verificationDirectUrl: 'https://example.com/direct-verify',
      },
    });

    flow.showVerifyUI(
      { email: 'ana@example.com' },
      { available: false, directUrl: 'https://example.com/direct-verify' },
    );

    expect(state.participant).toEqual({ email: 'ana@example.com' });
    expect(dom.authShell.hidden).toBe(true);
    expect(dom.verifyShell.hidden).toBe(false);
    expect(dom.resendBtn.disabled).toBe(true);
    expect(dom.verifyEmail.textContent).toContain('ana@example.com');
    expect(deps.setPageMode).toHaveBeenCalledWith('auth');
    expect(deps.setVerificationDirectUrl).toHaveBeenCalledWith('https://example.com/direct-verify');
    expect(deps.setStatus).toHaveBeenCalledWith(
      dom.verifyStatus,
      'Este entorno local no puede mandar correo ahora mismo. Usa el link directo para verificar la cuenta.',
      'warn',
    );
  });

  it('retries verification and refreshes the dashboard when the account is already verified', async () => {
    const { flow, deps, dom } = createAuthFlowHarness({
      api: {
        resendVerification: vi.fn().mockResolvedValue({
          response: { ok: true },
          data: { already: true },
        }),
      },
    });

    flow.init();
    await dom.resendBtn.listeners.click();

    expect(deps.setStatus).toHaveBeenCalledWith(dom.verifyStatus, 'Reenviando...', 'info');
    expect(deps.setStatus).toHaveBeenCalledWith(dom.verifyStatus, 'Tu correo ya está verificado.', 'success');
    expect(deps.loadDashboard).toHaveBeenCalledTimes(1);
    expect(dom.resendBtn.disabled).toBe(false);
  });

  it('replaces the forgot-password direct link instead of stacking duplicates', async () => {
    const { createdLinks, flow, dom, removedResetLink } = createAuthFlowHarness({
      api: {
        sendForgotPasswordLink: vi.fn().mockResolvedValue({
          data: { resetDirectUrl: 'https://example.com/reset-token' },
        }),
      },
    });

    dom.forgotForm.email.value = 'ana@example.com';
    flow.init();
    await dom.forgotForm.listeners.submit({ preventDefault: vi.fn() });

    expect(removedResetLink.remove).toHaveBeenCalledTimes(1);
    expect(dom.forgotStatus.after).toHaveBeenCalledTimes(1);
    expect(createdLinks).toHaveLength(1);
    expect(createdLinks[0].id).toBe('forgotResetDirectLink');
    expect(createdLinks[0].href).toBe('https://example.com/reset-token');
    expect(createdLinks[0].textContent).toBe('Abrir link de restablecimiento');
  });
});