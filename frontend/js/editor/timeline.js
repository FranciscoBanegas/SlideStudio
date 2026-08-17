// timeline.js — Dock inferior con la línea de tiempo de las animaciones del
// slide activo. Muestra una pista por elemento sobre un eje temporal común: la
// barra representa delay → delay+duration, con una cola para el stagger de las
// animaciones por letra/palabra/línea.
//
// Edita el mismo objeto Animation que el panel de propiedades (única fuente de
// verdad): arrastrar la barra cambia `delay`, arrastrar su borde derecho cambia
// `duration`. Sigue el patrón de arrastre del canvas (snapshot en pointerdown,
// emit al soltar, descartar el snapshot si no hubo movimiento).

import { store } from '../store.js';

const LABEL_W = 150;        // ancho de la columna de etiquetas (px)
const BODY_PAD = 28;        // padding horizontal del #timeline-body (14px × 2, ver app.css)
const MIN_PX_PER_SEC = 60;  // escala mínima para que las barras no colapsen
const TIME_PAD = 0.5;       // margen de tiempo tras el último fin (s)
const MIN_DURATION = 0.05;
const ROW_H = 30;

let els = {};               // refs del DOM
let pxPerSec = MIN_PX_PER_SEC;
let lastWidth = 0;          // ancho con el que se construyó (para recalcular al redimensionar)

export function initTimeline({ onPlaySlide } = {}) {
  els.dock = document.getElementById('timeline');
  els.body = document.getElementById('timeline-body');
  els.playBtn = document.getElementById('tl-play');
  els.toggleBtn = document.getElementById('tl-toggle');
  els.topToggle = document.getElementById('btn-timeline');
  const app = document.getElementById('app');

  function toggle(force) {
    const collapsed = force !== undefined ? force : !app.classList.contains('timeline-collapsed');
    app.classList.toggle('timeline-collapsed', collapsed);
    if (els.topToggle) els.topToggle.classList.toggle('active', !collapsed);
    if (!collapsed) build();
  }

  els.playBtn?.addEventListener('click', () => onPlaySlide && onPlaySlide());
  els.toggleBtn?.addEventListener('click', () => toggle(true));
  els.topToggle?.addEventListener('click', () => toggle());

  store.on('project:loaded', build);
  store.on('selection:slide', build);
  store.on('slide:changed', build);
  store.on('selection:element', highlight);

  // Recalcular la escala cuando cambia el ancho disponible (abrir/cerrar el
  // dock, redimensionar la ventana). Solo si el ancho cambió, para no entrar en
  // bucle con la barra de scroll. La construcción no altera el ancho del body.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (app.classList.contains('timeline-collapsed')) return;
      if (Math.abs(els.body.clientWidth - lastWidth) > 1) build();
    }).observe(els.body);
  }

  build();
}

// Nº de unidades animadas estimadas para calcular la cola de stagger.
function unitCount(el) {
  const anim = el.animation;
  if (!anim || anim.applyTo === 'element' || el.type !== 'text') return 1;
  const text = el.content || '';
  if (anim.applyTo === 'letter') return Math.max(1, [...text].length);
  if (anim.applyTo === 'word') return Math.max(1, text.trim().split(/\s+/).filter(Boolean).length);
  return Math.max(1, text.split('\n').length); // line
}

// Fin total (s) de la animación de un elemento, incluida la cola de stagger.
function endTime(el) {
  const a = el.animation;
  if (!a || a.type === 'none') return 0;
  const dur = Math.max(MIN_DURATION, a.duration || 0);
  const delay = a.delay || 0;
  const staggerSpan = (unitCount(el) - 1) * (a.stagger || 0);
  return delay + staggerSpan + dur;
}

function labelFor(el) {
  const bits = { text: el.content, image: 'Imagen', rect: 'Rectángulo',
    line: 'Línea', background: 'Fondo', html: 'HTML' };
  const raw = (bits[el.type] || el.type || '').toString().replace(/\s+/g, ' ').trim();
  return raw.length > 22 ? raw.slice(0, 21) + '…' : (raw || el.type);
}

function build() {
  if (!els.body) return;
  els.body.innerHTML = '';
  const slide = store.currentSlide();
  if (!slide || !slide.elements.length) {
    const empty = document.createElement('div');
    empty.className = 'tl-empty';
    empty.textContent = slide ? 'Este slide no tiene elementos.' : 'No hay slide seleccionado.';
    els.body.appendChild(empty);
    return;
  }

  // Escala temporal: fin máximo entre todos los elementos + margen.
  lastWidth = els.body.clientWidth;
  const maxEnd = Math.max(TIME_PAD, ...slide.elements.map(endTime)) + TIME_PAD;
  // Escalar al segundo entero superior para que los ticks 0..N encajen exactos
  // dentro del ancho del track (sin que el último se salga).
  const totalSecs = Math.max(1, Math.ceil(maxEnd));
  const trackW = Math.max(lastWidth - BODY_PAD - LABEL_W, 200);
  pxPerSec = Math.max(MIN_PX_PER_SEC, trackW / totalSecs);

  // Eje de segundos (cabecera con grid).
  const ruler = document.createElement('div');
  ruler.className = 'tl-ruler';
  ruler.style.marginLeft = `${LABEL_W}px`;
  for (let s = 0; s <= totalSecs; s++) {
    const tick = document.createElement('div');
    tick.className = 'tl-tick';
    tick.style.left = `${s * pxPerSec}px`;
    tick.textContent = `${s}s`;
    ruler.appendChild(tick);
  }
  els.body.appendChild(ruler);

  // Una fila por elemento.
  const rows = document.createElement('div');
  rows.className = 'tl-rows';
  slide.elements.forEach((el) => rows.appendChild(buildRow(el, totalSecs)));
  els.body.appendChild(rows);

  highlight();
}

function buildRow(el, totalSecs) {
  const row = document.createElement('div');
  row.className = 'tl-row';
  row.dataset.elId = el.id;
  row.style.height = `${ROW_H}px`;

  const label = document.createElement('div');
  label.className = 'tl-label';
  label.style.width = `${LABEL_W}px`;
  label.innerHTML = `<span class="tl-type">${el.type}</span><span class="tl-name">${labelFor(el)}</span>`;
  label.addEventListener('click', () => store.selectElement(el.id));
  row.appendChild(label);

  const track = document.createElement('div');
  track.className = 'tl-track';
  // Líneas de grid por segundo.
  for (let s = 1; s <= totalSecs; s++) {
    const g = document.createElement('div');
    g.className = 'tl-grid';
    g.style.left = `${s * pxPerSec}px`;
    track.appendChild(g);
  }

  const a = el.animation;
  if (!a || a.type === 'none') {
    const none = document.createElement('div');
    none.className = 'tl-none';
    none.textContent = 'sin animación';
    track.appendChild(none);
  } else {
    track.appendChild(buildBar(el));
  }
  track.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.tl-bar')) return; // el drag lo maneja la barra
    store.selectElement(el.id);
  });
  row.appendChild(track);
  return row;
}

function buildBar(el) {
  const a = el.animation;
  const dur = Math.max(MIN_DURATION, a.duration || 0);
  const delay = a.delay || 0;

  const bar = document.createElement('div');
  bar.className = 'tl-bar';
  bar.style.left = `${delay * pxPerSec}px`;
  bar.style.width = `${dur * pxPerSec}px`;
  bar.title = `${a.type} · delay ${delay.toFixed(2)}s · ${dur.toFixed(2)}s`;

  // Cola de stagger (letra/palabra/línea): extensión tenue hasta el fin total.
  const total = endTime(el);
  const tailSecs = total - (delay + dur);
  if (tailSecs > 0.001) {
    const tail = document.createElement('div');
    tail.className = 'tl-tail';
    tail.style.width = `${tailSecs * pxPerSec}px`;
    bar.appendChild(tail);
  }

  const lbl = document.createElement('span');
  lbl.className = 'tl-bar-label';
  lbl.textContent = a.type;
  bar.appendChild(lbl);

  const handle = document.createElement('div');
  handle.className = 'tl-bar-resize';
  bar.appendChild(handle);

  bar.addEventListener('pointerdown', (e) => startDrag(e, el, 'move'));
  handle.addEventListener('pointerdown', (e) => startDrag(e, el, 'resize'));
  return bar;
}

// Arrastre de la barra: 'move' cambia delay, 'resize' cambia duration.
// Mismo patrón que canvas.js (snapshot al empezar, emit al soltar, descartar
// el snapshot si no hubo movimiento real).
function startDrag(e, el, mode) {
  e.preventDefault();
  e.stopPropagation();
  store.selectElement(el.id);
  const a = el.animation;
  const startX = e.clientX;
  const o = { delay: a.delay || 0, duration: Math.max(MIN_DURATION, a.duration || 0) };
  let moved = false;
  store.snapshot();

  function move(ev) {
    const dSec = (ev.clientX - startX) / pxPerSec;
    if (Math.abs(ev.clientX - startX) > 1) moved = true;
    if (mode === 'move') {
      a.delay = Math.max(0, round2(o.delay + dSec));
    } else {
      a.duration = Math.max(MIN_DURATION, round2(o.duration + dSec));
    }
    liveUpdateBar(el);
  }
  function up() {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    if (moved) {
      store.dirty = true;
      store.emit('slide:changed'); // reconstruye timeline y refresca propiedades/canvas
      store.emit('change');
    } else {
      store._history.pop(); // click sin arrastre: descartar snapshot
    }
  }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// Actualiza la barra en vivo durante el arrastre sin reconstruir todo el dock.
function liveUpdateBar(el) {
  const row = els.body.querySelector(`.tl-row[data-el-id="${el.id}"]`);
  const bar = row && row.querySelector('.tl-bar');
  if (!bar) return;
  const a = el.animation;
  const dur = Math.max(MIN_DURATION, a.duration || 0);
  const delay = a.delay || 0;
  bar.style.left = `${delay * pxPerSec}px`;
  bar.style.width = `${dur * pxPerSec}px`;
  bar.title = `${a.type} · delay ${delay.toFixed(2)}s · ${dur.toFixed(2)}s`;
  const tail = bar.querySelector('.tl-tail');
  if (tail) {
    const tailSecs = endTime(el) - (delay + dur);
    tail.style.width = `${Math.max(0, tailSecs) * pxPerSec}px`;
  }
}

function highlight() {
  if (!els.body) return;
  els.body.querySelectorAll('.tl-row').forEach((r) => {
    r.classList.toggle('active', r.dataset.elId === store.selectedElementId);
  });
}

function round2(v) { return Math.round(v * 100) / 100; }
