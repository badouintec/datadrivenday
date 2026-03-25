// @ts-nocheck
import {
  deleteParticipantAccount,
  fetchDashboard,
  fetchDatallerWorkspace,
  loginParticipant,
  logoutParticipant,
  publishDatallerComment,
  resendVerification,
  resetParticipantPassword,
  sendForgotPasswordLink,
  signupParticipant,
  updateDatallerRegistration,
  updateParticipantProfile,
} from './participant-dashboard/api.js';
import {
  escapeHtml,
  formatDate,
  isValidHttpUrl,
  nl2br,
  setStatus,
} from './participant-dashboard/utils.js';
import { getDashboardDom } from './participant-dashboard/dom.js';
import { createAuthFlow } from './participant-dashboard/auth-flow.js';
import { createDashboardRenderers } from './participant-dashboard/renderers.js';
import { createWorkspaceFlow } from './participant-dashboard/workspace-flow.js';

const staticData = JSON.parse(document.getElementById('participantStaticData')?.textContent || '{}');
const guestResources = [
  { titulo: 'Tus recursos activos aparecerán aquí cuando inicies sesión.' },
  { titulo: 'El tablero concentra Dataller, comunidad y biblioteca educativa.' },
];

const {
  adminShell,
  authColumn,
  authShell,
  benchmarkProjectList,
  commentBody,
  commentForm,
  commentList,
  commentStatus,
  commentSubmitBtn,
  commentsCountLabel,
  communityList,
  currentStackList,
  dashboardBadge,
  dashboardColumn,
  dashboardTitle,
  datallerCopy,
  datallerResourceList,
  datallerResourcesCopy,
  datallerState,
  datallerStatus,
  datallerSummary,
  datallerToggleBtn,
  deleteAccountForm,
  deleteAccountStatus,
  educationalResourceGroups,
  forgotBackBtn,
  forgotForm,
  forgotPasswordBtn,
  forgotShell,
  forgotStatus,
  jumpToDatallerBtn,
  jumpToProfileBtn,
  legacyStackList,
  loginForm,
  loginStatus,
  logoutBtn,
  mobileNavToggle,
  navButtons,
  notificationList,
  onboardingSteps,
  onboardingSummary,
  onboardingTitle,
  panes,
  platformResourceList,
  platformSummary,
  presentationDescription,
  presentationTitle,
  presentationViewer,
  profileForm,
  profileStatus,
  recognitionActions,
  recognitionBadge,
  recognitionCopy,
  recognitionDownload,
  recognitionMeta,
  recognitionState,
  registroPage,
  resendBtn,
  resetForm,
  resetShell,
  resetStatus,
  resetTokenInput,
  sidebarAvatar,
  sidebarEmail,
  sidebarFirstName,
  sidebarFlags,
  sidebarOverlay,
  signupForm,
  signupStatus,
  slideBody,
  slideConcepts,
  slideCounter,
  slideNextBtn,
  slidePrevBtn,
  slideSubtitle,
  slideTag,
  slideTitle,
  statComments,
  statCommentsMeta,
  statDataller,
  statDatallerMeta,
  statMembers,
  statMembersMeta,
  statSlides,
  statSlidesMeta,
  strategicSignalGrid,
  tabs,
  themeAxisList,
  topbarKicker,
  verifyDirectLink,
  verifyEmail,
  verifyShell,
  verifyStatus,
  journeyBadge,
} = getDashboardDom();

const state = {
  participant: null,
  platformResources: [],
  presentation: null,
  comments: [],
  members: [],
  slideIndex: 0,
  verificationEmailAvailable: true,
  verificationEmailSent: true,
  verificationError: null,
};

let authFlow;
let renderers;
let workspaceFlow;

function setPageMode(mode) {
  const isDashboard = mode === 'dashboard';
  authColumn.hidden = isDashboard;
  dashboardColumn.hidden = !isDashboard;
  registroPage.classList.toggle('registro-page--auth-only', !isDashboard);
  registroPage.classList.toggle('registro-page--dashboard', isDashboard);
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

const {
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
} = createDashboardRenderers({
  dom: {
    benchmarkProjectList,
    commentBody,
    commentList,
    commentSubmitBtn,
    commentsCountLabel,
    communityList,
    currentStackList,
    dashboardBadge,
    dashboardTitle,
    datallerCopy,
    datallerResourceList,
    datallerResourcesCopy,
    datallerState,
    datallerStatus,
    datallerToggleBtn,
    educationalResourceGroups,
    journeyBadge,
    legacyStackList,
    notificationList,
    onboardingSteps,
    onboardingSummary,
    onboardingTitle,
    platformResourceList,
    platformSummary,
    presentationDescription,
    presentationTitle,
    presentationViewer,
    profileForm,
    profileStatus,
    recognitionActions,
    recognitionBadge,
    recognitionCopy,
    recognitionDownload,
    recognitionMeta,
    recognitionState,
    sidebarAvatar,
    sidebarEmail,
    sidebarFirstName,
    sidebarFlags,
    slideBody,
    slideConcepts,
    slideCounter,
    slideNextBtn,
    slidePrevBtn,
    slideSubtitle,
    slideTag,
    slideTitle,
    statComments,
    statCommentsMeta,
    statDataller,
    statDatallerMeta,
    statMembers,
    statMembersMeta,
    statSlides,
    statSlidesMeta,
    strategicSignalGrid,
    themeAxisList,
  },
  escapeHtml,
  formatDate,
  guestResources,
  nl2br,
  setStatus,
  state,
  staticData,
});

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
    const { response, data } = await (prefetchedRequest ?? fetchDatallerWorkspace());

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
  const workspacePrefetch = fetchDatallerWorkspace();
  const { response, data } = await fetchDashboard();
  if (!response.ok) {
    workspacePrefetch.catch(() => {});
    throw new Error('dashboard_failed');
  }

  state.participant = data.participant;
  state.platformResources = data.recursos || [];
  state.verificationEmailAvailable = data.verificationEmailAvailable !== false;
  state.verificationError = data.verificationError || null;
  verifyDirectLink.hidden = true;
  verifyDirectLink.href = '#';

  if (!data.participant.emailVerified) {
    authFlow.showVerifyUI(data.participant, {
      available: state.verificationEmailAvailable,
      sent: true,
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
  await workspaceFlow.loadDatallerWorkspace(workspacePrefetch);
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
  verifyDirectLink.hidden = true;
  verifyDirectLink.href = '#';
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

navButtons.forEach((button) => {
  button.addEventListener('click', () => showPanel(button.dataset.panel));
});

mobileNavToggle?.addEventListener('click', () => {
  const isOpen = adminShell?.classList.toggle('sidebar-open');
  mobileNavToggle.setAttribute('aria-expanded', String(!!isOpen));
});

sidebarOverlay?.addEventListener('click', () => {
  adminShell?.classList.remove('sidebar-open');
  mobileNavToggle?.setAttribute('aria-expanded', 'false');
});

workspaceFlow = createWorkspaceFlow({
  api: {
    fetchDatallerWorkspace,
    publishDatallerComment,
    updateDatallerRegistration,
    updateParticipantProfile,
  },
  applyProfileState,
  dom: {
    commentBody,
    commentForm,
    commentStatus,
    commentSubmitBtn,
    datallerStatus,
    datallerToggleBtn,
    jumpToDatallerBtn,
    jumpToProfileBtn,
    profileForm,
    profileStatus,
    slideNextBtn,
    slidePrevBtn,
  },
  renderComments,
  renderDatallerResources,
  renderDatallerState,
  renderMembers,
  renderOverview,
  renderPresentationLocked,
  renderRecognition,
  renderSidebar,
  renderSlide,
  isValidHttpUrl,
  setStatus,
  showPanel,
  state,
});

authFlow = createAuthFlow({
  api: {
    deleteParticipantAccount,
    loginParticipant,
    logoutParticipant,
    resendVerification,
    resetParticipantPassword,
    sendForgotPasswordLink,
    signupParticipant,
  },
  dom: {
    authShell,
    deleteAccountForm,
    deleteAccountStatus,
    forgotBackBtn,
    forgotForm,
    forgotPasswordBtn,
    forgotShell,
    forgotStatus,
    loginForm,
    loginStatus,
    logoutBtn,
    panes,
    resendBtn,
    resetForm,
    resetShell,
    resetStatus,
    resetTokenInput,
    signupForm,
    signupStatus,
    tabs,
    verifyEmail,
    verifyShell,
    verifyStatus,
  },
  loadDashboard,
  renderLoggedOut,
  setPageMode,
  setStatus,
  state,
});

workspaceFlow.init();
authFlow.init();

renderLoggedOut();
authFlow.restoreSession();
