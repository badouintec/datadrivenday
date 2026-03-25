export function createAuthFlow({
  api,
  dom,
  loadDashboard,
  renderLoggedOut,
  setPageMode,
  setStatus,
  state,
}) {
  function showVerifyUI(participant, options = {}) {
    state.participant = participant;
    state.verificationEmailAvailable = options.available ?? state.verificationEmailAvailable;
    state.verificationEmailSent = options.sent ?? true;
    state.verificationError = options.error ?? null;
    setPageMode('auth');
    dom.authShell.hidden = true;
    dom.verifyShell.hidden = false;
    dom.resendBtn.hidden = false;
    dom.resendBtn.disabled = !state.verificationEmailAvailable;

    if (!state.verificationEmailAvailable) {
      dom.verifyEmail.textContent = `Tu cuenta quedó creada con ${participant.email}, pero el envío de correo no está disponible ahora mismo.`;
      setStatus(
        dom.verifyStatus,
        'No fue posible enviar el correo de verificación. Intenta más tarde o solicita soporte.',
        'error',
      );
      return;
    }

    if (!state.verificationEmailSent) {
      dom.verifyEmail.textContent = `Tu cuenta quedó creada con ${participant.email}, pero no pude entregar el primer correo de verificación.`;
      const message = state.verificationError === 'domain_not_verified'
        ? 'El dominio remitente todavía no está verificado en Resend.'
        : state.verificationError === 'testing_recipient_restricted'
          ? 'La cuenta de Resend está en modo de prueba y no puede enviar a ese destinatario.'
          : 'Usa "Reenviar correo" para intentar otra vez.';
      setStatus(dom.verifyStatus, message, 'error');
      return;
    }

    dom.verifyEmail.textContent = `Enviamos un link de verificación a ${participant.email}`;
    setStatus(dom.verifyStatus, '', 'info');
  }

  async function restoreSession() {
    try {
      await loadDashboard();
    } catch {
      renderLoggedOut();
    }
  }

  function showForgotUI() {
    dom.authShell.hidden = true;
    dom.verifyShell.hidden = true;
    dom.forgotShell.hidden = false;
    dom.resetShell.hidden = true;
    setStatus(dom.forgotStatus, '', 'info');
    dom.forgotForm?.reset();
  }

  function showResetUI(token) {
    dom.authShell.hidden = true;
    dom.verifyShell.hidden = true;
    dom.forgotShell.hidden = true;
    dom.resetShell.hidden = false;
    if (dom.resetTokenInput) dom.resetTokenInput.value = token;
    setStatus(dom.resetStatus, '', 'info');
    dom.resetForm?.reset();
    if (dom.resetTokenInput) dom.resetTokenInput.value = token;
  }

  function showAuthUI() {
    dom.authShell.hidden = false;
    dom.verifyShell.hidden = true;
    dom.forgotShell.hidden = true;
    dom.resetShell.hidden = true;
    const tab = document.querySelector('[data-auth-tab="login"]');
    const loginPane = document.querySelector('[data-auth-pane="login"]');
    if (tab && loginPane) {
      dom.tabs.forEach((item) => {
        item.classList.remove('is-active');
        item.setAttribute('aria-selected', 'false');
      });
      dom.panes.forEach((pane) => pane.classList.remove('is-active'));
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      loginPane.classList.add('is-active');
    }
  }

  function bindTabSwitching() {
    dom.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const view = tab.getAttribute('data-auth-tab');
        dom.tabs.forEach((item) => {
          item.classList.toggle('is-active', item === tab);
          item.setAttribute('aria-selected', String(item === tab));
        });
        dom.panes.forEach((pane) => pane.classList.toggle('is-active', pane.getAttribute('data-auth-pane') === view));
        if (dom.forgotShell) dom.forgotShell.hidden = true;
        if (dom.resetShell) dom.resetShell.hidden = true;
        dom.authShell.hidden = false;
      });
    });
  }

  function bindSignup() {
    dom.signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(dom.signupStatus, 'Creando cuenta...', 'info');

      try {
        const { response, data } = await api.signupParticipant({
          fullName: dom.signupForm.fullName.value.trim(),
          email: dom.signupForm.email.value.trim(),
          password: dom.signupForm.password.value,
        });

        if (!response.ok) {
          const messages = {
            missing_fields: 'Faltan campos obligatorios.',
            weak_password: 'La contraseña debe tener entre 8 y 128 caracteres.',
            email_taken: 'Ese correo ya tiene cuenta.',
            invalid_email: 'Escribe un correo valido.',
            too_many_attempts: 'Demasiados intentos. Espera 1 hora e intenta de nuevo.',
          };
          setStatus(dom.signupStatus, messages[data.error] || 'No pude crear la cuenta.', 'error');
          return;
        }

        dom.signupForm.reset();
        state.verificationEmailAvailable = data.verificationEmailAvailable !== false;
        state.verificationEmailSent = data.verificationEmailSent !== false;
        state.verificationError = data.verificationError || null;
        setStatus(dom.signupStatus, '', 'info');
        showVerifyUI(data.participant, {
          available: state.verificationEmailAvailable,
          sent: state.verificationEmailSent,
          error: state.verificationError,
        });
      } catch {
        setStatus(dom.signupStatus, 'Error de red al crear la cuenta.', 'error');
      }
    });
  }

  function bindLogin() {
    dom.loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(dom.loginStatus, 'Entrando...', 'info');

      try {
        const { response, data } = await api.loginParticipant({
          email: dom.loginForm.email.value.trim(),
          password: dom.loginForm.password.value,
        });

        if (!response.ok) {
          const message = data.error === 'invalid_credentials'
            ? 'Correo o contraseña incorrectos.'
            : data.error === 'invalid_email'
              ? 'Escribe un correo valido.'
              : data.error === 'too_many_attempts'
                ? 'Demasiados intentos fallidos. Espera 15 minutos.'
                : 'No pude abrir la sesión.';
          setStatus(dom.loginStatus, message, 'error');
          return;
        }

        dom.loginForm.reset();
        setStatus(dom.loginStatus, 'Sesión abierta. Cargando tu tablero...', 'success');
        await loadDashboard();
      } catch {
        setStatus(dom.loginStatus, 'Error de red al iniciar sesión.', 'error');
      }
    });
  }

  function bindLogout() {
    dom.logoutBtn.addEventListener('click', async () => {
      await api.logoutParticipant().catch(() => null);
      setStatus(dom.signupStatus, '', 'info');
      setStatus(dom.loginStatus, '', 'info');
      renderLoggedOut();
    });
  }

  function bindResendVerification() {
    dom.resendBtn.addEventListener('click', async () => {
      setStatus(dom.verifyStatus, 'Reenviando...', 'info');
      dom.resendBtn.disabled = true;

      try {
        const { response, data } = await api.resendVerification();

        if (data.already) {
          setStatus(dom.verifyStatus, 'Tu correo ya está verificado.', 'success');
          await loadDashboard();
          return;
        }

        if (!response.ok) {
          const message = data.error === 'email_not_configured'
            ? 'El correo de verificación no está disponible en este momento.'
            : data.verificationError === 'domain_not_verified'
              ? 'El dominio remitente todavía no está verificado en Resend.'
              : data.verificationError === 'testing_recipient_restricted'
                ? 'La cuenta de Resend está en modo de prueba y no puede enviar a ese destinatario.'
                : 'No se pudo reenviar. Intenta en un momento.';
          setStatus(dom.verifyStatus, message, 'error');
          return;
        }

        state.verificationError = data.verificationError || null;
        setStatus(dom.verifyStatus, 'Correo reenviado. Revisa tu bandeja.', 'success');
      } catch {
        setStatus(dom.verifyStatus, 'Error de red al reenviar.', 'error');
      } finally {
        setTimeout(() => {
          dom.resendBtn.disabled = false;
        }, 30000);
      }
    });
  }

  function removeExistingResetLink() {
    document.getElementById('forgotResetDirectLink')?.remove();
  }

  function bindForgotPassword() {
    dom.forgotPasswordBtn?.addEventListener('click', () => {
      setPageMode('auth');
      showForgotUI();
    });

    dom.forgotBackBtn?.addEventListener('click', () => {
      showAuthUI();
    });

    dom.forgotForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      setStatus(dom.forgotStatus, 'Enviando...', 'info');
      removeExistingResetLink();
      const email = dom.forgotForm.email.value.trim();
      try {
        const { data } = await api.sendForgotPasswordLink({ email });
        if (data.resetDirectUrl) {
          setStatus(dom.forgotStatus, 'Entorno local — usa el link directo.', 'warn');
          const linkEl = document.createElement('a');
          linkEl.id = 'forgotResetDirectLink';
          linkEl.href = data.resetDirectUrl;
          linkEl.className = 'button-secondary';
          linkEl.style.display = 'inline-flex';
          linkEl.style.marginTop = '0.75rem';
          linkEl.textContent = 'Abrir link de restablecimiento';
          dom.forgotStatus.after(linkEl);
        } else {
          setStatus(dom.forgotStatus, 'Si el correo existe, te mandamos un link en los próximos minutos.', 'success');
          dom.forgotForm.reset();
        }
      } catch {
        setStatus(dom.forgotStatus, 'Error de red. Intenta de nuevo.', 'error');
      }
    });
  }

  function bindResetPassword() {
    dom.resetForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const token = dom.resetTokenInput?.value?.trim();
      const password = dom.resetForm.password.value;
      if (!token) {
        setStatus(dom.resetStatus, 'Token inválido. Usa el link del correo de nuevo.', 'error');
        return;
      }
      setStatus(dom.resetStatus, 'Guardando nueva contraseña...', 'info');
      try {
        const { response, data } = await api.resetParticipantPassword({ token, password });
        if (!response.ok) {
          const message = data.error === 'token_invalid_or_expired'
            ? 'El link expiró o ya fue usado. Solicita uno nuevo.'
            : data.error === 'password_too_short'
              ? 'La contraseña debe tener al menos 8 caracteres.'
              : data.error === 'password_too_long'
                ? 'La contraseña no puede superar 128 caracteres.'
                : 'No se pudo actualizar la contraseña.';
          setStatus(dom.resetStatus, message, 'error');
          return;
        }
        setStatus(dom.resetStatus, 'Contraseña actualizada. Ya puedes iniciar sesión.', 'success');
        setTimeout(() => {
          window.history.replaceState(null, '', '/registro');
          showAuthUI();
        }, 2000);
      } catch {
        setStatus(dom.resetStatus, 'Error de red. Intenta de nuevo.', 'error');
      }
    });
  }

  function bindDeleteAccount() {
    dom.deleteAccountForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.participant) return;
      const password = dom.deleteAccountForm.password.value;
      setStatus(dom.deleteAccountStatus, 'Verificando...', 'info');
      try {
        const { response, data } = await api.deleteParticipantAccount({ password });
        if (!response.ok) {
          const message = data.error === 'invalid_password'
            ? 'La contraseña no es correcta.'
            : 'No se pudo eliminar la cuenta. Intenta de nuevo.';
          setStatus(dom.deleteAccountStatus, message, 'error');
          return;
        }
        setStatus(dom.deleteAccountStatus, 'Tu cuenta fue eliminada. Redirigiendo...', 'success');
        setTimeout(() => {
          renderLoggedOut();
        }, 1800);
      } catch {
        setStatus(dom.deleteAccountStatus, 'Error de red. Intenta de nuevo.', 'error');
      }
    });
  }

  function handleVerificationQueryParams() {
    const verifyParam = new URLSearchParams(location.search).get('verify');
    if (verifyParam === 'ok') {
      setStatus(dom.verifyStatus, 'Correo verificado. Cargando tu tablero...', 'success');
      history.replaceState(null, '', '/registro');
      restoreSession();
    } else if (verifyParam === 'expired') {
      setStatus(dom.loginStatus, 'El link expiró. Inicia sesión para reenviar el correo de verificación.', 'error');
      history.replaceState(null, '', '/registro');
    } else if (verifyParam === 'unavailable') {
      setStatus(dom.loginStatus, 'La verificación no está disponible en este momento. Intenta más tarde.', 'error');
      history.replaceState(null, '', '/registro');
    } else if (verifyParam === 'invalid') {
      setStatus(dom.loginStatus, 'Link inválido. Inicia sesión para reenviar el correo de verificación.', 'error');
      history.replaceState(null, '', '/registro');
    }
  }

  function handleResetToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('reset_token');
    if (token) {
      setPageMode('auth');
      showResetUI(token);
    }
  }

  function init() {
    bindTabSwitching();
    bindSignup();
    bindLogin();
    bindLogout();
    bindResendVerification();
    bindForgotPassword();
    bindResetPassword();
    bindDeleteAccount();
    handleVerificationQueryParams();
    handleResetToken();
  }

  return {
    init,
    restoreSession,
    showVerifyUI,
  };
}