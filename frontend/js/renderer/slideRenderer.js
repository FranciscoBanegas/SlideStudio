// slideRenderer.js — Renderiza un slide (modelo) al DOM dentro de un contenedor
// .ss-slide de tamaño de diseño (1920×1080). El escalado a pantalla lo hace el
// canvas via transform:scale() sobre el contenedor padre, sin tocar geometrías.

import { renderElement } from './elements.js';

// Aplica los tokens de tema del proyecto como variables CSS del contenedor,
// de modo que cualquier `var(--ink)` etc. resuelva al tema del proyecto.
export function applyTheme(container, project) {
  if (!project || !project.theme) return;
  const c = project.theme.colors || {};
  for (const [k, v] of Object.entries(c)) container.style.setProperty(`--${k}`, v);
}

export function renderSlide(container, slide, project, { editable = false } = {}) {
  container.innerHTML = '';
  const w = project.width || 1920;
  const h = project.height || 1080;
  container.style.width = `${w}px`;
  container.style.height = `${h}px`;
  container.style.background = slide ? slide.background : 'var(--bg)';
  applyTheme(container, project);

  if (!slide) return;

  const ordered = [...slide.elements].sort((a, b) => (a.z || 0) - (b.z || 0));
  for (const el of ordered) {
    const node = renderElement(el);
    if (editable) {
      node.classList.add('selectable');
      if (el.locked) node.classList.add('locked');
    } else {
      node.style.pointerEvents = 'none';
    }
    container.appendChild(node);
  }
}
