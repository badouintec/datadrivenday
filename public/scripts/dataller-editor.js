/**
 * DATALLER EDITOR ENGINE
 * Vanilla JS · Canvas API · Web Audio API · Fetch API
 * Autosave con debounce a /api/admin/slides/:id
 */

// ── ESTADO ──────────────────────────────────────────────────────────────────
const EDITOR = {
  presId: document.body.dataset.presId ?? '',
  slides: [],
  selectedId: null,
  isDirty: false,
  saveTimer: null,
  canvas: null,
  ctx: null,
  animFrame: null,
  particles: [],
  animTime: 0,
  isPlaying: true,
  audioCtx: null,
  dragSourceId: null,
};

const PARTICLE_COUNT = 400;

const PARTICLE_STATES = [
  { id: 'chaos',    label: 'Caos',       icon: '\u2B21' },
  { id: 'flow',     label: 'Flujo',      icon: '\u2192' },
  { id: 'cluster',  label: 'Clusters',   icon: '\u25C9' },
  { id: 'network',  label: 'Red',        icon: '\u229E' },
  { id: 'helix',    label: 'Helice',     icon: '\u222B' },
  { id: 'grid',     label: 'Cuadricula', icon: '\u25A6' },
  { id: 'pulse',    label: 'Pulso',      icon: '\u25CE' },
  { id: 'orbit',    label: 'Orbita',     icon: '\u25CB' },
  { id: 'collapse', label: 'Colapso',    icon: '\u2299' },
  { id: 'expand',   label: 'Expansion',  icon: '\u2726' },
];

const ACCENT_COLORS = [
  { id: 'primary', label: 'Verde',  hex: '#34d399' },
  { id: 'alert',   label: 'Rojo',   hex: '#f87171' },
  { id: 'sage',    label: 'Salvia', hex: '#8EA676' },
  { id: 'light',   label: 'Crema',  hex: '#EAEBE6' },
  { id: 'amber',   label: 'Ambar',  hex: '#fbbf24' },
];

// ── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  EDITOR.canvas = document.getElementById('previewCanvas');
  EDITOR.ctx = EDITOR.canvas.getContext('2d');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  initParticles();
  await loadSlides();
  renderSidebarList();

  if (EDITOR.slides.length > 0) {
    selectSlide(EDITOR.slides[0].id);
  }

  startCanvasLoop();
  bindTopbar();
  bindSidebarActions();
  bindPropsPanel();
  bindCanvasToolbar();
  bindDeleteModal();
  bindDragAndDrop();
}

// ── CARGAR SLIDES ────────────────────────────────────────────────────────────
async function loadSlides() {
  const presId = EDITOR.presId;
  const res = await fetch(`/api/admin/slides?presentacion=${encodeURIComponent(presId)}`);
  if (!res.ok) {
    if (res.status === 401) window.location.href = '/admin/login';
    return;
  }
  const data = await res.json();
  EDITOR.slides = data.slides ?? [];

  // Load presentation name
  try {
    const presRes = await fetch(`/api/admin/presentaciones`);
    if (presRes.ok) {
      const presData = await presRes.json();
      const pres = presData.presentations?.find(p => p.id === presId);
      if (pres) {
        document.getElementById('presName').textContent = pres.nombre;
      }
    }
  } catch { /* ignore */ }
}

// ── RENDER SIDEBAR ───────────────────────────────────────────────────────────
function renderSidebarList() {
  const list = document.getElementById('slidesList');
  list.innerHTML = '';

  EDITOR.slides.forEach((slide, i) => {
    const li = document.createElement('li');
    li.className = `slide-item ${slide.id === EDITOR.selectedId ? 'is-selected' : ''}`;
    li.role = 'option';
    li.dataset.slideId = slide.id;
    li.dataset.numero = slide.numero;
    li.draggable = true;
    li.setAttribute('aria-selected', slide.id === EDITOR.selectedId ? 'true' : 'false');

    li.innerHTML = `
      <div class="slide-item-drag" aria-hidden="true">\u2807</div>
      <div class="slide-item-info">
        <span class="slide-item-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="slide-item-titulo">${escapeHtml(slide.titulo)}</span>
        <span class="slide-item-tag">${escapeHtml(slide.tag)}</span>
      </div>
      <div class="slide-item-actions">
        <button class="slide-action-btn" data-action="duplicate" aria-label="Duplicar">\u2398</button>
        <button class="slide-action-btn slide-action-btn--danger" data-action="delete" aria-label="Eliminar">\u00D7</button>
      </div>
      <div class="slide-item-state-dot" data-state="${slide.particleState}" aria-hidden="true"></div>
    `;

    li.addEventListener('click', (e) => {
      if (e.target.closest('.slide-action-btn')) return;
      selectSlide(slide.id);
    });

    list.appendChild(li);
  });
}

// ── SELECCIONAR SLIDE ────────────────────────────────────────────────────────
function selectSlide(id) {
  EDITOR.selectedId = id;
  const slide = getSelectedSlide();
  if (!slide) return;

  document.querySelectorAll('.slide-item').forEach(el => {
    el.classList.toggle('is-selected', el.dataset.slideId === id);
    el.setAttribute('aria-selected', el.dataset.slideId === id ? 'true' : 'false');
  });

  updateCanvasPreview(slide);
  fillPropsPanel(slide);
}

function getSelectedSlide() {
  return EDITOR.slides.find(s => s.id === EDITOR.selectedId) ?? null;
}

// ── FILL PROPERTIES PANEL ────────────────────────────────────────────────────
function fillPropsPanel(slide) {
  document.getElementById('propTag').value       = slide.tag ?? '';
  document.getElementById('propTitulo').value    = slide.titulo ?? '';
  document.getElementById('propSubtitulo').value = slide.subtitulo ?? '';
  document.getElementById('propDuracion').value  = slide.duracion ?? 10;
  document.getElementById('propCuerpo').value    = slide.cuerpo ?? '';
  document.getElementById('propNotas').value     = slide.notas ?? '';
  document.getElementById('propCodigo').value    = slide.codigoDemo ?? slide.codigo_demo ?? '';
  document.getElementById('propIsActive').checked = slide.isActive;
  document.getElementById('propSpeed').value     = slide.particleSpeed ?? slide.particle_speed ?? 0.04;
  document.getElementById('speedDisplay').textContent = slide.particleSpeed ?? slide.particle_speed ?? 0.04;

  renderParticleStateGrid(slide.particleState ?? slide.particle_state ?? 'chaos');
  renderAccentColorRow(slide.accentColor ?? slide.accent_color ?? 'primary');
  renderTagsEditor('conceptsEditor', slide.conceptosClave ?? [], 'conceptosClave');
  renderTagsEditor('commandWordsEditor', slide.commandWords ?? [], 'commandWords');
  renderChordEditor(slide.chord ?? []);
  renderRefsEditor(slide.referencias ?? []);
}

// ── PARTICLE STATE GRID ──────────────────────────────────────────────────────
function renderParticleStateGrid(currentState) {
  const grid = document.getElementById('particleStateGrid');
  grid.innerHTML = '';

  PARTICLE_STATES.forEach(({ id, label, icon }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `particle-state-btn ${id === currentState ? 'is-active' : ''}`;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', id === currentState ? 'true' : 'false');
    btn.setAttribute('aria-label', label);
    btn.dataset.state = id;
    btn.innerHTML = `<span class="state-icon" aria-hidden="true">${icon}</span><span class="state-label">${label}</span>`;

    btn.addEventListener('click', () => {
      setSlideField('particleState', id);
      renderParticleStateGrid(id);
    });

    grid.appendChild(btn);
  });
}

// ── ACCENT COLOR ROW ─────────────────────────────────────────────────────────
function renderAccentColorRow(currentColor) {
  const row = document.getElementById('accentColorRow');
  row.innerHTML = '';

  ACCENT_COLORS.forEach(({ id, label, hex }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `accent-color-btn ${id === currentColor ? 'is-active' : ''}`;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', id === currentColor ? 'true' : 'false');
    btn.setAttribute('aria-label', label);
    btn.style.setProperty('--accent-hex', hex);
    btn.dataset.color = id;

    btn.addEventListener('click', () => {
      setSlideField('accentColor', id);
      renderAccentColorRow(id);
    });

    row.appendChild(btn);
  });
}

// ── TAGS EDITOR ──────────────────────────────────────────────────────────────
function renderTagsEditor(containerId, tags, fieldKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  tags.forEach((tag, i) => {
    const pill = document.createElement('div');
    pill.className = 'tag-pill';

    const text = document.createElement('span');
    text.className = 'tag-pill-text';
    text.contentEditable = 'true';
    text.textContent = tag;
    text.setAttribute('aria-label', `Editar: ${tag}`);

    text.addEventListener('blur', () => {
      const newTags = [...tags];
      newTags[i] = text.textContent.trim();
      setSlideField(fieldKey, newTags.filter(Boolean));
    });

    text.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); text.blur(); }
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'tag-pill-remove';
    removeBtn.textContent = '\u00D7';
    removeBtn.setAttribute('aria-label', `Eliminar: ${tag}`);
    removeBtn.addEventListener('click', () => {
      const newTags = tags.filter((_, idx) => idx !== i);
      setSlideField(fieldKey, newTags);
      renderTagsEditor(containerId, newTags, fieldKey);
    });

    pill.appendChild(text);
    pill.appendChild(removeBtn);
    container.appendChild(pill);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'tag-add-btn';
  addBtn.textContent = '+ agregar';
  addBtn.addEventListener('click', () => {
    const newTag = prompt('Nuevo elemento:');
    if (newTag?.trim()) {
      const newTags = [...tags, newTag.trim()];
      setSlideField(fieldKey, newTags);
      renderTagsEditor(containerId, newTags, fieldKey);
    }
  });
  container.appendChild(addBtn);
}

// ── CHORD EDITOR ─────────────────────────────────────────────────────────────
function renderChordEditor(chord) {
  const container = document.getElementById('chordEditor');
  container.innerHTML = '';

  chord.forEach((freq, i) => {
    const row = document.createElement('div');
    row.className = 'chord-freq-row';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'chord-freq-input';
    input.value = freq;
    input.min = 40;
    input.max = 2000;
    input.step = 0.5;
    input.setAttribute('aria-label', `Frecuencia ${i + 1} en Hz`);

    input.addEventListener('change', () => {
      const newChord = [...chord];
      newChord[i] = parseFloat(input.value);
      setSlideField('chord', newChord);
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'chord-remove-btn';
    removeBtn.textContent = '\u00D7';
    removeBtn.addEventListener('click', () => {
      const newChord = chord.filter((_, idx) => idx !== i);
      setSlideField('chord', newChord);
      renderChordEditor(newChord);
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });

  const actions = document.createElement('div');
  actions.className = 'chord-actions';

  const addFreqBtn = document.createElement('button');
  addFreqBtn.type = 'button';
  addFreqBtn.className = 'chord-action-btn';
  addFreqBtn.textContent = '+ frecuencia';
  addFreqBtn.addEventListener('click', () => {
    const newChord = [...chord, 261.63];
    setSlideField('chord', newChord);
    renderChordEditor(newChord);
  });

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'chord-action-btn chord-action-btn--play';
  playBtn.textContent = '\u25B6 escuchar';
  playBtn.addEventListener('click', () => previewChord(chord));

  actions.appendChild(addFreqBtn);
  actions.appendChild(playBtn);
  container.appendChild(actions);
}

// ── REFERENCIAS EDITOR ───────────────────────────────────────────────────────
function renderRefsEditor(refs) {
  const container = document.getElementById('refsEditor');
  container.innerHTML = '';

  refs.forEach((ref, i) => {
    const item = document.createElement('div');
    item.className = 'ref-edit-item';

    const tipos = ['paper', 'libro', 'herramienta', 'informe', 'repo'];
    item.innerHTML = `
      <div class="ref-edit-header">
        <select class="ref-tipo-select" data-idx="${i}" aria-label="Tipo de referencia">
          ${tipos.map(t => `<option value="${t}" ${ref.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <button type="button" class="ref-remove-btn" data-idx="${i}" aria-label="Eliminar referencia">\u00D7</button>
      </div>
      <input type="text" class="prop-input ref-field" data-idx="${i}" data-field="titulo" value="${escapeAttr(ref.titulo ?? '')}" placeholder="Titulo" />
      <input type="text" class="prop-input ref-field" data-idx="${i}" data-field="fuente" value="${escapeAttr(ref.fuente ?? '')}" placeholder="Fuente / autor" />
      <input type="text" class="prop-input ref-field ref-field--short" data-idx="${i}" data-field="anio" value="${escapeAttr(ref.anio ?? '')}" placeholder="Anio" />
      <input type="url"  class="prop-input ref-field" data-idx="${i}" data-field="url" value="${escapeAttr(ref.url ?? '')}" placeholder="https://..." />
    `;

    item.querySelectorAll('.ref-field').forEach(field => {
      field.addEventListener('blur', () => {
        const newRefs = structuredClone(refs);
        newRefs[parseInt(field.dataset.idx)][field.dataset.field] = field.value;
        setSlideField('referencias', newRefs);
      });
    });

    item.querySelector('.ref-tipo-select').addEventListener('change', (e) => {
      const newRefs = structuredClone(refs);
      newRefs[i].tipo = e.target.value;
      setSlideField('referencias', newRefs);
    });

    item.querySelector('.ref-remove-btn').addEventListener('click', () => {
      const newRefs = refs.filter((_, idx) => idx !== i);
      setSlideField('referencias', newRefs);
      renderRefsEditor(newRefs);
    });

    container.appendChild(item);
  });

  const addRefBtn = document.createElement('button');
  addRefBtn.type = 'button';
  addRefBtn.className = 'refs-add-btn';
  addRefBtn.textContent = '+ agregar referencia';
  addRefBtn.addEventListener('click', () => {
    const newRefs = [
      ...refs,
      { titulo: '', fuente: '', anio: new Date().getFullYear().toString(), url: '', tipo: 'informe' }
    ];
    setSlideField('referencias', newRefs);
    renderRefsEditor(newRefs);
  });
  container.appendChild(addRefBtn);
}

// ── SET SLIDE FIELD + AUTOSAVE ───────────────────────────────────────────────
function setSlideField(field, value) {
  const slide = getSelectedSlide();
  if (!slide) return;

  slide[field] = value;
  EDITOR.isDirty = true;

  updateCanvasPreview(slide);

  clearTimeout(EDITOR.saveTimer);
  document.getElementById('saveStatus').textContent = 'Guardando...';

  EDITOR.saveTimer = setTimeout(() => saveSlide(slide), 800);
}

async function saveSlide(slide) {
  try {
    const patch = {
      tag: slide.tag,
      titulo: slide.titulo,
      subtitulo: slide.subtitulo,
      cuerpo: slide.cuerpo,
      notas: slide.notas,
      duracion: slide.duracion,
      particle_state: slide.particleState ?? slide.particle_state,
      accent_color: slide.accentColor ?? slide.accent_color,
      particle_speed: slide.particleSpeed ?? slide.particle_speed,
      is_active: slide.isActive ? 1 : 0,
      codigo_demo: slide.codigoDemo ?? slide.codigo_demo,
      chord: slide.chord,
      commandWords: slide.commandWords,
      referencias: slide.referencias,
      conceptosClave: slide.conceptosClave,
    };

    const res = await fetch(`/api/admin/slides/${slide.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    if (res.ok) {
      EDITOR.isDirty = false;
      document.getElementById('saveStatus').textContent = 'Guardado';
      // Update sidebar title
      const li = document.querySelector(`[data-slide-id="${slide.id}"] .slide-item-titulo`);
      if (li) li.textContent = slide.titulo;
      const tagEl = document.querySelector(`[data-slide-id="${slide.id}"] .slide-item-tag`);
      if (tagEl) tagEl.textContent = slide.tag;
    } else {
      document.getElementById('saveStatus').textContent = 'Error al guardar';
    }
  } catch {
    document.getElementById('saveStatus').textContent = 'Sin conexion';
  }
}

// ── BIND PROPS PANEL ─────────────────────────────────────────────────────────
function bindPropsPanel() {
  const textFields = [
    { id: 'propTag',       field: 'tag' },
    { id: 'propTitulo',    field: 'titulo' },
    { id: 'propSubtitulo', field: 'subtitulo' },
    { id: 'propCuerpo',    field: 'cuerpo' },
    { id: 'propNotas',     field: 'notas' },
    { id: 'propCodigo',    field: 'codigoDemo' },
  ];

  textFields.forEach(({ id, field }) => {
    document.getElementById(id).addEventListener('input', (e) => {
      setSlideField(field, e.target.value);
    });
  });

  document.getElementById('propDuracion').addEventListener('change', (e) => {
    setSlideField('duracion', parseInt(e.target.value) || 10);
  });

  document.getElementById('propSpeed').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('speedDisplay').textContent = val.toFixed(3);
    setSlideField('particleSpeed', val);
    setSlideField('particle_speed', val);
  });

  document.getElementById('propIsActive').addEventListener('change', (e) => {
    setSlideField('isActive', e.target.checked);
  });
}

// ── BIND SIDEBAR ACTIONS ─────────────────────────────────────────────────────
function bindSidebarActions() {
  document.getElementById('slidesList').addEventListener('click', async (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;

    const slideItem = actionBtn.closest('.slide-item');
    const slideId = slideItem?.dataset.slideId;
    if (!slideId) return;

    if (actionBtn.dataset.action === 'duplicate') {
      const res = await fetch(`/api/admin/slides/${slideId}/duplicate`, { method: 'POST' });
      if (res.ok) {
        await loadSlides();
        renderSidebarList();
      }
    }

    if (actionBtn.dataset.action === 'delete') {
      EDITOR._pendingDeleteId = slideId;
      document.getElementById('deleteModal').hidden = false;
    }
  });

  document.getElementById('btnAddSlide').addEventListener('click', async () => {
    const res = await fetch('/api/admin/slides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presentacion: EDITOR.presId,
        numero: EDITOR.slides.length + 1,
        tag: 'NUEVO',
        titulo: 'Nuevo slide',
        cuerpo: '',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      await loadSlides();
      renderSidebarList();
      selectSlide(data.id);
    }
  });
}

// ── BIND DELETE MODAL ────────────────────────────────────────────────────────
function bindDeleteModal() {
  document.getElementById('deleteCancel').addEventListener('click', () => {
    document.getElementById('deleteModal').hidden = true;
    EDITOR._pendingDeleteId = null;
  });

  document.getElementById('deleteConfirm').addEventListener('click', async () => {
    const slideId = EDITOR._pendingDeleteId;
    if (!slideId) return;

    await fetch(`/api/admin/slides/${slideId}`, { method: 'DELETE' });
    document.getElementById('deleteModal').hidden = true;
    EDITOR._pendingDeleteId = null;

    await loadSlides();
    renderSidebarList();
    if (EDITOR.slides.length > 0) {
      selectSlide(EDITOR.slides[0].id);
    }
  });
}

// ── BIND TOPBAR ──────────────────────────────────────────────────────────────
function bindTopbar() {
  document.getElementById('btnPreview')?.addEventListener('click', () => {
    window.open(`/dataller/present?pres=${EDITOR.presId}`, '_blank');
  });
}

// ── BIND CANVAS TOOLBAR ──────────────────────────────────────────────────────
function bindCanvasToolbar() {
  document.getElementById('toolPlay')?.addEventListener('click', () => {
    EDITOR.isPlaying = !EDITOR.isPlaying;
    document.getElementById('toolPlay').setAttribute('aria-pressed', EDITOR.isPlaying ? 'true' : 'false');
    if (EDITOR.isPlaying) startCanvasLoop();
  });

  document.getElementById('btnPrevSlide')?.addEventListener('click', () => {
    const idx = EDITOR.slides.findIndex(s => s.id === EDITOR.selectedId);
    if (idx > 0) selectSlide(EDITOR.slides[idx - 1].id);
  });

  document.getElementById('btnNextSlide')?.addEventListener('click', () => {
    const idx = EDITOR.slides.findIndex(s => s.id === EDITOR.selectedId);
    if (idx < EDITOR.slides.length - 1) selectSlide(EDITOR.slides[idx + 1].id);
  });
}

// ── DRAG AND DROP ────────────────────────────────────────────────────────────
function bindDragAndDrop() {
  const list = document.getElementById('slidesList');

  list.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.slide-item');
    if (!item) return;
    EDITOR.dragSourceId = item.dataset.slideId;
    item.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.slide-item');
    if (item && item.dataset.slideId !== EDITOR.dragSourceId) {
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    }
  });

  list.addEventListener('dragleave', (e) => {
    e.target.closest('.slide-item')?.classList.remove('drag-over');
  });

  list.addEventListener('drop', async (e) => {
    e.preventDefault();
    const targetItem = e.target.closest('.slide-item');
    if (!targetItem || targetItem.dataset.slideId === EDITOR.dragSourceId) return;

    const sourceIdx = EDITOR.slides.findIndex(s => s.id === EDITOR.dragSourceId);
    const targetIdx = EDITOR.slides.findIndex(s => s.id === targetItem.dataset.slideId);

    const [moved] = EDITOR.slides.splice(sourceIdx, 1);
    EDITOR.slides.splice(targetIdx, 0, moved);

    EDITOR.slides.forEach((s, i) => { s.numero = i + 1; });

    await fetch('/api/admin/slides/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: EDITOR.slides.map(s => ({ id: s.id, numero: s.numero }))
      }),
    });

    renderSidebarList();
    document.querySelectorAll('.drag-over, .is-dragging')
      .forEach(el => el.classList.remove('drag-over', 'is-dragging'));
  });

  list.addEventListener('dragend', () => {
    document.querySelectorAll('.drag-over, .is-dragging')
      .forEach(el => el.classList.remove('drag-over', 'is-dragging'));
  });
}

// ── PREVIEW CHORD ────────────────────────────────────────────────────────────
function previewChord(freqs) {
  if (!freqs?.length) return;
  if (!EDITOR.audioCtx) {
    EDITOR.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  const t = EDITOR.audioCtx.currentTime;

  freqs.forEach((freq) => {
    const osc = EDITOR.audioCtx.createOscillator();
    const gain = EDITOR.audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
    osc.connect(gain);
    gain.connect(EDITOR.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 2.6);
  });
}

// ── CANVAS PREVIEW ENGINE ────────────────────────────────────────────────────
function resizeCanvas() {
  const wrapper = document.querySelector('.canvas-wrapper');
  if (!wrapper || !EDITOR.canvas) return;
  EDITOR.canvas.width = wrapper.clientWidth;
  EDITOR.canvas.height = wrapper.clientHeight;
}

function initParticles() {
  EDITOR.particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    EDITOR.particles.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.002,
      vy: (Math.random() - 0.5) * 0.002,
      size: 1 + Math.random() * 2,
    });
  }
}

function updateCanvasPreview(slide) {
  if (!slide) return;
  document.getElementById('prevNumero').textContent = String(slide.numero).padStart(2, '0');
  document.getElementById('prevTag').textContent = slide.tag ?? '';
  document.getElementById('prevTitulo').textContent = slide.titulo ?? '';
  document.getElementById('prevSubtitulo').textContent = slide.subtitulo ?? '';
  document.getElementById('prevCuerpo').textContent = slide.cuerpo ?? '';

  const conceptsEl = document.getElementById('prevConcepts');
  conceptsEl.innerHTML = '';
  (slide.conceptosClave ?? []).forEach(c => {
    const pill = document.createElement('span');
    pill.className = 'concept-pill';
    pill.textContent = c;
    conceptsEl.appendChild(pill);
  });
}

function startCanvasLoop() {
  function frame() {
    if (!EDITOR.isPlaying) return;
    EDITOR.animTime += 0.016;
    drawParticles();
    EDITOR.animFrame = requestAnimationFrame(frame);
  }
  if (EDITOR.animFrame) cancelAnimationFrame(EDITOR.animFrame);
  frame();
}

function drawParticles() {
  const { ctx, canvas, particles, animTime } = EDITOR;
  if (!ctx || !canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const slide = getSelectedSlide();
  const state = slide?.particleState ?? slide?.particle_state ?? 'chaos';
  const speed = slide?.particleSpeed ?? slide?.particle_speed ?? 0.04;
  const colorId = slide?.accentColor ?? slide?.accent_color ?? 'primary';
  const color = ACCENT_COLORS.find(c => c.id === colorId)?.hex ?? '#34d399';

  ctx.fillStyle = 'rgba(13, 17, 23, 0.15)';
  ctx.fillRect(0, 0, w, h);

  particles.forEach((p, i) => {
    applyParticleState(p, i, state, speed, animTime, w, h);

    p.x += p.vx;
    p.y += p.vy;

    // Wrap around
    if (p.x < 0) p.x = 1;
    if (p.x > 1) p.x = 0;
    if (p.y < 0) p.y = 1;
    if (p.y > 1) p.y = 0;

    const alpha = 0.3 + Math.sin(animTime * 2 + i) * 0.2;
    ctx.fillStyle = color + Math.round(alpha * 255).toString(16).padStart(2, '0');
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function applyParticleState(p, i, state, speed, t, w, h) {
  const s = speed * 0.5;

  switch (state) {
    case 'chaos':
      p.vx += (Math.random() - 0.5) * s;
      p.vy += (Math.random() - 0.5) * s;
      p.vx *= 0.98;
      p.vy *= 0.98;
      break;

    case 'flow':
      p.vx += Math.sin(p.y * 6 + t) * s * 0.5;
      p.vy += 0.0002;
      p.vx *= 0.99;
      p.vy *= 0.99;
      break;

    case 'cluster': {
      const cx = 0.3 + (i % 3) * 0.2;
      const cy = 0.3 + Math.floor((i % 9) / 3) * 0.2;
      p.vx += (cx - p.x) * s * 0.1;
      p.vy += (cy - p.y) * s * 0.1;
      p.vx *= 0.97;
      p.vy *= 0.97;
      break;
    }

    case 'network': {
      const nx = (i % 8) / 8 + 0.06;
      const ny = Math.floor(i / 8) / (PARTICLE_COUNT / 8) + 0.06;
      p.vx += (nx - p.x) * s * 0.05;
      p.vy += (ny - p.y) * s * 0.05;
      p.vx += Math.sin(t + i) * s * 0.02;
      p.vy += Math.cos(t + i) * s * 0.02;
      p.vx *= 0.96;
      p.vy *= 0.96;
      break;
    }

    case 'helix': {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 4 + t;
      const tx = 0.5 + Math.cos(angle) * 0.25;
      const ty = (i / PARTICLE_COUNT);
      p.vx += (tx - p.x) * s * 0.08;
      p.vy += (ty - p.y) * s * 0.08;
      p.vx *= 0.96;
      p.vy *= 0.96;
      break;
    }

    case 'grid': {
      const cols = 20;
      const gx = ((i % cols) + 0.5) / cols;
      const gy = (Math.floor(i / cols) + 0.5) / (PARTICLE_COUNT / cols);
      p.vx += (gx - p.x) * s * 0.1;
      p.vy += (gy - p.y) * s * 0.1;
      p.vx *= 0.95;
      p.vy *= 0.95;
      break;
    }

    case 'pulse': {
      const dist = Math.sqrt((p.x - 0.5) ** 2 + (p.y - 0.5) ** 2);
      const targetR = 0.15 + Math.sin(t * 2) * 0.1;
      const angle = Math.atan2(p.y - 0.5, p.x - 0.5);
      const tx = 0.5 + Math.cos(angle) * targetR;
      const ty = 0.5 + Math.sin(angle) * targetR;
      p.vx += (tx - p.x) * s * 0.08;
      p.vy += (ty - p.y) * s * 0.08;
      p.vx *= 0.96;
      p.vy *= 0.96;
      break;
    }

    case 'orbit': {
      const oa = (i / PARTICLE_COUNT) * Math.PI * 2 + t * (0.5 + (i % 3) * 0.2);
      const or = 0.1 + (i % 5) * 0.06;
      const ox = 0.5 + Math.cos(oa) * or;
      const oy = 0.5 + Math.sin(oa) * or;
      p.vx += (ox - p.x) * s * 0.1;
      p.vy += (oy - p.y) * s * 0.1;
      p.vx *= 0.96;
      p.vy *= 0.96;
      break;
    }

    case 'collapse':
      p.vx += (0.5 - p.x) * s * 0.05;
      p.vy += (0.5 - p.y) * s * 0.05;
      p.vx *= 0.98;
      p.vy *= 0.98;
      break;

    case 'expand':
      p.vx += (p.x - 0.5) * s * 0.02;
      p.vy += (p.y - 0.5) * s * 0.02;
      p.vx *= 0.99;
      p.vy *= 0.99;
      break;
  }
}

// ── UTILITIES ────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str ?? '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── START ────────────────────────────────────────────────────────────────────
init();
