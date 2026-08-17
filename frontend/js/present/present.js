// present.js — Modo presentación a pantalla completa. Oculta el editor, escala
// el slide al viewport, ejecuta transiciones entre slides y dispara las
// animaciones de entrada de cada elemento. Navegación por teclado.

import { store } from '../store.js';
import { renderSlide } from '../renderer/slideRenderer.js';
import { injectKeyframes, primeElement, playElement, animEnd } from '../anim/animations.js';
import { animTarget } from '../renderer/elements.js';

// Nº de unidades animadas de un elemento (para el stagger de letra/palabra/línea).
export function unitCount(el) {
  const a = el.animation;
  if (!a || a.applyTo === 'element' || el.type !== 'text') return 1;
  const text = el.content || '';
  if (a.applyTo === 'letter') return Math.max(1, [...text].length);
  if (a.applyTo === 'word') return Math.max(1, text.trim().split(/\s+/).filter(Boolean).length);
  return Math.max(1, text.split('\n').length);
}

export const TRANSITION_INIT = {
  none: () => 'none',
  fade: () => 'none',
  slideH: (dir) => `translateX(${dir > 0 ? 100 : -100}%)`,
  slideV: (dir) => `translateY(${dir > 0 ? 100 : -100}%)`,
  push: (dir) => `translateX(${dir > 0 ? 100 : -100}%)`,
  zoom: () => 'scale(1.15)',
  scale: () => 'scale(0.9)',
  blur: () => 'none',
  wipe: () => 'none',
};

export function initPresent() {
  const root = document.getElementById('present-root');
  const stage = document.getElementById('present-stage');
  const canvas = document.getElementById('present-canvas');
  injectKeyframes();

  let idx = 0;
  let active = false;
  let busy = false;      // hay una fase de salida en curso
  let _pending = null;
  let _ro = null;

  function dims() { const p = store.project; return { w: p.width, h: p.height }; }

  function fit() {
    const { w, h } = dims();
    const scale = Math.min(window.innerWidth / w, window.innerHeight / h);
    stage.style.width = `${w}px`;
    stage.style.height = `${h}px`;
    // translate(-50%,-50%) centra la stage respecto a la ventana; scale reduce
    // alrededor del centro → letterbox simétrico en cualquier resolución.
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  function show(i, dir = 1) {
    const slides = store.slides;
    idx = Math.max(0, Math.min(slides.length - 1, i));
    const slide = slides[idx];
    const trans = slide.transitionIn || { type: 'fade', duration: 0.5, easing: 'ease' };

    renderSlide(canvas, slide, store.project, { editable: false });

    // Preparar elementos animados en su estado inicial (evita parpadeo).
    const anims = [];
    canvas.querySelectorAll('[data-el-id]').forEach((node) => {
      const el = slide.elements.find((e) => e.id === node.dataset.elId);
      if (!el || !el.animation || el.animation.type === 'none') return;
      const target = node.hasAttribute('data-anim-self') ? node : animTarget(node);
      primeElement(target, el.animation);
      anims.push({ target, anim: el.animation });
    });

    // Transición de entrada del slide.
    const initTransform = (TRANSITION_INIT[trans.type] || TRANSITION_INIT.fade)(dir);
    canvas.style.transition = 'none';
    canvas.style.opacity = trans.type === 'fade' || trans.type === 'blur' || trans.type === 'wipe' ? '0' : '1';
    canvas.style.filter = trans.type === 'blur' ? 'blur(18px)' : 'none';
    canvas.style.transform = initTransform;
    // Forzar reflow para que la transición aplique desde el estado inicial.
    void canvas.offsetWidth;
    const d = trans.duration || 0.5;
    canvas.style.transition = `transform ${d}s ${trans.easing}, opacity ${d}s ${trans.easing}, filter ${d}s ${trans.easing}`;
    canvas.style.transform = 'none';
    canvas.style.opacity = '1';
    canvas.style.filter = 'none';

    // Disparar animaciones de elementos tras la transición del slide.
    setTimeout(() => { anims.forEach(({ target, anim }) => playElement(target, anim)); }, d * 1000 * 0.6);
  }

  // Reproduce las animaciones de SALIDA de los elementos del slide actual y
  // devuelve su duración máxima (segundos). 0 si no hay ninguna.
  function playExits() {
    const slide = store.slides[idx];
    if (!slide) return 0;
    let maxEnd = 0;
    canvas.querySelectorAll('[data-el-id]').forEach((node) => {
      const el = slide.elements.find((e) => e.id === node.dataset.elId);
      if (!el || !el.animation || el.animation.type === 'none' || el.animation.direction !== 'out') return;
      const target = node.hasAttribute('data-anim-self') ? node : animTarget(node);
      playElement(target, el.animation);
      maxEnd = Math.max(maxEnd, animEnd(el.animation, unitCount(el)));
    });
    return maxEnd;
  }

  // Cambia de slide: primero salen los elementos del slide actual (si los hay),
  // luego se muestra el destino con su transición de entrada.
  function go(i, dir) {
    if (busy) return;
    const wait = playExits();
    if (wait > 0) {
      busy = true;
      clearTimeout(_pending);
      _pending = setTimeout(() => { busy = false; show(i, dir); }, wait * 1000);
    } else {
      show(i, dir);
    }
  }

  function next() { if (idx < store.slides.length - 1) go(idx + 1, 1); }
  function prev() { if (idx > 0) go(idx - 1, -1); }

  function onKey(e) {
    if (!active) return;
    if (e.key === 'Escape') { stop(); }
    else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') { go(0, 1); }
    else if (e.key === 'End') { go(store.slides.length - 1, 1); }
  }

  function start(fromIndex) {
    if (!store.slides.length) return;
    active = true;
    root.classList.add('on');
    fit();
    const startIdx = fromIndex != null ? fromIndex
      : Math.max(0, store.slides.findIndex((s) => s.id === store.selectedSlideId));
    show(startIdx, 1);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', fit);
    if (typeof ResizeObserver !== 'undefined') {
      if (!_ro) _ro = new ResizeObserver(() => { if (active) fit(); });
      _ro.observe(root);
    }
    root.addEventListener('click', onClick);
    if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
  }

  function onClick(e) {
    // Clic en la mitad derecha avanza; izquierda retrocede.
    if (e.clientX > window.innerWidth / 2) next(); else prev();
  }

  function stop() {
    active = false;
    busy = false;
    clearTimeout(_pending);
    root.classList.remove('on');
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', fit);
    if (_ro) _ro.disconnect();
    root.removeEventListener('click', onClick);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  return { start, stop };
}
