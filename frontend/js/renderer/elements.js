// elements.js — Registro de renderers por tipo de elemento. Añadir un tipo =
// añadir una entrada aquí (y su modelo en model.js/models.py). El core no cambia.

import { api } from '../api.js';
import { store } from '../store.js';

function applyBox(node, el) {
  node.style.left = `${el.x}px`;
  node.style.top = `${el.y}px`;
  node.style.width = `${el.w}px`;
  node.style.height = `${el.h}px`;
  node.style.opacity = el.opacity;
  node.style.zIndex = el.z;
  if (el.rotation) node.style.transform = `rotate(${el.rotation}deg)`;
}

const renderers = {
  text(el) {
    const n = document.createElement('div');
    n.className = 'ss-el ss-el-text';
    applyBox(n, el);
    n.style.fontFamily = el.fontFamily;
    n.style.fontSize = `${el.fontSize}px`;
    n.style.fontWeight = el.fontWeight;
    n.style.color = el.color;
    n.style.textAlign = el.align;
    n.style.lineHeight = el.lineHeight;
    n.style.letterSpacing = `${el.letterSpacing}px`;
    n.style.whiteSpace = 'pre-wrap';
    n.style.wordBreak = 'break-word';
    n.style.display = 'flex';
    n.style.flexDirection = 'column';
    n.style.justifyContent = 'center';
    // El texto animable vive en un nodo interno (data-anim-target).
    const inner = document.createElement('div');
    inner.setAttribute('data-anim-target', '');
    inner.textContent = el.content;
    n.appendChild(inner);
    return n;
  },

  image(el) {
    const n = document.createElement('div');
    n.className = 'ss-el ss-el-image';
    applyBox(n, el);
    n.style.borderRadius = `${el.radius || 0}px`;
    n.style.overflow = 'hidden';
    if (el.src) {
      const img = document.createElement('img');
      img.src = api.assetUrl(store.slug, el.src);
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = el.fit || 'contain';
      img.setAttribute('data-anim-target', '');
      img.draggable = false;
      n.appendChild(img);
    } else {
      n.style.border = '1px dashed var(--line2)';
      n.style.display = 'grid';
      n.style.placeItems = 'center';
      n.style.color = 'var(--dim)';
      n.style.fontFamily = "'IBM Plex Mono', monospace";
      n.style.fontSize = '20px';
      n.textContent = 'Imagen';
    }
    return n;
  },

  rect(el) {
    const n = document.createElement('div');
    n.className = 'ss-el ss-el-rect';
    applyBox(n, el);
    n.style.background = el.fill;
    n.style.border = `${el.strokeWidth}px solid ${el.stroke}`;
    n.style.borderRadius = `${el.radius}px`;
    n.setAttribute('data-anim-self', '');
    return n;
  },

  line(el) {
    const n = document.createElement('div');
    n.className = 'ss-el ss-el-line';
    applyBox(n, el);
    n.style.background = el.stroke;
    n.style.height = `${el.strokeWidth}px`;
    n.style.borderRadius = '999px';
    n.setAttribute('data-anim-self', '');
    return n;
  },

  background(el) {
    const n = document.createElement('div');
    n.className = 'ss-el ss-el-background';
    applyBox(n, el);
    n.style.background = el.gradient || el.color;
    return n;
  },

  html(el) {
    const n = document.createElement('div');
    n.className = 'ss-el ss-el-html';
    applyBox(n, el);
    n.innerHTML = el.markup || '';
    n.setAttribute('data-anim-self', '');
    return n;
  },
};

// Nodo interno objetivo de animación (para text/image), o el propio nodo.
export function animTarget(node) {
  return node.querySelector('[data-anim-target]') || node;
}

export function renderElement(el) {
  const fn = renderers[el.type] || renderers.text;
  const node = fn(el);
  node.dataset.elId = el.id;
  return node;
}
