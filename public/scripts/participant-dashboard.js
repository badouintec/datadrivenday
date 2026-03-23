// @ts-nocheck
const staticData = JSON.parse(document.getElementById('participantStaticData')?.textContent || '{}');
const guestResources = [
  { titulo: 'Tus recursos activos aparecerán aquí cuando inicies sesión.' },
  { titulo: 'El tablero concentra Dataller, comunidad y biblioteca educativa.' },
];

const registroPage = document.getElementById('registroPage');
const authColumn = document.getElementById('authColumn');
const dashboardColumn = document.getElementById('dashboardColumn');
const tabs = document.querySelectorAll('[data-auth-tab]');
const panes = document.querySelectorAll('[data-auth-pane]');
const authShell = document.getElementById('authShell');
const verifyShell = document.getElementById('verifyShell');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const signupStatus = document.getElementById('signupStatus');
const loginStatus = document.getElementById('loginStatus');
const resendBtn = document.getElementById('resendBtn');
const verifyDirectLink = document.getElementById('verifyDirectLink');
const verifyStatus = document.getElementById('verifyStatus');
const verifyEmail = document.getElementById('verifyEmail');
const sidebarFirstName = document.getElementById('sidebarFirstName');
const sidebarEmail = document.getElementById('sidebarEmail');
const sidebarFlags = document.getElementById('sidebarFlags');
const logoutBtn = document.getElementById('logoutBtn');
const dashboardTitle = document.getElementById('dashboardTitle');
const dashboardBadge = document.getElementById('dashboardBadge');
const recognitionBadge = document.getElementById('recognitionBadge');
const onboardingTitle = document.getElementById('onboardingTitle');
const onboardingSummary = document.getElementById('onboardingSummary');
const onboardingSteps = document.getElementById('onboardingSteps');
const journeyBadge = document.getElementById('journeyBadge');
const jumpToDatallerBtn = document.getElementById('jumpToDatallerBtn');
const jumpToProfileBtn = document.getElementById('jumpToProfileBtn');
const notificationList = document.getElementById('notificationList');
const statDataller = document.getElementById('statDataller');
const statDatallerMeta = document.getElementById('statDatallerMeta');
const statSlides = document.getElementById('statSlides');
const statSlidesMeta = document.getElementById('statSlidesMeta');
const statMembers = document.getElementById('statMembers');
const statMembersMeta = document.getElementById('statMembersMeta');
const statComments = document.getElementById('statComments');
const statCommentsMeta = document.getElementById('statCommentsMeta');
const platformSummary = document.getElementById('platformSummary');
const platformResourceList = document.getElementById('platformResourceList');
const datallerSummary = document.getElementById('datallerSummary');
const datallerState = document.getElementById('datallerState');
const datallerCopy = document.getElementById('datallerCopy');
const datallerToggleBtn = document.getElementById('datallerToggleBtn');
const datallerStatus = document.getElementById('datallerStatus');
const presentationTitle = document.getElementById('presentationTitle');
const presentationDescription = document.getElementById('presentationDescription');
const presentationViewer = document.getElementById('presentationViewer');
const slideTag = document.getElementById('slideTag');
const slideTitle = document.getElementById('slideTitle');
const slideSubtitle = document.getElementById('slideSubtitle');
const slideBody = document.getElementById('slideBody');
const slideConcepts = document.getElementById('slideConcepts');
const slideCounter = document.getElementById('slideCounter');
const slidePrevBtn = document.getElementById('slidePrevBtn');
const slideNextBtn = document.getElementById('slideNextBtn');
const commentsCountLabel = document.getElementById('commentsCountLabel');
const commentForm = document.getElementById('commentForm');
const commentBody = document.getElementById('commentBody');
const commentSubmitBtn = document.getElementById('commentSubmitBtn');
const commentStatus = document.getElementById('commentStatus');
const commentList = document.getElementById('commentList');
const datallerResourcesCopy = document.getElementById('datallerResourcesCopy');
const datallerResourceList = document.getElementById('datallerResourceList');
const educationalResourceGroups = document.getElementById('educationalResourceGroups');
const strategicSignalGrid = document.getElementById('strategicSignalGrid');
const themeAxisList = document.getElementById('themeAxisList');
const currentStackList = document.getElementById('currentStackList');
const legacyStackList = document.getElementById('legacyStackList');
const benchmarkProjectList = document.getElementById('benchmarkProjectList');
const communityList = document.getElementById('communityList');
const recognitionState = document.getElementById('recognitionState');
const recognitionCopy = document.getElementById('recognitionCopy');
const recognitionActions = document.getElementById('recognitionActions');
const recognitionDownload = document.getElementById('recognitionDownload');
const recognitionMeta = document.getElementById('recognitionMeta');
const profileForm = document.getElementById('profileForm');
const profileStatus = document.getElementById('profileStatus');
const navButtons = document.querySelectorAll('[data-panel]');
const sidebarAvatar = document.getElementById('sidebarAvatar');
const topbarKicker = document.getElementById('topbarKicker');
const mobileNavToggle = document.getElementById('mobileNavToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const adminShell = document.querySelector('.participant-admin-shell');

const state = {
  participant: null,
  platformResources: [],
  presentation: null,
  comments: [],
  members: [],
  slideIndex: 0,
  verificationEmailAvailable: true,
  verificationEmailSent: true,
  verificationDirectUrl: null,
  verificationError: null,
};

function setVerificationDirectUrl(url) {
  state.verificationDirectUrl = url || null;
  verifyDirectLink.hidden = !state.verificationDirectUrl;
  verifyDirectLink.href = state.verificationDirectUrl || '#';
}

function setPageMode(mode) {
  const isDashboard = mode === 'dashboard';
  authColumn.hidden = isDashboard;
  dashboardColumn.hidden = !isDashboard;
  registroPage.classList.toggle('registro-page--auth-only', !isDashboard);
  registroPage.classList.toggle('registro-page--dashboard', isDashboard);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function nl2br(value) {
  return escapeHtml(value).replaceAll('\n', '<br>');
}

function setStatus(element, message, kind = 'info') {
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

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const PANEL_META = {
  overviewSection:  { kicker: 'Tablero participante', title: 'Tu sesión de Data Driven Day' },
  datallerSection:  { kicker: 'Dataller', title: 'Presentación activa y comentarios' },
  resourcesSection: { kicker: 'Recursos', title: 'Materiales y biblioteca educativa' },
  communitySection: { kicker: 'Comunidad', title: 'Quiénes más están en el Dataller' },
  profileSection:   { kicker: 'Mi perfil', title: 'Cuenta y preferencias' },
};

function showPanel(sectionId) {
  navButtons.forEach((item) => item.classList.toggle('is-active', item.dataset.panel === sectionId));
  document.querySelectorAll('.participant-admin-section').forEach((s) => {
    s.classList.toggle('is-active', s.id === sectionId);
  });
  const meta = PANEL_META[sectionId];
  if (meta) {
    if (dashboardTitle) dashboardTitle.textContent = meta.title;
    if (topbarKicker) topbarKicker.textContent = meta.kicker;
  }
  adminShell?.classList.remove('sidebar-open');
  mobileNavToggle?.setAttribute('aria-expanded', 'false');
}

function renderSidebar(participant) {
  const firstName = participant?.fullName?.split(' ')?.[0] || 'Participante';
  sidebarFirstName.textContent = firstName;
  sidebarEmail.textContent = participant?.email || 'correo@ejemplo.com';
  if (sidebarAvatar) {
    sidebarAvatar.textContent = firstName.charAt(0).toUpperCase();
  }
  sidebarFlags.innerHTML = participant
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
  platformResourceList.innerHTML = items.map((item) => {
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
  educationalResourceGroups.innerHTML = (staticData.educationalGroups || []).map((group) => `
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

  strategicSignalGrid.innerHTML = (staticData.strategicStats || []).map((item) => `
    <article class="participant-signal-card">
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.label)}</span>
    </article>
  `).join('');

  themeAxisList.innerHTML = (staticData.thematicAxes || []).map((axis) => `
    <article class="participant-axis-card participant-axis-card--${escapeHtml(axis.status)}">
      <div class="participant-axis-head">
        <strong>${escapeHtml(axis.label)}</strong>
        <span class="participant-doc-tag">${escapeHtml(axis.keyData)}</span>
      </div>
      <p>${escapeHtml(axis.detail)}</p>
    </article>
  `).join('');

  currentStackList.innerHTML = (staticData.techComparison?.current || []).map((item) => `
    <div class="participant-stack-item">
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(item.category)}</span>
    </div>
  `).join('');

  legacyStackList.innerHTML = (staticData.techComparison?.legacy || []).map((item) => `
    <div class="participant-stack-item participant-stack-item--legacy">
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(item.category)}</span>
    </div>
  `).join('');

  benchmarkProjectList.innerHTML = (staticData.benchmarkProjects || []).map((project) => `
    <a class="participant-link-item" href="${escapeHtml(project.href)}" target="_blank" rel="noreferrer">
      <strong>${escapeHtml(project.title)}</strong>
      <span>${escapeHtml(project.summary)}</span>
    </a>
  `).join('');
}

function renderDatallerResources(enabled) {
  datallerResourcesCopy.textContent = enabled
    ? 'Aquí tienes la biblioteca base del Dataller para trabajar durante la sesión.'
    : 'Activa Dataller para ver todos los recursos del taller.';

  datallerResourceList.innerHTML = enabled
    ? (staticData.datallerResources || []).map((resource) => `
        <a class="participant-link-item" href="${escapeHtml(resource.href)}" target="_blank" rel="noreferrer">
          <strong>${escapeHtml(resource.label)}</strong>
          <span>Recurso del Dataller</span>
        </a>
      `).join('')
    : '<div class="participant-doc-item"><strong>Dataller bloqueado</strong><span>Activa tu participación para abrir esta sección.</span></div>';
}

function renderRecognition(participant) {
  recognitionActions.hidden = true;
  recognitionMeta.textContent = '';

  if (!participant) {
    recognitionState.textContent = 'Sin sesión';
    recognitionCopy.textContent = 'Inicia sesión para ver el estado de tu reconocimiento.';
    recognitionBadge.textContent = 'Reconocimiento pendiente';
    return;
  }

  if (!participant.datallerRegistered) {
    recognitionState.textContent = 'Dataller requerido';
    recognitionCopy.textContent = 'Activa Dataller para que el admin pueda autorizar tu certificado.';
    recognitionBadge.textContent = 'Dataller requerido';
    return;
  }

  if (!participant.workshopCompleted) {
    recognitionState.textContent = 'Pendiente';
    recognitionCopy.textContent = 'Tu participación aún no ha sido validada.';
    recognitionBadge.textContent = 'Validación pendiente';
    return;
  }

  if (!participant.recognitionEnabled) {
    recognitionState.textContent = 'Validado';
    recognitionCopy.textContent = 'Ya estás validado. Falta que admin libere tu certificado.';
    recognitionBadge.textContent = 'Esperando liberación';
    return;
  }

  recognitionState.textContent = 'Disponible';
  recognitionCopy.textContent = 'Tu reconocimiento está listo para descargar.';
  recognitionBadge.textContent = 'Reconocimiento listo';
  recognitionActions.hidden = false;
  recognitionDownload.href = '/api/participant/recognition';
  recognitionMeta.textContent = `Folio: ${participant.recognitionFolio || 'pendiente'}`;
}

function applyProfileState(participant) {
  const enabled = Boolean(participant && (participant.profileEnabled || participant.workshopCompleted));
  profileForm.querySelectorAll('input, textarea, button').forEach((field) => {
    field.disabled = !enabled;
  });

  profileForm.fullName.value = participant?.fullName || '';
  profileForm.occupation.value = participant?.occupation || '';
  profileForm.organization.value = participant?.organization || '';
  profileForm.projectUrl.value = participant?.projectUrl || '';
  profileForm.avatarUrl.value = participant?.avatarUrl || '';
  profileForm.bio.value = participant?.bio || '';

  if (!participant) {
    setStatus(profileStatus, 'Inicia sesión para editar tu perfil.', 'info');
  } else if (!enabled) {
    setStatus(profileStatus, 'Tu perfil aún no está habilitado.', 'warn');
  } else {
    setStatus(profileStatus, 'Tu perfil está listo para edición.', 'success');
  }
}

function renderNotifications(participant) {
  if (!participant) {
    notificationList.innerHTML = '<div class="participant-notification-item"><strong>Inicia sesión</strong><span>Entra con tu cuenta para activar el Dataller y ver tus materiales.</span></div>';
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

  notificationList.innerHTML = notifications.slice(0, 4).map((item) => `
    <div class="participant-notification-item">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.copy)}</span>
    </div>
  `).join('');
}

function renderOverview(participant) {
  dashboardTitle.textContent = participant
    ? `Hola, ${participant.fullName.split(' ')[0]}`
    : 'Tu sesión de Data Driven Day';
  dashboardBadge.textContent = participant ? 'Sesión activa' : 'Sin sesión';

  if (!participant) {
    onboardingTitle.textContent = 'Únete al Dataller para abrir el libro interactivo';
    onboardingSummary.textContent = 'Activa tu lugar para leer la presentación, dejar comentarios y moverte por la curaduría 2026 de soberanía de datos, salud, trazabilidad y resiliencia.';
    journeyBadge.textContent = 'Paso 1';
    onboardingSteps.innerHTML = [
      'Activa tu participación',
      'Lee la presentación como libro online',
      'Comenta y recibe novedades',
      'Explora la biblioteca 2026 curada desde tema2026.md',
    ].map((item) => `<span class="participant-concept-chip">${escapeHtml(item)}</span>`).join('');
    renderNotifications(participant);
  } else if (!participant.datallerRegistered) {
    onboardingTitle.textContent = 'Tu siguiente paso es sumarte al Dataller';
    onboardingSummary.textContent = 'En cuanto lo actives, se abre la presentación interactiva, comentarios y una biblioteca expandida con señales, ejes y benchmarks del tema 2026.';
    journeyBadge.textContent = 'Paso 1';
    onboardingSteps.innerHTML = [
      'Activar Dataller',
      'Abrir materiales interactivos',
      'Completar perfil para reconocimiento',
      'Revisar panorama 2026 y stack recomendado',
    ].map((item) => `<span class="participant-concept-chip">${escapeHtml(item)}</span>`).join('');
    renderNotifications(participant);
  } else {
    onboardingTitle.textContent = 'Tu libro interactivo del Dataller ya está abierto';
    onboardingSummary.textContent = state.presentation?.slides?.length
      ? 'Navega la presentación, deja observaciones y cruza las ideas con el mapa 2026 de recursos, benchmarks y arquitectura emergente.'
      : 'Tu acceso ya está activo. En cuanto el equipo publique slides, aparecerán aquí como un libro online interactivo.';
    journeyBadge.textContent = participant.workshopCompleted ? 'En curso' : 'Activo';
    onboardingSteps.innerHTML = [
      `${state.presentation?.slides?.length ?? 0} slides visibles`,
      `${state.comments.length} comentario${state.comments.length === 1 ? '' : 's'}`,
      `${state.members.length} persona${state.members.length === 1 ? '' : 's'} en comunidad`,
      `${(staticData.thematicAxes || []).length} ejes 2026 curados`,
    ].map((item) => `<span class="participant-concept-chip">${escapeHtml(item)}</span>`).join('');
    renderNotifications(participant);
  }

  statDataller.textContent = participant?.datallerRegistered ? 'Activo' : 'Inactivo';
  statDatallerMeta.textContent = participant?.workshopCompleted
    ? 'Participación validada'
    : participant?.datallerRegistered
      ? 'Esperando validación'
      : 'Activa tu participación';

  statSlides.textContent = String(state.presentation?.slides?.length ?? 0);
  statSlidesMeta.textContent = state.presentation ? 'Slides visibles en el panel' : 'Sin presentación activa';

  statMembers.textContent = String(state.members.length);
  statMembersMeta.textContent = participant?.datallerRegistered
    ? 'Primer nombre de quienes están en Dataller'
    : 'Activa Dataller para ver comunidad';

  statComments.textContent = String(state.comments.length);
  statCommentsMeta.textContent = state.comments.length ? 'Comentarios publicados' : 'Sin comentarios todavía';

  platformSummary.textContent = state.platformResources.length
    ? `${state.platformResources.length} recursos activos disponibles en plataforma.`
    : 'No hay recursos activos todavía.';
}

function renderDatallerState(participant) {
  if (!participant) {
    datallerState.textContent = 'Sin sesión';
    datallerCopy.textContent = 'Activa Dataller para ver la presentación y entrar a la comunidad.';
    datallerToggleBtn.disabled = true;
    datallerToggleBtn.textContent = 'Activar Dataller';
    setStatus(datallerStatus, 'Inicia sesión para activar tu participación.', 'info');
    return;
  }

  datallerToggleBtn.disabled = false;

  if (participant.datallerRegistered) {
    datallerState.textContent = participant.workshopCompleted ? 'Validado' : 'Activo';
    datallerCopy.textContent = participant.recognitionEnabled
      ? 'Ya puedes ver presentación, comentar y descargar tu reconocimiento cuando lo necesites.'
      : 'Ya puedes ver presentación, comentar y seguir a la comunidad del Dataller.';
    datallerToggleBtn.textContent = 'Salir de Dataller';
    setStatus(datallerStatus, 'Acceso Dataller activo.', participant.workshopCompleted ? 'success' : 'info');
    return;
  }

  datallerState.textContent = 'Inactivo';
  datallerCopy.textContent = 'Actívalo para abrir la presentación, ver recursos del taller y entrar a la comunidad.';
  datallerToggleBtn.textContent = 'Activar Dataller';
  setStatus(datallerStatus, 'Activa Dataller si vas a participar en el taller.', 'warn');
}

function renderPresentationLocked(message) {
  state.slideIndex = 0;
  presentationViewer.classList.add('participant-slide-viewer--locked');
  presentationTitle.textContent = 'Activa Dataller para abrir la presentación';
  presentationDescription.textContent = message;
  slideTag.textContent = 'Dataller';
  slideTitle.textContent = 'Sin acceso todavía';
  slideSubtitle.textContent = 'La presentación aparece cuando activas tu participación.';
  slideBody.innerHTML = 'Aquí aparecerá el contenido de la presentación activa.';
  slideConcepts.innerHTML = '';
  slideCounter.textContent = '0 / 0';
  slidePrevBtn.disabled = true;
  slideNextBtn.disabled = true;
  commentBody.disabled = true;
  commentSubmitBtn.disabled = true;
  commentList.innerHTML = '<div class="participant-comment-empty">Activa Dataller para ver y dejar comentarios.</div>';
  commentsCountLabel.textContent = '0 comentarios';
  communityList.innerHTML = '<div class="participant-member-empty">Activa Dataller para ver la comunidad.</div>';
  statSlides.textContent = '0';
  statMembers.textContent = '0';
  statComments.textContent = '0';
}

function renderSlide() {
  const slides = state.presentation?.slides || [];
  if (!slides.length) {
    presentationViewer.classList.add('participant-slide-viewer--locked');
    presentationTitle.textContent = state.presentation?.nombre || 'Sin presentación activa';
    presentationDescription.textContent = state.presentation?.descripcion || 'No hay slides activos en esta presentación.';
    slideTag.textContent = 'Dataller';
    slideTitle.textContent = 'Sin slides activos';
    slideSubtitle.textContent = 'Cuando haya contenido publicado aparecerá aquí.';
    slideBody.innerHTML = 'No hay slides activos por el momento.';
    slideConcepts.innerHTML = '';
    slideCounter.textContent = '0 / 0';
    slidePrevBtn.disabled = true;
    slideNextBtn.disabled = true;
    return;
  }

  presentationViewer.classList.remove('participant-slide-viewer--locked');
  const safeIndex = Math.max(0, Math.min(state.slideIndex, slides.length - 1));
  state.slideIndex = safeIndex;
  const slide = slides[safeIndex];

  presentationTitle.textContent = state.presentation.nombre;
  presentationDescription.textContent = state.presentation.descripcion || 'Presentación activa del Dataller.';
  slideTag.textContent = slide.tag || `Slide ${safeIndex + 1}`;
  slideTitle.textContent = slide.titulo;
  slideSubtitle.textContent = slide.subtitulo || '';
  slideBody.innerHTML = nl2br(slide.cuerpo || '');
  slideConcepts.innerHTML = (slide.conceptosClave || []).map((concept) => `<span class="participant-concept-chip">${escapeHtml(concept)}</span>`).join('');
  slideCounter.textContent = `${safeIndex + 1} / ${slides.length}`;
  slidePrevBtn.disabled = safeIndex === 0;
  slideNextBtn.disabled = safeIndex === slides.length - 1;
}

function renderComments() {
  commentsCountLabel.textContent = `${state.comments.length} comentario${state.comments.length === 1 ? '' : 's'}`;

  if (!state.comments.length) {
    commentList.innerHTML = '<div class="participant-comment-empty">Todavía no hay comentarios en esta presentación.</div>';
    return;
  }

  commentList.innerHTML = state.comments.map((comment) => `
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
    communityList.innerHTML = '<div class="participant-member-empty">Todavía no hay más participantes visibles en el Dataller.</div>';
    return;
  }

  communityList.innerHTML = state.members.map((member) => `
    <div class="participant-member-chip">
      <strong>${escapeHtml(member.firstName)}</strong>
      <span>${escapeHtml(formatDate(member.joinedAt))}</span>
    </div>
  `).join('');
}

async function loadDatallerWorkspace(prefetchedResponse) {
  if (!state.participant?.datallerRegistered) {
    if (prefetchedResponse) prefetchedResponse.catch(() => {});
    state.presentation = null;
    state.comments = [];
    state.members = [];
    renderPresentationLocked('La vista de presentación se habilita cuando activas tu lugar en el Dataller.');
    renderDatallerResources(false);
    renderOverview(state.participant);
    return;
  }

  try {
    const response = await (prefetchedResponse ?? fetch('/api/participant/dataller/workspace'));
    const data = await response.json();

    if (!response.ok) {
      renderPresentationLocked('No pude cargar el workspace del Dataller.');
      return;
    }

    state.presentation = data.presentation;
    state.comments = data.comments || [];
    state.members = data.members || [];
    state.slideIndex = 0;
    commentBody.disabled = false;
    commentSubmitBtn.disabled = false;
    renderDatallerResources(true);
    renderSlide();
    renderComments();
    renderMembers();
    renderOverview(state.participant);
  } catch {
    renderPresentationLocked('Error de red al cargar el workspace del Dataller.');
  }
}

async function loadDashboard() {
  // Fire both requests in parallel to avoid sequential round-trips on page load
  const workspacePrefetch = fetch('/api/participant/dataller/workspace');
  const response = await fetch('/api/participant/dashboard');
  if (!response.ok) {
    workspacePrefetch.catch(() => {});
    throw new Error('dashboard_failed');
  }

  const data = await response.json();
  state.participant = data.participant;
  state.platformResources = data.recursos || [];
  state.verificationEmailAvailable = data.verificationEmailAvailable !== false;
  state.verificationError = data.verificationError || null;
  setVerificationDirectUrl(data.verificationDirectUrl || null);

  if (!data.participant.emailVerified) {
    showVerifyUI(data.participant, {
      available: state.verificationEmailAvailable,
      sent: true,
      directUrl: state.verificationDirectUrl,
      error: state.verificationError,
    });
    return;
  }

  setPageMode('dashboard');
  showPanel('overviewSection');
  renderSidebar(data.participant);
  renderPlatformResources(state.platformResources);
  renderRecognition(data.participant);
  renderDatallerState(data.participant);
  applyProfileState(data.participant);
  renderEducationalResources();
  await loadDatallerWorkspace(workspacePrefetch);
}

function renderLoggedOut() {
  state.participant = null;
  state.platformResources = [];
  state.presentation = null;
  state.comments = [];
  state.members = [];
  state.verificationEmailAvailable = true;
  state.verificationEmailSent = true;
  state.verificationError = null;
  setVerificationDirectUrl(null);
  setPageMode('auth');
  authShell.hidden = false;
  verifyShell.hidden = true;
  resendBtn.hidden = false;
  resendBtn.disabled = false;
  renderSidebar(null);
  renderPlatformResources();
  renderRecognition(null);
  renderDatallerState(null);
  renderDatallerResources(false);
  renderPresentationLocked('La vista de presentación se habilita cuando activas tu lugar en el Dataller.');
  renderEducationalResources();
  applyProfileState(null);
  dashboardTitle.textContent = 'Tu sesión de Data Driven Day';
  dashboardBadge.textContent = 'Sin sesión';
  recognitionBadge.textContent = 'Reconocimiento pendiente';
}

function showVerifyUI(participant, options = {}) {
  state.participant = participant;
  state.verificationEmailAvailable = options.available ?? state.verificationEmailAvailable;
  state.verificationEmailSent = options.sent ?? true;
  state.verificationError = options.error ?? null;
  setVerificationDirectUrl(options.directUrl ?? null);
  setPageMode('auth');
  authShell.hidden = true;
  verifyShell.hidden = false;
  resendBtn.hidden = false;
  resendBtn.disabled = !state.verificationEmailAvailable;

  if (!state.verificationEmailAvailable) {
    verifyEmail.textContent = `Tu cuenta quedó creada con ${participant.email}, pero el envío de correo no está disponible ahora mismo.`;
    setStatus(
      verifyStatus,
      state.verificationDirectUrl
        ? 'Este entorno local no puede mandar correo ahora mismo. Usa el link directo para verificar la cuenta.'
        : 'No fue posible enviar el correo de verificación. Intenta más tarde o solicita soporte.',
      state.verificationDirectUrl ? 'warn' : 'error',
    );
    return;
  }

  if (!state.verificationEmailSent) {
    verifyEmail.textContent = `Tu cuenta quedó creada con ${participant.email}, pero no pude entregar el primer correo de verificación.`;
    const usesDirectLink = Boolean(state.verificationDirectUrl);
    const message = usesDirectLink
      ? 'Resend bloqueó el envío en este entorno. Usa el link directo para verificar la cuenta.'
      : state.verificationError === 'domain_not_verified'
        ? 'El dominio remitente todavía no está verificado en Resend.'
        : state.verificationError === 'testing_recipient_restricted'
          ? 'La cuenta de Resend está en modo de prueba y no puede enviar a ese destinatario.'
          : 'Usa "Reenviar correo" para intentar otra vez.';
    setStatus(verifyStatus, message, usesDirectLink ? 'warn' : 'error');
    return;
  }

  verifyEmail.textContent = `Enviamos un link de verificación a ${participant.email}`;
  setStatus(verifyStatus, '', 'info');
}

async function restoreSession() {
  try {
    await loadDashboard();
  } catch {
    renderLoggedOut();
  }
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const view = tab.getAttribute('data-auth-tab');
    tabs.forEach((item) => {
      item.classList.toggle('is-active', item === tab);
      item.setAttribute('aria-selected', String(item === tab));
    });
    panes.forEach((pane) => pane.classList.toggle('is-active', pane.getAttribute('data-auth-pane') === view));
    // Hide forgot/reset shells when switching tabs
    if (forgotShell) forgotShell.hidden = true;
    if (resetShell) resetShell.hidden = true;
    authShell.hidden = false;
  });
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => showPanel(button.dataset.panel));
});

jumpToDatallerBtn.addEventListener('click', () => showPanel('datallerSection'));
jumpToProfileBtn.addEventListener('click', () => showPanel('profileSection'));

mobileNavToggle?.addEventListener('click', () => {
  const isOpen = adminShell?.classList.toggle('sidebar-open');
  mobileNavToggle.setAttribute('aria-expanded', String(!!isOpen));
});

sidebarOverlay?.addEventListener('click', () => {
  adminShell?.classList.remove('sidebar-open');
  mobileNavToggle?.setAttribute('aria-expanded', 'false');
});

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(signupStatus, 'Creando cuenta...', 'info');

  try {
    const response = await fetch('/api/participant/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: signupForm.fullName.value.trim(),
        email: signupForm.email.value.trim(),
        password: signupForm.password.value,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      const messages = {
        missing_fields: 'Faltan campos obligatorios.',
        weak_password: 'La contraseña debe tener entre 8 y 128 caracteres.',
        email_taken: 'Ese correo ya tiene cuenta.',
        invalid_email: 'Escribe un correo valido.',
        too_many_attempts: 'Demasiados intentos. Espera 1 hora e intenta de nuevo.',
      };
      setStatus(signupStatus, messages[data.error] || 'No pude crear la cuenta.', 'error');
      return;
    }

    signupForm.reset();
    state.verificationEmailAvailable = data.verificationEmailAvailable !== false;
    state.verificationEmailSent = data.verificationEmailSent !== false;
    state.verificationError = data.verificationError || null;
    setVerificationDirectUrl(data.verificationDirectUrl || null);
    setStatus(signupStatus, '', 'info');
    showVerifyUI(data.participant, {
      available: state.verificationEmailAvailable,
      sent: state.verificationEmailSent,
      directUrl: state.verificationDirectUrl,
      error: state.verificationError,
    });
  } catch {
    setStatus(signupStatus, 'Error de red al crear la cuenta.', 'error');
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(loginStatus, 'Entrando...', 'info');

  try {
    const response = await fetch('/api/participant/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: loginForm.email.value.trim(),
        password: loginForm.password.value,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      const message = data.error === 'invalid_credentials'
        ? 'Correo o contraseña incorrectos.'
        : data.error === 'invalid_email'
          ? 'Escribe un correo valido.'
          : data.error === 'too_many_attempts'
            ? 'Demasiados intentos fallidos. Espera 15 minutos.'
            : 'No pude abrir la sesión.';
      setStatus(loginStatus, message, 'error');
      return;
    }

    loginForm.reset();
    setStatus(loginStatus, 'Sesión abierta. Cargando tu tablero...', 'success');
    await loadDashboard();
  } catch {
    setStatus(loginStatus, 'Error de red al iniciar sesión.', 'error');
  }
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/participant/logout', { method: 'POST' }).catch(() => null);
  setStatus(signupStatus, '', 'info');
  setStatus(loginStatus, '', 'info');
  renderLoggedOut();
});

// Handle ?verify= query param (user clicked link from email)
const verifyParam = new URLSearchParams(location.search).get('verify');
if (verifyParam === 'ok') {
  setStatus(verifyStatus, 'Correo verificado. Cargando tu tablero...', 'success');
  history.replaceState(null, '', '/registro');
  restoreSession();
} else if (verifyParam === 'expired') {
  setStatus(loginStatus, 'El link expiró. Inicia sesión para reenviar el correo de verificación.', 'error');
  history.replaceState(null, '', '/registro');
} else if (verifyParam === 'unavailable') {
  setStatus(loginStatus, 'La verificación no está disponible en este momento. Intenta más tarde.', 'error');
  history.replaceState(null, '', '/registro');
} else if (verifyParam === 'invalid') {
  setStatus(loginStatus, 'Link inválido. Inicia sesión para reenviar el correo de verificación.', 'error');
  history.replaceState(null, '', '/registro');
}

resendBtn.addEventListener('click', async () => {
  setStatus(verifyStatus, 'Reenviando...', 'info');
  resendBtn.disabled = true;

  try {
    const response = await fetch('/api/participant/resend-verification', { method: 'POST' });
    const data = await response.json();

    if (data.already) {
      setStatus(verifyStatus, 'Tu correo ya está verificado.', 'success');
      await loadDashboard();
      return;
    }

    if (!response.ok) {
      setVerificationDirectUrl(data.verificationDirectUrl || null);
      const message = data.error === 'email_not_configured'
        ? 'El correo de verificación no está disponible en este momento.'
        : data.verificationError === 'domain_not_verified'
          ? 'El dominio remitente todavía no está verificado en Resend.'
          : data.verificationError === 'testing_recipient_restricted'
            ? 'La cuenta de Resend está en modo de prueba y no puede enviar a ese destinatario.'
            : 'No se pudo reenviar. Intenta en un momento.';
      setStatus(verifyStatus, message, 'error');
      return;
    }

    state.verificationError = data.verificationError || null;
    setVerificationDirectUrl(data.verificationDirectUrl || null);
    setStatus(
      verifyStatus,
      data.delivered === false && state.verificationDirectUrl
        ? 'No se pudo mandar el correo desde este entorno, pero ya tienes un link directo de verificación.'
        : 'Correo reenviado. Revisa tu bandeja.',
      data.delivered === false ? 'warn' : 'success',
    );
  } catch {
    setStatus(verifyStatus, 'Error de red al reenviar.', 'error');
  } finally {
    setTimeout(() => {
      resendBtn.disabled = false;
    }, 30000);
  }
});

datallerToggleBtn.addEventListener('click', async () => {
  if (!state.participant) {
    setStatus(datallerStatus, 'Necesitas iniciar sesión primero.', 'warn');
    return;
  }

  const nextValue = !state.participant.datallerRegistered;
  setStatus(datallerStatus, nextValue ? 'Activando Dataller...' : 'Saliendo de Dataller...', 'info');

  try {
    const response = await fetch('/api/participant/dataller', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datallerRegistered: nextValue }),
    });
    const data = await response.json();

    if (!response.ok) {
      setStatus(datallerStatus, 'No pude actualizar tu estado de Dataller.', 'error');
      return;
    }

    state.participant = data.participant;
    renderSidebar(data.participant);
    renderDatallerState(data.participant);
    renderRecognition(data.participant);
    applyProfileState(data.participant);
    await loadDatallerWorkspace();
  } catch {
    setStatus(datallerStatus, 'Error de red al actualizar Dataller.', 'error');
  }
});

slidePrevBtn.addEventListener('click', () => {
  state.slideIndex = Math.max(0, state.slideIndex - 1);
  renderSlide();
});

slideNextBtn.addEventListener('click', () => {
  const maxIndex = Math.max(0, (state.presentation?.slides?.length || 1) - 1);
  state.slideIndex = Math.min(maxIndex, state.slideIndex + 1);
  renderSlide();
});

commentForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.participant?.datallerRegistered || !state.presentation?.id) {
    setStatus(commentStatus, 'Activa Dataller antes de comentar.', 'warn');
    return;
  }

  const body = commentBody.value.trim();
  if (body.length < 3) {
    setStatus(commentStatus, 'Escribe un comentario con más contexto.', 'warn');
    return;
  }

  setStatus(commentStatus, 'Publicando comentario...', 'info');
  commentSubmitBtn.disabled = true;

  try {
    const response = await fetch('/api/participant/dataller/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presentacionId: state.presentation.id, body }),
    });
    const data = await response.json();

    if (!response.ok) {
      const message = data.error === 'invalid_length'
        ? 'El comentario debe tener entre 3 y 800 caracteres.'
        : 'No pude guardar tu comentario.';
      setStatus(commentStatus, message, 'error');
      return;
    }

    commentBody.value = '';
    state.comments = [data.comment, ...state.comments];
    renderComments();
    renderOverview(state.participant);
    setStatus(commentStatus, 'Comentario publicado.', 'success');
  } catch {
    setStatus(commentStatus, 'Error de red al publicar el comentario.', 'error');
  } finally {
    commentSubmitBtn.disabled = false;
  }
});

profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.participant) {
    setStatus(profileStatus, 'Necesitas iniciar sesión primero.', 'warn');
    return;
  }

  setStatus(profileStatus, 'Guardando perfil...', 'info');
  try {
    const response = await fetch('/api/participant/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: profileForm.fullName.value.trim(),
        occupation: profileForm.occupation.value.trim(),
        organization: profileForm.organization.value.trim(),
        projectUrl: profileForm.projectUrl.value.trim(),
        avatarUrl: profileForm.avatarUrl.value.trim(),
        bio: profileForm.bio.value.trim(),
      }),
    });
    const data = await response.json();

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
      setStatus(profileStatus, message, 'error');
      return;
    }

    state.participant = data.participant;
    renderSidebar(data.participant);
    renderRecognition(data.participant);
    renderDatallerState(data.participant);
    applyProfileState(data.participant);
    renderOverview(data.participant);
    setStatus(profileStatus, 'Perfil guardado.', 'success');
  } catch {
    setStatus(profileStatus, 'Error de red al guardar el perfil.', 'error');
  }
});

// ── FORGOT / RESET PASSWORD ────────────────────────────────────

const forgotShell = document.getElementById('forgotShell');
const forgotForm = document.getElementById('forgotForm');
const forgotStatus = document.getElementById('forgotStatus');
const forgotBackBtn = document.getElementById('forgotBackBtn');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
const resetShell = document.getElementById('resetShell');
const resetForm = document.getElementById('resetForm');
const resetStatus = document.getElementById('resetStatus');
const resetTokenInput = document.getElementById('resetToken');

function showForgotUI() {
  authShell.hidden = true;
  verifyShell.hidden = true;
  forgotShell.hidden = false;
  resetShell.hidden = true;
  setStatus(forgotStatus, '', 'info');
  forgotForm?.reset();
}

function showResetUI(token) {
  authShell.hidden = true;
  verifyShell.hidden = true;
  forgotShell.hidden = true;
  resetShell.hidden = false;
  if (resetTokenInput) resetTokenInput.value = token;
  setStatus(resetStatus, '', 'info');
  resetForm?.reset();
  if (resetTokenInput) resetTokenInput.value = token;
}

function showAuthUI() {
  authShell.hidden = false;
  verifyShell.hidden = true;
  forgotShell.hidden = true;
  resetShell.hidden = true;
  const tab = document.querySelector('[data-auth-tab="login"]');
  const loginPane = document.querySelector('[data-auth-pane="login"]');
  if (tab && loginPane) {
    tabs.forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
    panes.forEach((p) => p.classList.remove('is-active'));
    tab.classList.add('is-active');
    tab.setAttribute('aria-selected', 'true');
    loginPane.classList.add('is-active');
  }
}

forgotPasswordBtn?.addEventListener('click', () => {
  setPageMode('auth');
  showForgotUI();
});

forgotBackBtn?.addEventListener('click', () => {
  showAuthUI();
});

forgotForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus(forgotStatus, 'Enviando...', 'info');
  const email = forgotForm.email.value.trim();
  try {
    const response = await fetch('/api/participant/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (data.resetDirectUrl) {
      setStatus(forgotStatus, 'Entorno local — usa el link directo.', 'warn');
      const linkEl = document.createElement('a');
      linkEl.href = data.resetDirectUrl;
      linkEl.className = 'button-secondary';
      linkEl.style.display = 'inline-flex';
      linkEl.style.marginTop = '0.75rem';
      linkEl.textContent = 'Abrir link de restablecimiento';
      forgotStatus.after(linkEl);
    } else {
      setStatus(forgotStatus, 'Si el correo existe, te mandamos un link en los próximos minutos.', 'success');
      forgotForm.reset();
    }
  } catch {
    setStatus(forgotStatus, 'Error de red. Intenta de nuevo.', 'error');
  }
});

resetForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const token = resetTokenInput?.value?.trim();
  const password = resetForm.password.value;
  if (!token) {
    setStatus(resetStatus, 'Token inválido. Usa el link del correo de nuevo.', 'error');
    return;
  }
  setStatus(resetStatus, 'Guardando nueva contraseña...', 'info');
  try {
    const response = await fetch('/api/participant/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      const message = data.error === 'token_invalid_or_expired'
        ? 'El link expiró o ya fue usado. Solicita uno nuevo.'
        : data.error === 'password_too_short'
          ? 'La contraseña debe tener al menos 8 caracteres.'
          : data.error === 'password_too_long'
            ? 'La contraseña no puede superar 128 caracteres.'
            : 'No se pudo actualizar la contraseña.';
      setStatus(resetStatus, message, 'error');
      return;
    }
    setStatus(resetStatus, 'Contraseña actualizada. Ya puedes iniciar sesión.', 'success');
    setTimeout(() => {
      window.history.replaceState(null, '', '/registro');
      showAuthUI();
    }, 2000);
  } catch {
    setStatus(resetStatus, 'Error de red. Intenta de nuevo.', 'error');
  }
});

// ── DELETE ACCOUNT ────────────────────────────────────────────

const deleteAccountForm = document.getElementById('deleteAccountForm');
const deleteAccountStatus = document.getElementById('deleteAccountStatus');

deleteAccountForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.participant) return;
  const password = deleteAccountForm.password.value;
  setStatus(deleteAccountStatus, 'Verificando...', 'info');
  try {
    const response = await fetch('/api/participant/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) {
      const message = data.error === 'invalid_password'
        ? 'La contraseña no es correcta.'
        : 'No se pudo eliminar la cuenta. Intenta de nuevo.';
      setStatus(deleteAccountStatus, message, 'error');
      return;
    }
    setStatus(deleteAccountStatus, 'Tu cuenta fue eliminada. Redirigiendo...', 'success');
    setTimeout(() => {
      renderLoggedOut();
    }, 1800);
  } catch {
    setStatus(deleteAccountStatus, 'Error de red. Intenta de nuevo.', 'error');
  }
});

// ── INIT: check for reset_token in URL ────────────────────────

(function checkResetToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('reset_token');
  if (token) {
    setPageMode('auth');
    showResetUI(token);
  }
}());

renderLoggedOut();
restoreSession();
