import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDashboardRenderers } from '../../public/scripts/participant-dashboard/renderers.js';

function createElement() {
  return {
    hidden: false,
    disabled: false,
    textContent: '',
    innerHTML: '',
    className: '',
    style: {},
    value: '',
    onclick: null,
    removeAttribute: vi.fn(),
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
      contains: vi.fn().mockReturnValue(false),
    },
    querySelectorAll: vi.fn().mockReturnValue([]),
  };
}

function createRenderersHarness(overrides = {}) {
  const dom = {
    benchmarkProjectList: createElement(),
    commentBody: createElement(),
    commentList: createElement(),
    commentSubmitBtn: createElement(),
    commentsCountLabel: createElement(),
    communityList: createElement(),
    currentStackList: createElement(),
    dashboardBadge: createElement(),
    dashboardTitle: createElement(),
    datallerCopy: createElement(),
    datallerResourceList: createElement(),
    datallerResourcesCopy: createElement(),
    datallerState: createElement(),
    datallerStatus: createElement(),
    datallerToggleBtn: createElement(),
    educationalResourceGroups: createElement(),
    journeyBadge: createElement(),
    legacyStackList: createElement(),
    notificationList: createElement(),
    onboardingSteps: createElement(),
    onboardingSummary: createElement(),
    onboardingTitle: createElement(),
    platformResourceList: createElement(),
    platformSummary: createElement(),
    presentationDescription: createElement(),
    presentationTitle: createElement(),
    presentationViewer: createElement(),
    profileForm: {
      ...createElement(),
      fullName: { value: '' },
      occupation: { value: '' },
      organization: { value: '' },
      projectUrl: { value: '' },
      avatarUrl: { value: '' },
      bio: { value: '' },
      querySelectorAll: vi.fn().mockReturnValue([{ disabled: false }, { disabled: false }]),
    },
    profileStatus: createElement(),
    recognitionActions: createElement(),
    recognitionBadge: createElement(),
    recognitionCopy: createElement(),
    recognitionDownload: createElement(),
    recognitionMeta: createElement(),
    recognitionState: createElement(),
    sidebarAvatar: createElement(),
    sidebarEmail: createElement(),
    sidebarFirstName: createElement(),
    sidebarFlags: createElement(),
    slideBody: createElement(),
    slideConcepts: createElement(),
    slideCounter: createElement(),
    slideNextBtn: createElement(),
    slidePrevBtn: createElement(),
    slideSubtitle: createElement(),
    slideTag: createElement(),
    slideTitle: createElement(),
    statComments: createElement(),
    statCommentsMeta: createElement(),
    statDataller: createElement(),
    statDatallerMeta: createElement(),
    statMembers: createElement(),
    statMembersMeta: createElement(),
    statSlides: createElement(),
    statSlidesMeta: createElement(),
    strategicSignalGrid: createElement(),
    themeAxisList: createElement(),
    ...overrides.dom,
  };

  const state = {
    comments: [],
    members: [],
    platformResources: [],
    presentation: null,
    slideIndex: 5,
    ...overrides.state,
  };

  const deps = {
    dom,
    escapeHtml: (value) => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
    formatDate: vi.fn((value) => `formatted:${value}`),
    guestResources: [{ titulo: 'Invitado' }],
    nl2br: (value) => String(value).replaceAll('\n', '<br>'),
    setStatus: vi.fn(),
    state,
    staticData: {
      benchmarkProjects: [],
      datallerResources: [{ href: 'https://example.com/dataller', label: 'Toolkit' }],
      educationalGroups: [],
      strategicStats: [],
      techComparison: { current: [], legacy: [] },
      thematicAxes: [{ label: 'Soberanía', status: 'active', keyData: '7 frentes', detail: 'Mapa 2026' }],
      ...overrides.staticData,
    },
    ...overrides.deps,
  };

  return {
    dom,
    renderers: createDashboardRenderers(deps),
    state,
    deps,
  };
}

describe('participant dashboard renderers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a locked presentation state and disables interaction', () => {
    const { dom, renderers, state } = createRenderersHarness();

    renderers.renderPresentationLocked('Activa tu acceso para continuar.');

    expect(state.slideIndex).toBe(0);
    expect(dom.presentationViewer.classList.add).toHaveBeenCalledWith('participant-slide-viewer--locked');
    expect(dom.presentationDescription.textContent).toBe('Activa tu acceso para continuar.');
    expect(dom.commentBody.disabled).toBe(true);
    expect(dom.commentSubmitBtn.disabled).toBe(true);
    expect(dom.commentsCountLabel.textContent).toBe('0 comentarios');
    expect(dom.communityList.innerHTML).toContain('Activa Dataller');
  });

  it('renders the recognition download state for validated participants', () => {
    const { dom, renderers } = createRenderersHarness();

    renderers.renderRecognition({
      datallerRegistered: true,
      recognitionEnabled: true,
      recognitionFolio: 'DDD-2026-01',
      workshopCompleted: true,
    });

    expect(dom.recognitionActions.hidden).toBe(false);
    expect(dom.recognitionState.textContent).toBe('Disponible');
    expect(dom.recognitionBadge.textContent).toBe('Reconocimiento listo');
    expect(dom.recognitionMeta.textContent).toBe('Folio: DDD-2026-01');
    expect(typeof dom.recognitionDownload.onclick).toBe('function');
  });

  it('renders overview metrics for an active Dataller participant', () => {
    const { dom, renderers } = createRenderersHarness({
      state: {
        comments: [{ id: 'c-1' }, { id: 'c-2' }],
        members: [{ id: 'm-1' }],
        platformResources: [{ titulo: 'Repo' }, { titulo: 'Slides' }],
        presentation: { slides: [{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }] },
      },
    });

    renderers.renderOverview({
      datallerRegistered: true,
      fullName: 'Ana Torres',
      workshopCompleted: false,
    });

    expect(dom.dashboardTitle.textContent).toBe('Hola, Ana');
    expect(dom.dashboardBadge.textContent).toBe('Sesión activa');
    expect(dom.onboardingTitle.textContent).toContain('libro interactivo');
    expect(dom.statSlides.textContent).toBe('3');
    expect(dom.statMembers.textContent).toBe('1');
    expect(dom.statComments.textContent).toBe('2');
    expect(dom.platformSummary.textContent).toBe('2 recursos activos disponibles en plataforma.');
    expect(dom.notificationList.innerHTML).toContain('Libro interactivo disponible');
  });
});