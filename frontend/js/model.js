// model.js — Fábricas y valores por defecto en el cliente. Refleja el esquema
// de backend/app/models.py. Mantener ambos en sincronía al añadir tipos.

let _seq = 0;
export function uid(prefix = 'el') {
  _seq += 1;
  return `${prefix}-${Date.now().toString(36)}${(_seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// Catálogos para la UI (deben coincidir con los Literal de models.py).
export const ANIMATION_TYPES = [
  'none', 'fadeIn', 'fadeOut', 'slideInLeft', 'slideInRight', 'slideInTop',
  'slideInBottom', 'scaleIn', 'zoom', 'blurIn', 'bounce', 'typewriter',
];
export const ANIMATION_APPLY = ['element', 'letter', 'word', 'line'];
export const TRANSITION_TYPES = ['none', 'fade', 'slideH', 'slideV', 'zoom', 'blur', 'scale', 'push', 'wipe'];
export const EASINGS = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'cubic-bezier(.2,.8,.2,1)'];
export const TEXT_ROLES = ['title', 'subtitle', 'body', 'label'];

export function defaultAnimation() {
  return { type: 'none', applyTo: 'element', duration: 0.5, delay: 0, stagger: 0.05, easing: 'ease-out', direction: 'in' };
}

export function defaultTransition() {
  return { type: 'fade', duration: 0.5, easing: 'ease' };
}

// Presets por rol, alineados con la escala tipográfica del deck.
const TEXT_PRESETS = {
  title:    { content: 'Título', role: 'title', fontSize: 60, fontWeight: 700, color: 'var(--ink)', w: 1200, h: 90, fontFamily: "'IBM Plex Sans', sans-serif" },
  subtitle: { content: 'Subtítulo', role: 'subtitle', fontSize: 40, fontWeight: 400, color: 'var(--muted)', w: 1000, h: 64, fontFamily: "'IBM Plex Sans', sans-serif" },
  body:     { content: 'Texto del cuerpo', role: 'body', fontSize: 30, fontWeight: 400, color: 'var(--ink)', w: 900, h: 60, fontFamily: "'IBM Plex Sans', sans-serif" },
  label:    { content: 'ETIQUETA', role: 'label', fontSize: 28, fontWeight: 600, color: 'var(--amber)', w: 500, h: 44, letterSpacing: 3, fontFamily: "'IBM Plex Mono', monospace" },
};

function baseFields(over = {}) {
  return {
    id: uid('el'), x: 200, y: 200, w: 400, h: 120, rotation: 0, opacity: 1,
    z: 0, locked: false, animation: defaultAnimation(), ...over,
  };
}

export function makeElement(kind) {
  switch (kind) {
    case 'text': case 'title': case 'subtitle': case 'label': {
      const preset = TEXT_PRESETS[kind === 'text' ? 'body' : kind];
      return { type: 'text', align: 'left', lineHeight: 1.4, letterSpacing: 0,
        ...baseFields({ x: 200, y: 200 }), ...preset };
    }
    case 'image':
      return { type: 'image', src: '', fit: 'contain', radius: 0,
        ...baseFields({ x: 660, y: 340, w: 600, h: 400 }) };
    case 'rect':
      return { type: 'rect', fill: 'var(--panel)', stroke: 'var(--line)', strokeWidth: 1, radius: 14,
        ...baseFields({ x: 660, y: 390, w: 600, h: 300 }) };
    case 'line':
      return { type: 'line', stroke: 'var(--line2)', strokeWidth: 6,
        ...baseFields({ x: 660, y: 520, w: 600, h: 6 }) };
    case 'background':
      return { type: 'background', color: 'var(--bg)', gradient: null,
        ...baseFields({ x: 0, y: 0, w: 1920, h: 1080, z: -1000 }) };
    default:
      return makeElement('text');
  }
}

export function makeSlide(name = 'Slide') {
  return {
    id: uid('slide'), name, background: 'var(--bg)',
    transitionIn: defaultTransition(), transitionOut: defaultTransition(),
    speakerNotes: '', elements: [],
  };
}

export function cloneSlide(slide) {
  const copy = JSON.parse(JSON.stringify(slide));
  copy.id = uid('slide');
  copy.name = `${slide.name} (copia)`;
  copy.elements.forEach((el) => { el.id = uid('el'); });
  return copy;
}

export function cloneElement(el) {
  const copy = JSON.parse(JSON.stringify(el));
  copy.id = uid('el');
  copy.x += 40; copy.y += 40;
  return copy;
}
