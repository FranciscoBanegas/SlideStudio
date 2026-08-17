// html.js — Exportación a un archivo HTML autónomo (un único .html que se abre
// sin servidor). Dos modos:
//   - 'present': presentación reproducible (navegación + transiciones +
//     animaciones), equivalente al modo Presentar.
//   - 'static' : documento con todos los slides apilados en scroll (equivalente
//     web del PDF), estado final visible, sin animaciones.
//
// Estrategia de máxima reutilización y autosuficiencia:
//   - Los slides se pre-renderizan con el MISMO renderer del editor
//     (renderSlide), así la fidelidad es 1:1.
//   - Las imágenes se incrustan como data URIs → el archivo no depende del
//     servidor.
//   - El motor de animación real (anim/animations.js, que no tiene imports) se
//     incrusta verbatim en el modo 'present', sin duplicarlo.
//   - Las fuentes se cargan vía el @import de Google Fonts que ya trae
//     slide-theme.css (cae a fuentes del sistema sin internet).

import { store } from '../store.js';
import { renderSlide } from '../renderer/slideRenderer.js';
import { toast } from '../ui.js';

export async function exportHtml(mode = 'present') {
  const project = store.project;
  if (!project || !project.slides.length) {
    toast('No hay slides para exportar.', 'err');
    return;
  }

  toast('Generando HTML…');
  try {
    const themeCss = await fetchText('css/slide-theme.css');
    const slides = await buildSlides(project);
    const html = mode === 'static'
      ? staticDocument(project, slides, themeCss)
      : await presentDocument(project, slides, themeCss);
    download(`${slugify(project.name)}.html`, html);
    toast('HTML exportado.');
  } catch (e) {
    toast(`Error al exportar: ${e.message}`, 'err');
    console.error(e);
  }
}

// ─────────────────────── Pre-render + assets → data URI ───────────────────────

// Pre-renderiza cada slide en un contenedor desprendido y devuelve, por slide,
// su estilo inline (tokens de tema + fondo + dimensiones), el innerHTML de los
// elementos, la transición de entrada y el mapa elId → animación.
async function buildSlides(project) {
  const out = [];
  for (const slide of project.slides) {
    const box = document.createElement('div');
    box.className = 'ss-slide';
    renderSlide(box, slide, project, { editable: false });
    await inlineImages(box);
    const anims = {};
    for (const el of slide.elements) {
      if (el.animation && el.animation.type && el.animation.type !== 'none') {
        anims[el.id] = el.animation;
      }
    }
    out.push({
      style: box.getAttribute('style') || '',
      html: box.innerHTML,
      transitionIn: slide.transitionIn || { type: 'fade', duration: 0.5, easing: 'ease' },
      anims,
    });
  }
  return out;
}

// Convierte cada <img> (servido por el backend) a un data URI incrustado.
async function inlineImages(root) {
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(imgs.map(async (img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      img.setAttribute('src', await blobToDataUrl(blob));
    } catch (_) { /* si falla, se deja la ruta original */ }
  }));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// ─────────────────────────── Documento: presentación ──────────────────────────

async function presentDocument(project, slides, themeCss) {
  // Motor de animación real, incrustado sin sus `export` (no tiene imports).
  const animSrc = (await fetchText('js/anim/animations.js')).replaceAll('export ', '');

  const deck = { width: project.width || 1920, height: project.height || 1080, slides };

  const css = `
${themeCss}
html,body{margin:0;height:100%;background:#000;overflow:hidden;}
#stage{position:absolute;left:50%;top:50%;transform-origin:center center;}
#canvas{position:absolute;top:0;left:0;overflow:hidden;}
#hint{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);
  color:rgba(255,255,255,.4);font:12px 'IBM Plex Mono',monospace;
  opacity:0;transition:opacity .3s ease;pointer-events:none;}
body:hover #hint{opacity:1;}`;

  // El body de cada <script> se concatena como valor (no dentro de un template
  // literal) para no colisionar con las comillas invertidas de los fuentes.
  const parts = [];
  parts.push('<!doctype html><html lang="es"><head><meta charset="utf-8">');
  parts.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
  parts.push(`<title>${escapeHtml(project.name)}</title>`);
  parts.push('<style>' + css + '</style></head><body>');
  parts.push('<div id="stage"><div id="canvas" class="ss-slide"></div></div>');
  parts.push('<div id="hint">← → / Espacio · clic para navegar · F pantalla completa</div>');
  parts.push('<script>' + animSrc + '</script>');
  parts.push('<script>window.__DECK__=' + JSON.stringify(deck) + ';</script>');
  parts.push('<script>(' + presentRuntime.toString() + ')();</script>');
  parts.push('</body></html>');
  return parts.join('');
}

// Runtime autónomo del .html exportado. Se serializa con toString(); debe ser
// autosuficiente: solo usa globals del documento, window.__DECK__ y las
// funciones del motor incrustado (primeElement/playElement/injectKeyframes).
function presentRuntime() {
  const deck = window.__DECK__;
  const W = deck.width, H = deck.height;
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('canvas');
  injectKeyframes(); // del motor incrustado

  // Mapa de transiciones (espejo de present.js TRANSITION_INIT).
  const TRANSITION_INIT = {
    none: () => 'none',
    fade: () => 'none',
    slideH: (d) => 'translateX(' + (d > 0 ? 100 : -100) + '%)',
    slideV: (d) => 'translateY(' + (d > 0 ? 100 : -100) + '%)',
    push: (d) => 'translateX(' + (d > 0 ? 100 : -100) + '%)',
    zoom: () => 'scale(1.15)',
    scale: () => 'scale(0.9)',
    blur: () => 'none',
    wipe: () => 'none',
  };

  let idx = 0;
  function fit() {
    const s = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.width = W + 'px';
    stage.style.height = H + 'px';
    stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }

  function show(i, dir) {
    idx = Math.max(0, Math.min(deck.slides.length - 1, i));
    const slide = deck.slides[idx];
    const trans = slide.transitionIn || { type: 'fade', duration: 0.5, easing: 'ease' };

    canvas.setAttribute('style', slide.style);
    canvas.innerHTML = slide.html;

    // Preparar elementos animados en su estado inicial (evita parpadeo).
    const anims = [];
    canvas.querySelectorAll('[data-el-id]').forEach((node) => {
      const anim = slide.anims[node.dataset.elId];
      if (!anim) return;
      const target = node.hasAttribute('data-anim-self')
        ? node : (node.querySelector('[data-anim-target]') || node);
      primeElement(target, anim);
      anims.push({ target, anim });
    });

    // Transición de entrada del slide.
    const initTransform = (TRANSITION_INIT[trans.type] || TRANSITION_INIT.fade)(dir);
    canvas.style.transition = 'none';
    canvas.style.opacity = (trans.type === 'fade' || trans.type === 'blur' || trans.type === 'wipe') ? '0' : '1';
    canvas.style.filter = trans.type === 'blur' ? 'blur(18px)' : 'none';
    canvas.style.transform = initTransform;
    void canvas.offsetWidth; // reflow
    const d = trans.duration || 0.5;
    canvas.style.transition = 'transform ' + d + 's ' + trans.easing +
      ', opacity ' + d + 's ' + trans.easing + ', filter ' + d + 's ' + trans.easing;
    canvas.style.transform = 'none';
    canvas.style.opacity = '1';
    canvas.style.filter = 'none';

    setTimeout(() => { anims.forEach((a) => playElement(a.target, a.anim)); }, d * 1000 * 0.6);
  }

  function next() { if (idx < deck.slides.length - 1) show(idx + 1, 1); }
  function prev() { if (idx > 0) show(idx - 1, -1); }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') { show(0, 1); }
    else if (e.key === 'End') { show(deck.slides.length - 1, 1); }
    else if (e.key.toLowerCase() === 'f') {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
    }
  });
  document.body.addEventListener('click', (e) => {
    if (e.clientX > window.innerWidth / 2) next(); else prev();
  });
  window.addEventListener('resize', fit);

  fit();
  show(0, 1);
}

// ─────────────────────────── Documento: estático ──────────────────────────────

function staticDocument(project, slides, themeCss) {
  const W = project.width || 1920, H = project.height || 1080;
  const css = `
${themeCss}
html,body{margin:0;background:#0b0e13;}
.deck{max-width:1280px;margin:0 auto;padding:28px 20px;display:flex;flex-direction:column;gap:28px;}
.slide-doc{position:relative;width:100%;aspect-ratio:${W} / ${H};overflow:hidden;
  border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.5);background:#000;}
.slide-doc > .ss-slide{transform-origin:top left;}`;

  const body = slides.map((s) =>
    '<div class="slide-doc"><div class="ss-slide" style="' + escapeAttr(s.style) + '">' + s.html + '</div></div>'
  ).join('');

  const parts = [];
  parts.push('<!doctype html><html lang="es"><head><meta charset="utf-8">');
  parts.push(`<meta name="viewport" content="width=device-width, initial-scale=1">`);
  parts.push(`<title>${escapeHtml(project.name)}</title>`);
  parts.push('<style>' + css + '</style></head><body>');
  parts.push('<div class="deck">' + body + '</div>');
  parts.push('<script>window.__DIM__=' + JSON.stringify({ W, H }) + ';</script>');
  parts.push('<script>(' + staticRuntime.toString() + ')();</script>');
  parts.push('</body></html>');
  return parts.join('');
}

// Escala cada slide (1920×W) al ancho de su tarjeta, y reajusta al redimensionar.
function staticRuntime() {
  const W = window.__DIM__.W;
  function scale() {
    document.querySelectorAll('.slide-doc').forEach((wrap) => {
      const inner = wrap.querySelector('.ss-slide');
      if (inner) inner.style.transform = 'scale(' + (wrap.clientWidth / W) + ')';
    });
  }
  window.addEventListener('resize', scale);
  scale();
}

// ─────────────────────────────── Utilidades ───────────────────────────────────

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo leer ${url} (${res.status})`);
  return res.text();
}

function download(name, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
}

function slugify(name) {
  return String(name || 'presentacion').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'presentacion';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
}
