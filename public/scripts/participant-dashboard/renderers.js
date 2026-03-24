export function createDashboardRenderers({
  dom,
  escapeHtml,
  formatDate,
  guestResources,
  nl2br,
  setStatus,
  state,
  staticData,
}) {
  function renderSidebar(participant) {
    const firstName = participant?.fullName?.split(' ')?.[0] || 'Participante';
    dom.sidebarFirstName.textContent = firstName;
    dom.sidebarEmail.textContent = participant?.email || 'correo@ejemplo.com';
    if (dom.sidebarAvatar) {
      dom.sidebarAvatar.textContent = firstName.charAt(0).toUpperCase();
    }
    dom.sidebarFlags.innerHTML = participant
      ? [
          {
            label: participant.datallerRegistered ? 'Dataller activo' : 'Dataller inactivo',
            cls: participant.datallerRegistered ? 'participant-admin-flag--active' : '',
          },
          {
            label: participant.workshopCompleted ? 'Validado' : 'Pendiente',
            cls: participant.workshopCompleted ? 'participant-admin-flag--active' : 'participant-admin-flag--pending',
          },
          {
            label: participant.profileEnabled ? 'Perfil listo' : 'Perfil incompleto',
            cls: participant.profileEnabled ? 'participant-admin-flag--active' : '',
          },
        ].map(({ label, cls }) => `<span class="participant-admin-flag ${cls}">${label}</span>`).join('')
      : '';
  }

  function renderPlatformResources(resources = []) {
    const items = resources.length ? resources : guestResources;
    dom.platformResourceList.innerHTML = items.map((item) => {
      if (item.url) {
        return `
          <a class="participant-doc-item participant-doc-item--link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
            <strong>${escapeHtml(item.titulo)}</strong>
            <span>${escapeHtml(item.categoria || item.fuente || 'Recurso')}</span>
          </a>
        `;
      }
      return `<div class="participant-doc-item"><strong>${escapeHtml(item.titulo)}</strong></div>`;
    }).join('');
  }

  function renderEducationalResources() {
    dom.educationalResourceGroups.innerHTML = (staticData.educationalGroups || []).map((group) => `
      <article class="participant-resource-group-card">
        <h4>${escapeHtml(group.title)}</h4>
        <div class="participant-link-list">
          ${group.links.map((link) => `
            <a class="participant-link-item" href="${escapeHtml(link.href)}" target="_blank" rel="noreferrer">
              <strong>${escapeHtml(link.label)}</strong>
              <span>Referencia externa</span>
            </a>
          `).join('')}
        </div>
      </article>
    `).join('');

    dom.strategicSignalGrid.innerHTML = (staticData.strategicStats || []).map((item) => `
      <article class="participant-signal-card">
        <strong>${escapeHtml(item.value)}</strong>
        <span>${escapeHtml(item.label)}</span>
      </article>
    `).join('');

    dom.themeAxisList.innerHTML = (staticData.thematicAxes || []).map((axis) => `
      <article class="participant-axis-card participant-axis-card--${escapeHtml(axis.status)}">
        <div class="participant-axis-head">
          <strong>${escapeHtml(axis.label)}</strong>
          <span class="participant-doc-tag">${escapeHtml(axis.keyData)}</span>
        </div>
        <p>${escapeHtml(axis.detail)}</p>
      </article>
    `).join('');

    dom.currentStackList.innerHTML = (staticData.techComparison?.current || []).map((item) => `
      <div class="participant-stack-item">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.category)}</span>
      </div>
    `).join('');

    dom.legacyStackList.innerHTML = (staticData.techComparison?.legacy || []).map((item) => `
      <div class="participant-stack-item participant-stack-item--legacy">
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(item.category)}</span>
      </div>
    `).join('');

    dom.benchmarkProjectList.innerHTML = (staticData.benchmarkProjects || []).map((project) => `
      <a class="participant-link-item" href="${escapeHtml(project.href)}" target="_blank" rel="noreferrer">
        <strong>${escapeHtml(project.title)}</strong>
        <span>${escapeHtml(project.summary)}</span>
      </a>
    `).join('');
  }

  function renderDatallerResources(enabled) {
    dom.datallerResourcesCopy.textContent = enabled
      ? 'Aquí tienes la biblioteca base del Dataller para trabajar durante la sesión.'
      : 'Activa Dataller para ver todos los recursos del taller.';

    dom.datallerResourceList.innerHTML = enabled
      ? (staticData.datallerResources || []).map((resource) => `
          <a class="participant-link-item" href="${escapeHtml(resource.href)}" target="_blank" rel="noreferrer">
            <strong>${escapeHtml(resource.label)}</strong>
            <span>Recurso del Dataller</span>
          </a>
        `).join('')
      : '<div class="participant-doc-item"><strong>Dataller bloqueado</strong><span>Activa tu participación para abrir esta sección.</span></div>';
  }

  function renderRecognition(participant) {
    dom.recognitionActions.hidden = true;
    dom.recognitionMeta.textContent = '';

    if (!participant) {
      dom.recognitionState.textContent = 'Sin sesión';
      dom.recognitionCopy.textContent = 'Inicia sesión para ver el estado de tu reconocimiento.';
      dom.recognitionBadge.textContent = 'Reconocimiento pendiente';
      return;
    }

    if (!participant.datallerRegistered) {
      dom.recognitionState.textContent = 'Dataller requerido';
      dom.recognitionCopy.textContent = 'Activa Dataller para que el admin pueda autorizar tu certificado.';
      dom.recognitionBadge.textContent = 'Dataller requerido';
      return;
    }

    if (!participant.workshopCompleted) {
      dom.recognitionState.textContent = 'Pendiente';
      dom.recognitionCopy.textContent = 'Tu participación aún no ha sido validada.';
      dom.recognitionBadge.textContent = 'Validación pendiente';
      return;
    }

    if (!participant.recognitionEnabled) {
      dom.recognitionState.textContent = 'Validado';
      dom.recognitionCopy.textContent = 'Ya estás validado. Falta que admin libere tu certificado.';
      dom.recognitionBadge.textContent = 'Esperando liberación';
      return;
    }

    dom.recognitionState.textContent = 'Disponible';
    dom.recognitionCopy.textContent = 'Tu reconocimiento está listo para descargar.';
    dom.recognitionBadge.textContent = 'Reconocimiento listo';
    dom.recognitionActions.hidden = false;
    dom.recognitionDownload.removeAttribute('href');
    dom.recognitionDownload.style.cursor = 'pointer';
    dom.recognitionDownload.onclick = async function (event) {
      event.preventDefault();
      if (dom.recognitionDownload.classList.contains('is-loading')) return;
      dom.recognitionDownload.classList.add('is-loading');
      dom.recognitionDownload.textContent = 'Generando PDF...';
      const resetBtn = () => {
        dom.recognitionDownload.classList.remove('is-loading');
        dom.recognitionDownload.textContent = 'Descargar PDF';
      };
      const safetyTimer = setTimeout(resetBtn, 30000);
      try {
        if (typeof window.generateRecognitionPdf !== 'function') {
          throw new Error('Generador no disponible. Recarga la pagina e intenta de nuevo.');
        }
        await window.generateRecognitionPdf(participant);
      } catch (error) {
        console.error('PDF generation failed:', error);
        if (dom.recognitionCopy) dom.recognitionCopy.textContent = 'Error al generar el PDF. Intenta de nuevo.';
      } finally {
        clearTimeout(safetyTimer);
        resetBtn();
      }
    };
    dom.recognitionMeta.textContent = `Folio: ${participant.recognitionFolio || 'pendiente'}`;
  }

  function applyProfileState(participant) {
    const enabled = Boolean(participant && (participant.profileEnabled || participant.workshopCompleted));
    dom.profileForm.querySelectorAll('input, textarea, button').forEach((field) => {
      field.disabled = !enabled;
    });

    dom.profileForm.fullName.value = participant?.fullName || '';
    dom.profileForm.occupation.value = participant?.occupation || '';
    dom.profileForm.organization.value = participant?.organization || '';
    dom.profileForm.projectUrl.value = participant?.projectUrl || '';
    dom.profileForm.avatarUrl.value = participant?.avatarUrl || '';
    dom.profileForm.bio.value = participant?.bio || '';

    if (!participant) {
      setStatus(dom.profileStatus, 'Inicia sesión para editar tu perfil.', 'info');
    } else if (!enabled) {
      setStatus(dom.profileStatus, 'Tu perfil aún no está habilitado.', 'warn');
    } else {
      setStatus(dom.profileStatus, 'Tu perfil está listo para edición.', 'success');
    }
  }

  function renderNotifications(participant) {
    if (!participant) {
      dom.notificationList.innerHTML = '<div class="participant-notification-item"><strong>Inicia sesión</strong><span>Entra con tu cuenta para activar el Dataller y ver tus materiales.</span></div>';
      return;
    }

    const notifications = [];

    if (!participant.datallerRegistered) {
      notifications.push({
        title: 'Súmate al Dataller',
        copy: 'Activa tu lugar para abrir la presentación tipo libro interactivo y comentar con el grupo.',
      });
    }

    if (participant.datallerRegistered && !state.presentation?.slides?.length) {
      notifications.push({
        title: 'Materiales en preparación',
        copy: 'Tu acceso está listo; en cuanto haya slides activos aparecerán aquí mismo como lectura interactiva.',
      });
    }

    if (participant.datallerRegistered && state.presentation?.slides?.length) {
      notifications.push({
        title: 'Libro interactivo disponible',
        copy: `${state.presentation.slides.length} slides activos ya se pueden leer y navegar dentro del panel.`,
      });
    }

    if (!participant.profileEnabled && !participant.workshopCompleted) {
      notifications.push({
        title: 'Perfil bloqueado por admin',
        copy: 'Tu perfil se habilita cuando el equipo del evento lo libera o al validar tu participación.',
      });
    } else {
      notifications.push({
        title: 'Completa tu nombre para reconocimiento',
        copy: `Hoy aparece como “${participant.fullName}”. Cámbialo si quieres otra versión para constancias y reconocimientos.`,
      });
    }

    if (state.comments.length) {
      notifications.push({
        title: 'Conversación activa',
        copy: `Ya hay ${state.comments.length} comentario${state.comments.length === 1 ? '' : 's'} en la presentación del Dataller.`,
      });
    }

    dom.notificationList.innerHTML = notifications.slice(0, 4).map((item) => `
      <div class="participant-notification-item">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.copy)}</span>
      </div>
    `).join('');
  }

  function renderOverview(participant) {
    dom.dashboardTitle.textContent = participant
      ? `Hola, ${participant.fullName.split(' ')[0]}`
      : 'Tu sesión de Data Driven Day';
    dom.dashboardBadge.textContent = participant ? 'Sesión activa' : 'Sin sesión';

    if (!participant) {
      dom.onboardingTitle.textContent = 'Únete al Dataller para abrir el libro interactivo';
      dom.onboardingSummary.textContent = 'Activa tu lugar para leer la presentación, dejar comentarios y moverte por la curaduría 2026 de soberanía de datos, salud, trazabilidad y resiliencia.';
      dom.journeyBadge.textContent = 'Paso 1';
      dom.onboardingSteps.innerHTML = [
        'Activa tu participación',
        'Lee la presentación como libro online',
        'Comenta y recibe novedades',
        'Explora la biblioteca 2026 curada desde tema2026.md',
      ].map((item) => `<span class="participant-concept-chip">${escapeHtml(item)}</span>`).join('');
      renderNotifications(participant);
    } else if (!participant.datallerRegistered) {
      dom.onboardingTitle.textContent = 'Tu siguiente paso es sumarte al Dataller';
      dom.onboardingSummary.textContent = 'En cuanto lo actives, se abre la presentación interactiva, comentarios y una biblioteca expandida con señales, ejes y benchmarks del tema 2026.';
      dom.journeyBadge.textContent = 'Paso 1';
      dom.onboardingSteps.innerHTML = [
        'Activar Dataller',
        'Abrir materiales interactivos',
        'Completar perfil para reconocimiento',
        'Revisar panorama 2026 y stack recomendado',
      ].map((item) => `<span class="participant-concept-chip">${escapeHtml(item)}</span>`).join('');
      renderNotifications(participant);
    } else {
      dom.onboardingTitle.textContent = 'Tu libro interactivo del Dataller ya está abierto';
      dom.onboardingSummary.textContent = state.presentation?.slides?.length
        ? 'Navega la presentación, deja observaciones y cruza las ideas con el mapa 2026 de recursos, benchmarks y arquitectura emergente.'
        : 'Tu acceso ya está activo. En cuanto el equipo publique slides, aparecerán aquí como un libro online interactivo.';
      dom.journeyBadge.textContent = participant.workshopCompleted ? 'En curso' : 'Activo';
      dom.onboardingSteps.innerHTML = [
        `${state.presentation?.slides?.length ?? 0} slides visibles`,
        `${state.comments.length} comentario${state.comments.length === 1 ? '' : 's'}`,
        `${state.members.length} persona${state.members.length === 1 ? '' : 's'} en comunidad`,
        `${(staticData.thematicAxes || []).length} ejes 2026 curados`,
      ].map((item) => `<span class="participant-concept-chip">${escapeHtml(item)}</span>`).join('');
      renderNotifications(participant);
    }

    dom.statDataller.textContent = participant?.datallerRegistered ? 'Activo' : 'Inactivo';
    dom.statDatallerMeta.textContent = participant?.workshopCompleted
      ? 'Participación validada'
      : participant?.datallerRegistered
        ? 'Esperando validación'
        : 'Activa tu participación';

    dom.statSlides.textContent = String(state.presentation?.slides?.length ?? 0);
    dom.statSlidesMeta.textContent = state.presentation ? 'Slides visibles en el panel' : 'Sin presentación activa';

    dom.statMembers.textContent = String(state.members.length);
    dom.statMembersMeta.textContent = participant?.datallerRegistered
      ? 'Primer nombre de quienes están en Dataller'
      : 'Activa Dataller para ver comunidad';

    dom.statComments.textContent = String(state.comments.length);
    dom.statCommentsMeta.textContent = state.comments.length ? 'Comentarios publicados' : 'Sin comentarios todavía';

    dom.platformSummary.textContent = state.platformResources.length
      ? `${state.platformResources.length} recursos activos disponibles en plataforma.`
      : 'No hay recursos activos todavía.';
  }

  function renderDatallerState(participant) {
    if (!participant) {
      dom.datallerState.textContent = 'Sin sesión';
      dom.datallerCopy.textContent = 'Activa Dataller para ver la presentación y entrar a la comunidad.';
      dom.datallerToggleBtn.disabled = true;
      dom.datallerToggleBtn.textContent = 'Activar Dataller';
      setStatus(dom.datallerStatus, 'Inicia sesión para activar tu participación.', 'info');
      return;
    }

    dom.datallerToggleBtn.disabled = false;

    if (participant.datallerRegistered) {
      dom.datallerState.textContent = participant.workshopCompleted ? 'Validado' : 'Activo';
      dom.datallerCopy.textContent = participant.recognitionEnabled
        ? 'Ya puedes ver presentación, comentar y descargar tu reconocimiento cuando lo necesites.'
        : 'Ya puedes ver presentación, comentar y seguir a la comunidad del Dataller.';
      dom.datallerToggleBtn.textContent = 'Salir de Dataller';
      setStatus(dom.datallerStatus, 'Acceso Dataller activo.', participant.workshopCompleted ? 'success' : 'info');
      return;
    }

    dom.datallerState.textContent = 'Inactivo';
    dom.datallerCopy.textContent = 'Actívalo para abrir la presentación, ver recursos del taller y entrar a la comunidad.';
    dom.datallerToggleBtn.textContent = 'Activar Dataller';
    setStatus(dom.datallerStatus, 'Activa Dataller si vas a participar en el taller.', 'warn');
  }

  function renderPresentationLocked(message) {
    state.slideIndex = 0;
    dom.presentationViewer.classList.add('participant-slide-viewer--locked');
    dom.presentationTitle.textContent = 'Activa Dataller para abrir la presentación';
    dom.presentationDescription.textContent = message;
    dom.slideTag.textContent = 'Dataller';
    dom.slideTitle.textContent = 'Sin acceso todavía';
    dom.slideSubtitle.textContent = 'La presentación aparece cuando activas tu participación.';
    dom.slideBody.innerHTML = 'Aquí aparecerá el contenido de la presentación activa.';
    dom.slideConcepts.innerHTML = '';
    dom.slideCounter.textContent = '0 / 0';
    dom.slidePrevBtn.disabled = true;
    dom.slideNextBtn.disabled = true;
    dom.commentBody.disabled = true;
    dom.commentSubmitBtn.disabled = true;
    dom.commentList.innerHTML = '<div class="participant-comment-empty">Activa Dataller para ver y dejar comentarios.</div>';
    dom.commentsCountLabel.textContent = '0 comentarios';
    dom.communityList.innerHTML = '<div class="participant-member-empty">Activa Dataller para ver la comunidad.</div>';
    dom.statSlides.textContent = '0';
    dom.statMembers.textContent = '0';
    dom.statComments.textContent = '0';
  }

  function renderSlide() {
    const slides = state.presentation?.slides || [];
    if (!slides.length) {
      dom.presentationViewer.classList.add('participant-slide-viewer--locked');
      dom.presentationTitle.textContent = state.presentation?.nombre || 'Sin presentación activa';
      dom.presentationDescription.textContent = state.presentation?.descripcion || 'No hay slides activos en esta presentación.';
      dom.slideTag.textContent = 'Dataller';
      dom.slideTitle.textContent = 'Sin slides activos';
      dom.slideSubtitle.textContent = 'Cuando haya contenido publicado aparecerá aquí.';
      dom.slideBody.innerHTML = 'No hay slides activos por el momento.';
      dom.slideConcepts.innerHTML = '';
      dom.slideCounter.textContent = '0 / 0';
      dom.slidePrevBtn.disabled = true;
      dom.slideNextBtn.disabled = true;
      return;
    }

    dom.presentationViewer.classList.remove('participant-slide-viewer--locked');
    const safeIndex = Math.max(0, Math.min(state.slideIndex, slides.length - 1));
    state.slideIndex = safeIndex;
    const slide = slides[safeIndex];

    dom.presentationTitle.textContent = state.presentation.nombre;
    dom.presentationDescription.textContent = state.presentation.descripcion || 'Presentación activa del Dataller.';
    dom.slideTag.textContent = slide.tag || `Slide ${safeIndex + 1}`;
    dom.slideTitle.textContent = slide.titulo;
    dom.slideSubtitle.textContent = slide.subtitulo || '';
    dom.slideBody.innerHTML = nl2br(slide.cuerpo || '');
    dom.slideConcepts.innerHTML = (slide.conceptosClave || []).map((concept) => `<span class="participant-concept-chip">${escapeHtml(concept)}</span>`).join('');
    dom.slideCounter.textContent = `${safeIndex + 1} / ${slides.length}`;
    dom.slidePrevBtn.disabled = safeIndex === 0;
    dom.slideNextBtn.disabled = safeIndex === slides.length - 1;
  }

  function renderComments() {
    dom.commentsCountLabel.textContent = `${state.comments.length} comentario${state.comments.length === 1 ? '' : 's'}`;

    if (!state.comments.length) {
      dom.commentList.innerHTML = '<div class="participant-comment-empty">Todavía no hay comentarios en esta presentación.</div>';
      return;
    }

    dom.commentList.innerHTML = state.comments.map((comment) => `
      <article class="participant-comment-card">
        <div class="participant-comment-meta">
          <strong>${escapeHtml(comment.authorFirstName)}</strong>
          <span>${escapeHtml(formatDate(comment.createdAt))}</span>
        </div>
        <p>${nl2br(comment.body)}</p>
      </article>
    `).join('');
  }

  function renderMembers() {
    if (!state.members.length) {
      dom.communityList.innerHTML = '<div class="participant-member-empty">Todavía no hay más participantes visibles en el Dataller.</div>';
      return;
    }

    dom.communityList.innerHTML = state.members.map((member) => `
      <div class="participant-member-chip">
        <strong>${escapeHtml(member.firstName)}</strong>
        <span>${escapeHtml(formatDate(member.joinedAt))}</span>
      </div>
    `).join('');
  }

  return {
    applyProfileState,
    renderComments,
    renderDatallerResources,
    renderDatallerState,
    renderEducationalResources,
    renderMembers,
    renderOverview,
    renderPlatformResources,
    renderPresentationLocked,
    renderRecognition,
    renderSidebar,
    renderSlide,
  };
}