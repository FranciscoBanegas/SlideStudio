// animations.js — Motor de animaciones declarativo por CSS.
//
// Cada animación se interpreta como FAMILIA de efecto + DIRECCIÓN (entrada o
// salida). El `type` del modelo se normaliza a una familia (fadeIn/fadeOut →
// fade, slideInLeft → slideLeft, …) y `direction` ('in'|'out') elige entre los
// keyframes de entrada o de salida de esa familia. Así un mismo elemento puede
// entrar con un efecto y (al cambiar de slide) salir con él.
//
// Si `applyTo` es letter/word/line, el texto se parte en unidades y cada una
// recibe un retardo escalonado (stagger) — la característica "letra por letra".

const KEYFRAMES = `
@keyframes ss-fadeIn      { from{opacity:0} to{opacity:1} }
@keyframes ss-fadeOut     { from{opacity:1} to{opacity:0} }
@keyframes ss-slideInLeft { from{opacity:0; transform:translateX(-60px)} to{opacity:1; transform:none} }
@keyframes ss-slideInRight{ from{opacity:0; transform:translateX(60px)} to{opacity:1; transform:none} }
@keyframes ss-slideInTop  { from{opacity:0; transform:translateY(-50px)} to{opacity:1; transform:none} }
@keyframes ss-slideInBottom{from{opacity:0; transform:translateY(50px)} to{opacity:1; transform:none} }
@keyframes ss-slideOutLeft { from{opacity:1; transform:none} to{opacity:0; transform:translateX(-60px)} }
@keyframes ss-slideOutRight{ from{opacity:1; transform:none} to{opacity:0; transform:translateX(60px)} }
@keyframes ss-slideOutTop  { from{opacity:1; transform:none} to{opacity:0; transform:translateY(-50px)} }
@keyframes ss-slideOutBottom{from{opacity:1; transform:none} to{opacity:0; transform:translateY(50px)} }
@keyframes ss-scaleIn     { from{opacity:0; transform:scale(.86)} to{opacity:1; transform:scale(1)} }
@keyframes ss-scaleOut    { from{opacity:1; transform:scale(1)} to{opacity:0; transform:scale(.86)} }
@keyframes ss-zoom        { from{opacity:0; transform:scale(1.25)} to{opacity:1; transform:scale(1)} }
@keyframes ss-zoomOut     { from{opacity:1; transform:scale(1)} to{opacity:0; transform:scale(1.25)} }
@keyframes ss-blurIn      { from{opacity:0; filter:blur(14px)} to{opacity:1; filter:blur(0)} }
@keyframes ss-blurOut     { from{opacity:1; filter:blur(0)} to{opacity:0; filter:blur(14px)} }
@keyframes ss-bounce {
  0%{opacity:0; transform:translateY(40px)}
  60%{opacity:1; transform:translateY(-12px)}
  80%{transform:translateY(4px)} 100%{transform:translateY(0)}
}
@keyframes ss-bounceOut {
  0%{opacity:1; transform:translateY(0)}
  20%{transform:translateY(-10px)}
  100%{opacity:0; transform:translateY(60px)}
}
@keyframes ss-flipIn  { from{opacity:0; transform:perspective(800px) rotateY(90deg)}  to{opacity:1; transform:perspective(800px) rotateY(0)} }
@keyframes ss-flipOut { from{opacity:1; transform:perspective(800px) rotateY(0)} to{opacity:0; transform:perspective(800px) rotateY(-90deg)} }
@keyframes ss-rotateIn  { from{opacity:0; transform:rotate(-12deg) scale(.9)} to{opacity:1; transform:rotate(0) scale(1)} }
@keyframes ss-rotateOut { from{opacity:1; transform:rotate(0) scale(1)} to{opacity:0; transform:rotate(12deg) scale(.9)} }
@keyframes ss-wipeIn  { from{clip-path:inset(0 100% 0 0)} to{clip-path:inset(0 0 0 0)} }
@keyframes ss-wipeOut { from{clip-path:inset(0 0 0 0)} to{clip-path:inset(0 0 0 100%)} }
`;

// type -> familia de efecto (normaliza los literales, viejos y nuevos).
const FAMILY = {
  none: 'none',
  fadeIn: 'fade', fadeOut: 'fade',
  slideInLeft: 'slideLeft', slideInRight: 'slideRight',
  slideInTop: 'slideTop', slideInBottom: 'slideBottom',
  scaleIn: 'scale', zoom: 'zoom', blurIn: 'blur', bounce: 'bounce',
  typewriter: 'typewriter',
  flipIn: 'flip', rotateIn: 'rotate', wipeIn: 'wipe',
};
function family(type) { return FAMILY[type] || 'fade'; }

// familia -> keyframe de entrada / salida.
const NAME_IN = {
  fade: 'ss-fadeIn',
  slideLeft: 'ss-slideInLeft', slideRight: 'ss-slideInRight',
  slideTop: 'ss-slideInTop', slideBottom: 'ss-slideInBottom',
  scale: 'ss-scaleIn', zoom: 'ss-zoom', blur: 'ss-blurIn', bounce: 'ss-bounce',
  flip: 'ss-flipIn', rotate: 'ss-rotateIn', wipe: 'ss-wipeIn',
};
const NAME_OUT = {
  fade: 'ss-fadeOut',
  slideLeft: 'ss-slideOutLeft', slideRight: 'ss-slideOutRight',
  slideTop: 'ss-slideOutTop', slideBottom: 'ss-slideOutBottom',
  scale: 'ss-scaleOut', zoom: 'ss-zoomOut', blur: 'ss-blurOut', bounce: 'ss-bounceOut',
  flip: 'ss-flipOut', rotate: 'ss-rotateOut', wipe: 'ss-wipeOut',
};

function isOut(anim) { return anim && anim.direction === 'out'; }

let injected = false;
export function injectKeyframes(doc = document) {
  if (injected && doc === document) return;
  const style = doc.createElement('style');
  style.setAttribute('data-ss-anim', '');
  style.textContent = KEYFRAMES;
  doc.head.appendChild(style);
  if (doc === document) injected = true;
}

// Divide el texto de un nodo en unidades envueltas en <span>, preservando el
// texto original en data-plain para poder restaurarlo.
function splitInto(node, unit) {
  const text = node.getAttribute('data-plain') ?? node.textContent;
  node.setAttribute('data-plain', text);
  node.textContent = '';
  let parts;
  if (unit === 'letter') parts = [...text];
  else if (unit === 'word') parts = text.split(/(\s+)/);
  else parts = text.split('\n');            // line

  const spans = [];
  parts.forEach((p) => {
    if (unit === 'letter' && p === ' ') { node.appendChild(document.createTextNode(' ')); return; }
    if (unit === 'word' && /^\s+$/.test(p)) { node.appendChild(document.createTextNode(p)); return; }
    const span = document.createElement('span');
    span.className = 'ss-unit';
    span.style.display = 'inline-block';
    span.style.whiteSpace = 'pre';
    span.textContent = p;
    node.appendChild(span);
    spans.push(span);
    if (unit === 'line') node.appendChild(document.createElement('br'));
  });
  return spans;
}

export function restorePlain(node) {
  const plain = node.getAttribute('data-plain');
  if (plain != null) { node.textContent = plain; node.removeAttribute('data-plain'); }
}

// Duración total estimada (segundos) de una animación. `units` = nº de unidades
// para letter/word/line (para el stagger). Compartido por present/timeline/export.
export function animEnd(anim, units = 1) {
  if (!anim || anim.type === 'none') return 0;
  const dur = Math.max(0.05, anim.duration || 0.5);
  const delay = anim.delay || 0;
  const stag = anim.stagger || 0.05;
  const n = (anim.applyTo && anim.applyTo !== 'element') ? Math.max(1, units) : 1;
  return delay + (n - 1) * stag + dur;
}

// Prepara un nodo para animar. En ENTRADA lo deja en su estado inicial oculto
// (evita el parpadeo antes del disparo). En SALIDA no hace nada: el elemento
// permanece visible hasta que se dispara su animación de salida.
export function primeElement(node, anim) {
  if (!anim || anim.type === 'none' || isOut(anim)) return;
  if (family(anim.type) === 'typewriter') { node.setAttribute('data-tw', node.textContent); node.textContent = ''; return; }
  node.style.opacity = '0';
}

// Dispara la animación (entrada o salida según anim.direction). Devuelve la
// duración total estimada (segundos).
export function playElement(node, anim) {
  if (!anim || anim.type === 'none') { node.style.opacity = ''; return 0; }
  const out = isOut(anim);
  const dur = Math.max(0.05, anim.duration || 0.5);
  const delay = anim.delay || 0;
  const easing = anim.easing || 'ease-out';

  if (family(anim.type) === 'typewriter') return playTypewriter(node, anim, out);

  const kf = (out ? NAME_OUT : NAME_IN)[family(anim.type)];
  if (!kf) { node.style.opacity = out ? '0' : ''; return 0; }

  if (anim.applyTo === 'element') {
    node.style.opacity = '';
    node.style.animation = `${kf} ${dur}s ${easing} ${delay}s both`;
    return delay + dur;
  }

  // letra / palabra / línea → stagger
  node.style.opacity = '';
  const units = splitInto(node, anim.applyTo);
  const stag = anim.stagger || 0.05;
  units.forEach((u, i) => {
    u.style.animation = `${kf} ${dur}s ${easing} ${(delay + i * stag).toFixed(3)}s both`;
  });
  return delay + units.length * stag + dur;
}

// Máquina de escribir. En entrada revela carácter a carácter; en salida borra
// carácter a carácter desde el final.
function playTypewriter(node, anim, out) {
  const stag = anim.stagger || 0.05;
  const startMs = (anim.delay || 0) * 1000;
  node.style.opacity = '';
  if (out) {
    const text = node.getAttribute('data-plain') ?? node.textContent;
    node.setAttribute('data-plain', text);
    const chars = [...text];
    const n = chars.length;
    for (let i = 0; i < n; i++) {
      const rem = n - 1 - i;
      setTimeout(() => { node.textContent = chars.slice(0, rem).join(''); }, startMs + i * stag * 1000);
    }
    return (anim.delay || 0) + n * stag;
  }
  const text = node.getAttribute('data-tw') ?? node.textContent;
  node.setAttribute('data-tw', text);
  node.textContent = '';
  const chars = [...text];
  chars.forEach((ch, i) => {
    setTimeout(() => { node.textContent += ch; }, startMs + i * stag * 1000);
  });
  return (anim.delay || 0) + chars.length * stag;
}

// Resetea cualquier estado de animación dejado en el nodo (para volver a editar).
export function clearElement(node) {
  node.style.animation = '';
  node.style.opacity = '';
  node.style.clipPath = '';
  if (node.hasAttribute('data-plain')) restorePlain(node);
  if (node.hasAttribute('data-tw')) { node.textContent = node.getAttribute('data-tw'); node.removeAttribute('data-tw'); }
}
