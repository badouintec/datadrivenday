export function createWorkspaceFlow({
  api,
  applyProfileState,
  dom,
  renderComments,
  renderDatallerResources,
  renderDatallerState,
  renderMembers,
  renderOverview,
  renderPresentationLocked,
  renderRecognition,
  renderSidebar,
  renderSlide,
  setStatus,
  showPanel,
  state,
}) {
  async function loadDatallerWorkspace(prefetchedRequest) {
    if (!state.participant?.datallerRegistered) {
      if (prefetchedRequest) prefetchedRequest.catch(() => {});
      state.presentation = null;
      state.comments = [];
      state.members = [];
      renderPresentationLocked('La vista de presentación se habilita cuando activas tu lugar en el Dataller.');
      renderDatallerResources(false);
      renderOverview(state.participant);
      return;
    }

    try {
      const { response, data } = await (prefetchedRequest ?? api.fetchDatallerWorkspace());

      if (!response.ok) {
        renderPresentationLocked('No pude cargar el workspace del Dataller.');
        return;
      }

      state.presentation = data.presentation;
      state.comments = data.comments || [];
      state.members = data.members || [];
      state.slideIndex = 0;
      dom.commentBody.disabled = false;
      dom.commentSubmitBtn.disabled = false;
      renderDatallerResources(true);
      renderSlide();
      renderComments();
      renderMembers();
      renderOverview(state.participant);
    } catch {
      renderPresentationLocked('Error de red al cargar el workspace del Dataller.');
    }
  }

  function bindJumpButtons() {
    dom.jumpToDatallerBtn.addEventListener('click', () => showPanel('datallerSection'));
    dom.jumpToProfileBtn.addEventListener('click', () => showPanel('profileSection'));
  }

  function bindDatallerToggle() {
    dom.datallerToggleBtn.addEventListener('click', async () => {
      if (!state.participant) {
        setStatus(dom.datallerStatus, 'Necesitas iniciar sesión primero.', 'warn');
        return;
      }

      const nextValue = !state.participant.datallerRegistered;
      setStatus(dom.datallerStatus, nextValue ? 'Activando Dataller...' : 'Saliendo de Dataller...', 'info');

      try {
        const { response, data } = await api.updateDatallerRegistration({ datallerRegistered: nextValue });

        if (!response.ok) {
          setStatus(dom.datallerStatus, 'No pude actualizar tu estado de Dataller.', 'error');
          return;
        }

        state.participant = data.participant;
        renderSidebar(data.participant);
        renderDatallerState(data.participant);
        renderRecognition(data.participant);
        applyProfileState(data.participant);
        await loadDatallerWorkspace();
      } catch {
        setStatus(dom.datallerStatus, 'Error de red al actualizar Dataller.', 'error');
      }
    });
  }

  function bindSlideNavigation() {
    dom.slidePrevBtn.addEventListener('click', () => {
      state.slideIndex = Math.max(0, state.slideIndex - 1);
      renderSlide();
    });

    dom.slideNextBtn.addEventListener('click', () => {
      const maxIndex = Math.max(0, (state.presentation?.slides?.length || 1) - 1);
      state.slideIndex = Math.min(maxIndex, state.slideIndex + 1);
      renderSlide();
    });
  }

  function bindComments() {
    dom.commentForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.participant?.datallerRegistered || !state.presentation?.id) {
        setStatus(dom.commentStatus, 'Activa Dataller antes de comentar.', 'warn');
        return;
      }

      const body = dom.commentBody.value.trim();
      if (body.length < 3) {
        setStatus(dom.commentStatus, 'Escribe un comentario con más contexto.', 'warn');
        return;
      }

      setStatus(dom.commentStatus, 'Publicando comentario...', 'info');
      dom.commentSubmitBtn.disabled = true;

      try {
        const { response, data } = await api.publishDatallerComment({ presentacionId: state.presentation.id, body });

        if (!response.ok) {
          const message = data.error === 'invalid_length'
            ? 'El comentario debe tener entre 3 y 800 caracteres.'
            : 'No pude guardar tu comentario.';
          setStatus(dom.commentStatus, message, 'error');
          return;
        }

        dom.commentBody.value = '';
        state.comments = [data.comment, ...state.comments];
        renderComments();
        renderOverview(state.participant);
        setStatus(dom.commentStatus, 'Comentario publicado.', 'success');
      } catch {
        setStatus(dom.commentStatus, 'Error de red al publicar el comentario.', 'error');
      } finally {
        dom.commentSubmitBtn.disabled = false;
      }
    });
  }

  function bindProfile() {
    dom.profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!state.participant) {
        setStatus(dom.profileStatus, 'Necesitas iniciar sesión primero.', 'warn');
        return;
      }

      setStatus(dom.profileStatus, 'Guardando perfil...', 'info');
      try {
        const { response, data } = await api.updateParticipantProfile({
          fullName: dom.profileForm.fullName.value.trim(),
          occupation: dom.profileForm.occupation.value.trim(),
          organization: dom.profileForm.organization.value.trim(),
          projectUrl: dom.profileForm.projectUrl.value.trim(),
          avatarUrl: dom.profileForm.avatarUrl.value.trim(),
          bio: dom.profileForm.bio.value.trim(),
        });

        if (!response.ok) {
          const message = data.error === 'profile_locked'
            ? 'Tu perfil aun no esta habilitado.'
            : data.error === 'invalid_full_name'
              ? 'Escribe el nombre tal como quieres que aparezca en tu reconocimiento.'
              : data.error === 'invalid_project_url'
                ? 'El enlace del proyecto debe iniciar con http:// o https://.'
                : data.error === 'invalid_avatar_url'
                  ? 'La URL de foto debe iniciar con http:// o https://.'
                  : 'No pude guardar el perfil.';
          setStatus(dom.profileStatus, message, 'error');
          return;
        }

        state.participant = data.participant;
        renderSidebar(data.participant);
        renderRecognition(data.participant);
        renderDatallerState(data.participant);
        applyProfileState(data.participant);
        renderOverview(data.participant);
        setStatus(dom.profileStatus, 'Perfil guardado.', 'success');
      } catch {
        setStatus(dom.profileStatus, 'Error de red al guardar el perfil.', 'error');
      }
    });
  }

  function init() {
    bindJumpButtons();
    bindDatallerToggle();
    bindSlideNavigation();
    bindComments();
    bindProfile();
  }

  return {
    init,
    loadDatallerWorkspace,
  };
}