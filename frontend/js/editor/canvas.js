// canvas.js — Área central de edición. Renderiza el slide activo a escala real
// (1920×1080) y lo muestra escalado a la pantalla con transform:scale(), sin
// alterar las coordenadas del modelo. Gestiona selección, arrastre, redimensión
// con manijas y edición de texto en línea.

import { store } from '../store.js';
import { renderSlide } from '../renderer/slideRenderer.js';

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN = 12; // tamaño mínimo de elemento en px de diseño

export function initCanvas() {
  const stage = document.getElementById('stage');
  const wrap = document.getElementById('canvas-wrap');
  const scaler = document.getElementById('canvas-scaler');
  const canvas = document.getElementById('slide-canvas');

  // Capa de selección (coords de pantalla, fuera del scaler para manijas de
  // tamaño constante).
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.pointerEvents = 'none';
  wrap.appendChild(overlay);

  let editing = null; // nodo en edición de texto

  function project() { return store.project; }
  function dims() {
    const p = project();
    return { w: p ? p.width : 1920, h: p ? p.height : 1080 };
  }

  // ── Escalado / ajuste ──
  function fit() {
    const { w, h } = dims();
    const pad = 64;
    const availW = stage.clientWidth - pad;
    const availH = stage.clientHeight - pad;
    const z = Math.max(0.1, Math.min(availW / w, availH / h));
    store.setZoom(z, { auto: true });
  }
  function applyScale() {
    const { w, h } = dims();
    const z = store.zoom;
    scaler.style.transform = `scale(${z})`;
    scaler.style.width = `${w}px`;
    scaler.style.height = `${h}px`;
    wrap.style.width = `${w * z}px`;
    wrap.style.height = `${h * z}px`;
    updateOverlay();
    const label = document.getElementById('zoom-label');
    if (label) label.textContent = `${Math.round(z * 100)}%`;
  }

  // ── Render del slide activo ──
  function rerender() {
    const slide = store.currentSlide();
    renderSlide(canvas, slide, project(), { editable: true });
    if (store.autoFit) fit();   // fit() emite 'zoom' → applyScale
    applyScale();
    updateOverlay();
  }

  // ── Overlay de selección ──
  function clearOverlay() { overlay.innerHTML = ''; }
  function updateOverlay() {
    clearOverlay();
    const el = store.currentElement();
    if (!el || editing) return;
    const z = store.zoom;
    const box = document.createElement('div');
    box.className = 'sel-box';
    box.style.left = `${el.x * z}px`;
    box.style.top = `${el.y * z}px`;
    box.style.width = `${el.w * z}px`;
    box.style.height = `${el.h * z}px`;
    overlay.appendChild(box);
    if (el.locked) return;
    for (const pos of HANDLES) {
      const hd = document.createElement('div');
      hd.className = `sel-handle ${pos}`;
      const { hx, hy } = handlePos(pos, el, z);
      hd.style.left = `${hx - 6}px`;
      hd.style.top = `${hy - 6}px`;
      hd.addEventListener('pointerdown', (e) => startResize(e, pos, el));
      overlay.appendChild(hd);
    }
  }
  function handlePos(pos, el, z) {
    const x0 = el.x * z, y0 = el.y * z, w = el.w * z, h = el.h * z;
    const cx = x0 + w / 2, cy = y0 + h / 2;
    const map = {
      nw: [x0, y0], n: [cx, y0], ne: [x0 + w, y0], e: [x0 + w, cy],
      se: [x0 + w, y0 + h], s: [cx, y0 + h], sw: [x0, y0 + h], w: [x0, cy],
    };
    return { hx: map[pos][0], hy: map[pos][1] };
  }

  // Actualiza en vivo el nodo DOM de un elemento (sin re-render completo).
  function liveUpdateNode(el) {
    const node = canvas.querySelector(`[data-el-id="${el.id}"]`);
    if (!node) return;
    node.style.left = `${el.x}px`;
    node.style.top = `${el.y}px`;
    node.style.width = `${el.w}px`;
    node.style.height = `${el.h}px`;
  }

  // ── Selección por click ──
  canvas.addEventListener('pointerdown', (e) => {
    if (editing) return;
    const target = e.target.closest('[data-el-id]');
    if (!target) { store.selectElement(null); return; }
    const id = target.dataset.elId;
    store.selectElement(id);
    const el = store.currentElement();
    if (el && !el.locked) startMove(e, el);
  });

  // ── Arrastre para mover ──
  function startMove(e, el) {
    e.preventDefault();
    const z = store.zoom;
    const startX = e.clientX, startY = e.clientY;
    const ox = el.x, oy = el.y;
    let moved = false;
    store.snapshot();
    function move(ev) {
      const dx = (ev.clientX - startX) / z;
      const dy = (ev.clientY - startY) / z;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
      el.x = Math.round(ox + dx);
      el.y = Math.round(oy + dy);
      liveUpdateNode(el);
      updateOverlay();
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved) { store.dirty = true; store.emit('slide:changed'); store.emit('change'); }
      else { store._history.pop(); } // click sin arrastre: descartar snapshot
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ── Redimensión con manijas ──
  function startResize(e, pos, el) {
    e.preventDefault();
    e.stopPropagation();
    const z = store.zoom;
    const startX = e.clientX, startY = e.clientY;
    const o = { x: el.x, y: el.y, w: el.w, h: el.h };
    store.snapshot();
    function move(ev) {
      const dx = (ev.clientX - startX) / z;
      const dy = (ev.clientY - startY) / z;
      let { x, y, w, h } = o;
      if (pos.includes('e')) w = Math.max(MIN, o.w + dx);
      if (pos.includes('s')) h = Math.max(MIN, o.h + dy);
      if (pos.includes('w')) { w = Math.max(MIN, o.w - dx); x = o.x + (o.w - w); }
      if (pos.includes('n')) { h = Math.max(MIN, o.h - dy); y = o.y + (o.h - h); }
      Object.assign(el, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) });
      liveUpdateNode(el);
      updateOverlay();
    }
    function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      store.dirty = true; store.emit('slide:changed'); store.emit('change');
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  // ── Edición de texto en línea (doble click) ──
  canvas.addEventListener('dblclick', (e) => {
    const target = e.target.closest('[data-el-id]');
    if (!target) return;
    const el = store.currentElement();
    if (!el || el.type !== 'text' || el.locked) return;
    const inner = target.querySelector('[data-anim-target]') || target;
    editing = inner;
    clearOverlay();
    inner.setAttribute('contenteditable', 'true');
    inner.style.outline = '2px solid var(--blue)';
    inner.focus();
    document.getSelection().selectAllChildren(inner);

    function finish() {
      inner.removeAttribute('contenteditable');
      inner.style.outline = '';
      inner.removeEventListener('blur', finish);
      inner.removeEventListener('keydown', onKey);
      const text = inner.innerText;
      editing = null;
      if (text !== el.content) {
        store.mutate((p) => { el.content = text; });
      } else {
        updateOverlay();
      }
    }
    function onKey(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); inner.blur(); }
    }
    inner.addEventListener('blur', finish);
    inner.addEventListener('keydown', onKey);
  });

  // ── Suscripciones ──
  store.on('project:loaded', rerender);
  store.on('selection:slide', rerender);
  store.on('slide:changed', () => { rerender(); });
  store.on('selection:element', updateOverlay);
  store.on('zoom', applyScale);

  // Reajuste al redimensionar. Se usa ResizeObserver sobre el propio stage
  // (fiable ante maximizar, cambios de layout, paneles) y, como respaldo, el
  // evento window.resize. Ambos reajustan solo si el zoom es automático.
  function handleResize() { if (store.autoFit) { fit(); applyScale(); } else { applyScale(); } }
  if (typeof ResizeObserver !== 'undefined') {
    // Cambiar la escala no altera el tamaño del stage (overflow oculto), así
    // que no hay bucle de realimentación.
    new ResizeObserver(() => handleResize()).observe(stage);
  }
  window.addEventListener('resize', handleResize);

  // Zoom controls
  document.getElementById('zoom-in').addEventListener('click', () => { store.setZoom(Math.min(3, store.zoom * 1.1)); });
  document.getElementById('zoom-out').addEventListener('click', () => { store.setZoom(Math.max(0.1, store.zoom / 1.1)); });
  document.getElementById('zoom-fit').addEventListener('click', () => { fit(); applyScale(); });

  return { fit, rerender, applyScale };
}
