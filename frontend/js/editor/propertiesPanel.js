// propertiesPanel.js — Panel derecho. Construye los campos según el tipo de
// elemento seleccionado (o las propiedades del slide si no hay selección) y
// enlaza cada campo al modelo. El panel se reconstruye solo al cambiar de
// selección; durante la edición actualiza valores en vivo sin perder foco.

import { store } from '../store.js';
import { api } from '../api.js';
import { toast } from '../ui.js';
import {
  ANIMATION_TYPES, ANIMATION_APPLY, TRANSITION_TYPES, EASINGS, TEXT_ROLES,
} from '../model.js';

export function initPropertiesPanel(onPreviewAnim) {
  const body = document.getElementById('props-body');
  const badge = document.getElementById('el-type-badge');

  function build() {
    body.innerHTML = '';
    const el = store.currentElement();
    if (el) { badge.style.display = ''; badge.textContent = el.type; buildElementPanel(body, el, onPreviewAnim); }
    else { badge.style.display = 'none'; buildSlidePanel(body); }
  }

  // Refresca valores in situ (p.ej. tras arrastrar en el canvas) sin rebuild.
  function refreshValues() {
    const el = store.currentElement();
    const src = el || store.currentSlide();
    if (!src) return;
    body.querySelectorAll('[data-bind]').forEach((inp) => {
      if (inp === document.activeElement) return;
      const val = getPath(src, inp.dataset.bind);
      if (val === undefined) return;
      if (inp.type === 'checkbox') inp.checked = !!val;
      else inp.value = val;
    });
  }

  store.on('selection:element', build);
  store.on('selection:slide', build);
  store.on('project:loaded', build);
  store.on('slide:changed', refreshValues);

  build();
}

// ─────────────────────────── Panel de elemento ───────────────────────────

function buildElementPanel(root, el, onPreviewAnim) {
  // Específico por tipo
  if (el.type === 'text') {
    section(root, 'Texto', [
      field('Contenido', textarea(el, 'content'), true),
      field('Rol', select(el, 'role', TEXT_ROLES)),
      field('Fuente', select(el, 'fontFamily', [
        ["'IBM Plex Sans', sans-serif", 'IBM Plex Sans'],
        ["'IBM Plex Mono', monospace", 'IBM Plex Mono'],
      ])),
      field('Tamaño', number(el, 'fontSize', { min: 6, max: 400 })),
      field('Peso', select(el, 'fontWeight', [[400, 'Regular'], [500, 'Medium'], [600, 'SemiBold'], [700, 'Bold']])),
      field('Color', colorField(el, 'color')),
      field('Interlineado', number(el, 'lineHeight', { step: 0.05, min: 0.8, max: 3 })),
      field('Espaciado', number(el, 'letterSpacing', { step: 0.5, min: -5, max: 30 })),
      field('Alineación', segmented(el, 'align', [['left', '⯇'], ['center', '≡'], ['right', '⯈'], ['justify', '☰']]), true),
    ]);
  } else if (el.type === 'image') {
    section(root, 'Imagen', [
      field('Archivo', imageButton(el), true),
      field('Ajuste', select(el, 'fit', ['contain', 'cover', 'fill'])),
      field('Radio', number(el, 'radius', { min: 0, max: 400 })),
    ]);
  } else if (el.type === 'rect') {
    section(root, 'Rectángulo', [
      field('Relleno', colorField(el, 'fill')),
      field('Borde', colorField(el, 'stroke')),
      field('Grosor borde', number(el, 'strokeWidth', { min: 0, max: 40 })),
      field('Radio', number(el, 'radius', { min: 0, max: 400 })),
    ]);
  } else if (el.type === 'line') {
    section(root, 'Línea', [
      field('Color', colorField(el, 'stroke')),
      field('Grosor', number(el, 'strokeWidth', { min: 1, max: 60 })),
    ]);
  } else if (el.type === 'background') {
    section(root, 'Fondo', [
      field('Color', colorField(el, 'color')),
      field('Gradiente (CSS)', text(el, 'gradient'), true),
    ]);
  } else if (el.type === 'html') {
    section(root, 'Bloque HTML', [
      field('Marcado', textarea(el, 'markup'), true),
      hint(root, 'Bloque importado del deck original. Editable como HTML crudo.'),
    ]);
  }

  // Posición y tamaño (común)
  section(root, 'Posición y tamaño', [
    field('X', number(el, 'x')),
    field('Y', number(el, 'y')),
    field('Ancho', number(el, 'w', { min: 1 })),
    field('Alto', number(el, 'h', { min: 1 })),
    field('Rotación', number(el, 'rotation', { min: -180, max: 180 })),
    field('Opacidad', range(el, 'opacity', { min: 0, max: 1, step: 0.01 })),
  ]);

  // Animación (común)
  const anim = el.animation;
  const previewBtn = document.createElement('button');
  previewBtn.className = 'btn';
  previewBtn.style.width = '100%';
  previewBtn.textContent = '▶ Previsualizar animación';
  previewBtn.addEventListener('click', () => onPreviewAnim && onPreviewAnim(el));
  section(root, 'Animación', [
    field('Tipo', select(anim, 'type', ANIMATION_TYPES), true),
    field('Aplicar a', select(anim, 'applyTo', ANIMATION_APPLY)),
    field('Dirección', select(anim, 'direction', [['in', 'Entrada'], ['out', 'Salida']])),
    field('Duración (s)', number(anim, 'duration', { step: 0.05, min: 0, max: 10 })),
    field('Delay (s)', number(anim, 'delay', { step: 0.05, min: 0, max: 10 })),
    field('Stagger (s)', number(anim, 'stagger', { step: 0.01, min: 0, max: 2 })),
    field('Easing', select(anim, 'easing', EASINGS), true),
    wrapFull(previewBtn),
  ]);
}

// ─────────────────────────── Panel de slide ──────────────────────────────

function buildSlidePanel(root) {
  const slide = store.currentSlide();
  if (!slide) {
    const p = document.createElement('div');
    p.className = 'prop-empty';
    p.textContent = 'No hay slide seleccionado.';
    root.appendChild(p);
    return;
  }
  section(root, 'Slide', [
    field('Nombre', text(slide, 'name'), true),
    field('Fondo', colorField(slide, 'background'), true),
  ]);
  section(root, 'Transición de entrada', [
    field('Tipo', select(slide.transitionIn, 'type', TRANSITION_TYPES), true),
    field('Duración (s)', number(slide.transitionIn, 'duration', { step: 0.05, min: 0, max: 5 })),
    field('Easing', select(slide.transitionIn, 'easing', EASINGS)),
  ]);
  section(root, 'Notas del ponente', [
    field('Notas', textarea(slide, 'speakerNotes'), true),
  ]);
  const tip = document.createElement('div');
  tip.className = 'prop-empty';
  tip.innerHTML = 'Selecciona un elemento en el canvas para editarlo, o usa <strong>+ Insertar</strong>.';
  root.appendChild(tip);
}

// ─────────────────────────── Helpers de campos ───────────────────────────

function section(root, title, fields) {
  const sec = document.createElement('div');
  sec.className = 'prop-section';
  const head = document.createElement('div');
  head.className = 'prop-title';
  head.innerHTML = `<span>${title}</span><span class="chev">▾</span>`;
  head.addEventListener('click', () => sec.classList.toggle('collapsed'));
  const grid = document.createElement('div');
  grid.className = 'prop-grid';
  fields.filter(Boolean).forEach((f) => grid.appendChild(f));
  sec.appendChild(head); sec.appendChild(grid);
  root.appendChild(sec);
}

function field(label, control, full = false) {
  const f = document.createElement('div');
  f.className = 'field' + (full ? ' full' : '');
  const l = document.createElement('label');
  l.textContent = label;
  f.appendChild(l); f.appendChild(control);
  return f;
}
function wrapFull(node) { const d = document.createElement('div'); d.className = 'field full'; d.appendChild(node); return d; }
function hint(root, txt) { const d = document.createElement('div'); d.className = 'hint full'; d.textContent = txt; return d; }

// Aplica un cambio al modelo con una única entrada de historial por sesión de
// edición (snapshot al enfocar), y refresco en vivo del canvas.
function bindLive(input, obj, key, parse) {
  input.dataset.bind = key;
  input.addEventListener('focus', () => store.snapshot());
  const apply = () => {
    setPath(obj, key, parse ? parse(input.value) : input.value);
    store.dirty = true;
    store.emit('slide:changed');
    store.emit('change');
  };
  input.addEventListener('input', apply);
}

function text(obj, key) {
  const i = document.createElement('input'); i.type = 'text';
  i.value = getPath(obj, key) ?? '';
  bindLive(i, obj, key);
  return i;
}
function textarea(obj, key) {
  const t = document.createElement('textarea');
  t.value = getPath(obj, key) ?? '';
  bindLive(t, obj, key);
  return t;
}
function number(obj, key, opts = {}) {
  const i = document.createElement('input'); i.type = 'number';
  if (opts.min !== undefined) i.min = opts.min;
  if (opts.max !== undefined) i.max = opts.max;
  i.step = opts.step ?? 1;
  i.value = getPath(obj, key) ?? 0;
  bindLive(i, obj, key, (v) => (v === '' ? 0 : Number(v)));
  return i;
}
function range(obj, key, opts) {
  const i = document.createElement('input'); i.type = 'range';
  i.min = opts.min; i.max = opts.max; i.step = opts.step;
  i.value = getPath(obj, key);
  bindLive(i, obj, key, Number);
  return i;
}
function select(obj, key, options) {
  const s = document.createElement('select');
  options.forEach((o) => {
    const [val, label] = Array.isArray(o) ? o : [o, o];
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = label;
    s.appendChild(opt);
  });
  s.value = getPath(obj, key);
  bindLive(s, obj, key, (v) => (/^\d+$/.test(v) ? Number(v) : v));
  return s;
}
function segmented(obj, key, options) {
  const seg = document.createElement('div');
  seg.className = 'seg';
  const sync = () => seg.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.v === String(getPath(obj, key))));
  options.forEach(([val, label]) => {
    const b = document.createElement('button');
    b.dataset.v = val; b.textContent = label;
    b.addEventListener('click', () => {
      store.snapshot();
      setPath(obj, key, val);
      store.dirty = true; store.emit('slide:changed'); store.emit('change');
      sync();
    });
    seg.appendChild(b);
  });
  sync();
  return seg;
}
function colorField(obj, key) {
  const wrap = document.createElement('div');
  wrap.className = 'color-field';
  const current = getPath(obj, key) ?? '#000000';
  const swatch = document.createElement('input');
  swatch.type = 'color';
  swatch.style.width = '38px'; swatch.style.flex = '0 0 auto';
  swatch.value = toHex(current);
  const txt = document.createElement('input');
  txt.type = 'text'; txt.value = current; txt.dataset.bind = key;
  const commit = (v) => { store.snapshot(); setPath(obj, key, v); store.dirty = true; store.emit('slide:changed'); store.emit('change'); };
  swatch.addEventListener('input', () => { txt.value = swatch.value; commit(swatch.value); });
  txt.addEventListener('focus', () => store.snapshot());
  txt.addEventListener('input', () => { setPath(obj, key, txt.value); if (/^#/.test(txt.value)) swatch.value = toHex(txt.value); store.dirty = true; store.emit('slide:changed'); store.emit('change'); });
  wrap.appendChild(swatch); wrap.appendChild(txt);
  return wrap;
}
function imageButton(el) {
  const wrap = document.createElement('div');
  const btn = document.createElement('button');
  btn.className = 'btn'; btn.style.width = '100%';
  btn.textContent = el.src ? 'Reemplazar imagen…' : 'Subir imagen…';
  btn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.addEventListener('change', async () => {
      const file = input.files[0]; if (!file) return;
      try {
        const { src } = await api.uploadAsset(store.slug, file);
        store.mutate(() => { el.src = src; });
        toast('Imagen subida.');
      } catch (e) { toast(`Error: ${e.message}`, 'err'); }
    });
    input.click();
  });
  wrap.appendChild(btn);
  return wrap;
}

// ─────────────────────────── Acceso por ruta ─────────────────────────────

function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, val) {
  const keys = path.split('.');
  const last = keys.pop();
  const t = keys.reduce((o, k) => o[k], obj);
  t[last] = val;
}
function toHex(v) {
  if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) return v;
  if (typeof v === 'string' && /^#[0-9a-f]{3}$/i.test(v)) return '#' + v.slice(1).split('').map((c) => c + c).join('');
  return '#000000';
}
