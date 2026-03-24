import { describe, expect, it, vi } from 'vitest';

import { createWorkspaceFlow } from '../../public/scripts/participant-dashboard/workspace-flow.js';

function createButton() {
  return {
    disabled: false,
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
  };
}

function createForm() {
  return {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    fullName: { value: '' },
    occupation: { value: '' },
    organization: { value: '' },
    projectUrl: { value: '' },
    avatarUrl: { value: '' },
    bio: { value: '' },
  };
}

function createFlowHarness(overrides = {}) {
  const state = {
    participant: null,
    presentation: null,
    comments: [],
    members: [],
    slideIndex: 99,
    ...overrides.state,
  };

  const dom = {
    commentBody: { disabled: true, value: '' },
    commentForm: createForm(),
    commentStatus: { hidden: true, textContent: '', className: '' },
    commentSubmitBtn: createButton(),
    datallerStatus: { hidden: true, textContent: '', className: '' },
    datallerToggleBtn: createButton(),
    jumpToDatallerBtn: createButton(),
    jumpToProfileBtn: createButton(),
    profileForm: createForm(),
    profileStatus: { hidden: true, textContent: '', className: '' },
    slideNextBtn: createButton(),
    slidePrevBtn: createButton(),
  };

  const deps = {
    api: {
      fetchDatallerWorkspace: vi.fn(),
      publishDatallerComment: vi.fn(),
      updateDatallerRegistration: vi.fn(),
      updateParticipantProfile: vi.fn(),
      ...overrides.api,
    },
    applyProfileState: vi.fn(),
    dom,
    renderComments: vi.fn(),
    renderDatallerResources: vi.fn(),
    renderDatallerState: vi.fn(),
    renderMembers: vi.fn(),
    renderOverview: vi.fn(),
    renderPresentationLocked: vi.fn(),
    renderRecognition: vi.fn(),
    renderSidebar: vi.fn(),
    renderSlide: vi.fn(),
    setStatus: vi.fn(),
    showPanel: vi.fn(),
    state,
  };

  return {
    deps,
    dom,
    flow: createWorkspaceFlow(deps),
    state,
  };
}

describe('participant dashboard workspace flow', () => {
  it('locks the workspace when the participant is not registered in Dataller', async () => {
    const { flow, deps, state } = createFlowHarness({
      state: {
        participant: { id: 'p-1', datallerRegistered: false },
      },
    });

    await flow.loadDatallerWorkspace();

    expect(state.presentation).toBeNull();
    expect(state.comments).toEqual([]);
    expect(state.members).toEqual([]);
    expect(deps.renderPresentationLocked).toHaveBeenCalledWith(
      'La vista de presentación se habilita cuando activas tu lugar en el Dataller.',
    );
    expect(deps.renderDatallerResources).toHaveBeenCalledWith(false);
    expect(deps.renderOverview).toHaveBeenCalledWith(state.participant);
  });

  it('hydrates the workspace state when the API returns a valid response', async () => {
    const workspaceData = {
      presentation: { id: 'pres-1', slides: [{ id: 's-1' }] },
      comments: [{ id: 'c-1' }],
      members: [{ id: 'm-1' }],
    };
    const { flow, deps, dom, state } = createFlowHarness({
      state: {
        participant: { id: 'p-1', datallerRegistered: true },
      },
      api: {
        fetchDatallerWorkspace: vi.fn().mockResolvedValue({
          response: { ok: true },
          data: workspaceData,
        }),
      },
    });

    await flow.loadDatallerWorkspace();

    expect(state.presentation).toEqual(workspaceData.presentation);
    expect(state.comments).toEqual(workspaceData.comments);
    expect(state.members).toEqual(workspaceData.members);
    expect(state.slideIndex).toBe(0);
    expect(dom.commentBody.disabled).toBe(false);
    expect(dom.commentSubmitBtn.disabled).toBe(false);
    expect(deps.renderDatallerResources).toHaveBeenCalledWith(true);
    expect(deps.renderSlide).toHaveBeenCalled();
    expect(deps.renderComments).toHaveBeenCalled();
    expect(deps.renderMembers).toHaveBeenCalled();
    expect(deps.renderOverview).toHaveBeenCalledWith(state.participant);
  });
});