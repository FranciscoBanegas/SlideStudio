// main.js — Punto de entrada. Inicializa módulos, carga la lista de proyectos y
// conecta el flujo completo: crear → guardar → cargar → editar → presentar.

import { store } from './store.js';
import { api } from './api.js';
import { toast } from './ui.js';
import { initCanvas } from './editor/canvas.js';
import { initSlidesPanel } from './editor/slidesPanel.js';
import { initPropertiesPanel } from './editor/propertiesPanel.js';
import { initToolbar } from './editor/toolbar.js';
import { initTimeline } from './editor/timeline.js';
import { initPresent } from './present/present.js';
import { injectKeyframes, primeElement, playElement, clearElement } from './anim/animations.js';
import { animTarget } from './renderer/elements.js';

const select = document.getElementById('project-select');
let canvasApi = null;

async function refreshProjectList() {
  const projects = await api.listProjects();
  select.innerHTML = '';
  projects.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p.slug;
    opt.textContent = `${p.name} · ${p.slideCount}`;
    select.appendChild(opt);
  });
  return projects;
}

async function loadProject(slug) {
  const project = await api.getProject(slug);
  store.setProject(slug, project);
  select.value = slug;
  // El canvas se auto-ajusta al renderizar (store.autoFit); un rAF adicional
  // reajusta cuando la ventana ya tiene su tamaño final.
  requestAnimationFrame(() => { if (canvasApi) canvasApi.fit(); });
}

// Previsualiza la animación de un elemento en el propio canvas de edición.
// Se usa un reflow forzado (no requestAnimationFrame) para que el disparo sea
// inmediato y fiable en cualquier contexto.
function previewAnimation(el) {
  const canvas = document.getElementById('slide-canvas');
  const node = canvas.querySelector(`[data-el-id="${el.id}"]`);
  if (!node) return;
  const target = node.hasAttribute('data-anim-self') ? node : animTarget(node);
  clearElement(target);
  primeElement(target, el.animation);
  void target.offsetWidth;            // fuerza reflow del estado inicial
  playElement(target, el.animation);
}

// Reproduce en el canvas de edición todas las animaciones del slide activo,
// encadenadas según sus delays. Reutiliza la misma lógica de disparo que el
// modo presentación (present.js): prime → reflow → play sobre cada elemento.
function playSlide() {
  const canvas = document.getElementById('slide-canvas');
  const slide = store.currentSlide();
  if (!slide) return;
  const anims = [];
  canvas.querySelectorAll('[data-el-id]').forEach((node) => {
    const el = slide.elements.find((e) => e.id === node.dataset.elId);
    if (!el || !el.animation || el.animation.type === 'none') return;
    const target = node.hasAttribute('data-anim-self') ? node : animTarget(node);
    clearElement(target);
    primeElement(target, el.animation);
    anims.push({ target, anim: el.animation });
  });
  void canvas.offsetWidth;            // fuerza reflow del estado inicial de todos
  anims.forEach(({ target, anim }) => playElement(target, anim));
}

async function boot() {
  injectKeyframes();
  canvasApi = initCanvas();
  initSlidesPanel();
  initPropertiesPanel(previewAnimation);
  initTimeline({ onPlaySlide: playSlide });
  const present = initPresent();
  initToolbar({
    loadProject,
    startPresent: () => present.start(),
    refreshProjectList,
  });

  try {
    const projects = await refreshProjectList();
    if (!projects.length) {
      // No hay proyectos: crear uno vacío para empezar.
      const { slug } = await api.createProject('Nueva presentación');
      await refreshProjectList();
      await loadProject(slug);
    } else {
      // Preferir el deck de ejemplo si existe.
      const sample = projects.find((p) => p.slug === 'tutorial-deshabilitar-root');
      await loadProject(sample ? sample.slug : projects[0].slug);
    }
  } catch (e) {
    toast(`Error al iniciar: ${e.message}`, 'err');
    console.error(e);
  }
}

boot();
