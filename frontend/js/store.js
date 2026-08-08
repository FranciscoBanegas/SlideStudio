// store.js — Única fuente de verdad del editor. Estado + patrón observer +
// historial de deshacer/rehacer. Los componentes se suscriben a eventos y
// nunca mutan el proyecto directamente: usan los métodos de aquí.

const listeners = new Map(); // event -> Set<fn>

function emit(event, payload) {
  (listeners.get(event) || []).forEach((fn) => fn(payload));
  if (event !== '*') (listeners.get('*') || []).forEach((fn) => fn({ event, payload }));
}

export const store = {
  slug: null,
  project: null,
  selectedSlideId: null,
  selectedElementId: null,
  dirty: false,
  zoom: 1,          // factor de escala del canvas
  autoFit: true,    // si true, el zoom se recalcula al redimensionar

  _history: [],
  _future: [],
  _histLimit: 60,

  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
  },
  emit,

  // ── Carga de proyecto ──
  setProject(slug, project) {
    this.slug = slug;
    this.project = project;
    this.selectedSlideId = project.slides.length ? project.slides[0].id : null;
    this.selectedElementId = null;
    this.dirty = false;
    this._history = [];
    this._future = [];
    emit('project:loaded', project);
    emit('change');
  },

  // ── Acceso ──
  get slides() { return this.project ? this.project.slides : []; },
  currentSlide() {
    if (!this.project) return null;
    return this.project.slides.find((s) => s.id === this.selectedSlideId) || null;
  },
  currentElement() {
    const s = this.currentSlide();
    if (!s) return null;
    return s.elements.find((e) => e.id === this.selectedElementId) || null;
  },

  // ── Historial ──
  snapshot() {
    this._history.push(JSON.stringify(this.project));
    if (this._history.length > this._histLimit) this._history.shift();
    this._future = [];
  },
  canUndo() { return this._history.length > 0; },
  canRedo() { return this._future.length > 0; },
  undo() {
    if (!this._history.length) return;
    this._future.push(JSON.stringify(this.project));
    this.project = JSON.parse(this._history.pop());
    this._reconcileSelection();
    this.dirty = true;
    emit('project:loaded', this.project);
    emit('change');
  },
  redo() {
    if (!this._future.length) return;
    this._history.push(JSON.stringify(this.project));
    this.project = JSON.parse(this._future.pop());
    this._reconcileSelection();
    this.dirty = true;
    emit('project:loaded', this.project);
    emit('change');
  },
  _reconcileSelection() {
    if (!this.currentSlide()) this.selectedSlideId = this.slides.length ? this.slides[0].id : null;
    if (!this.currentElement()) this.selectedElementId = null;
  },

  // Envuelve una mutación: toma snapshot, aplica, marca dirty y notifica.
  mutate(fn, { record = true, event = 'slide:changed' } = {}) {
    if (record) this.snapshot();
    fn(this.project);
    this.dirty = true;
    emit(event);
    emit('change');
  },

  // ── Selección ──
  selectSlide(id) {
    if (this.selectedSlideId === id) return;
    this.selectedSlideId = id;
    this.selectedElementId = null;
    emit('selection:slide', id);
    emit('change');
  },
  selectElement(id) {
    if (this.selectedElementId === id) return;
    this.selectedElementId = id;
    emit('selection:element', id);
    emit('change');
  },

  setZoom(z, { auto = false } = {}) {
    this.zoom = z;
    this.autoFit = auto;
    emit('zoom', z);
  },

  markSaved() { this.dirty = false; emit('change'); },
};
