// animations.js — Motor de animaciones declarativo por CSS.
//
// Cada tipo = un @keyframes inyectado una sola vez. `playElement` dispara la
// animación sobre un nodo del DOM; si `applyTo` es letter/word/line, el texto
// se parte en unidades y cada una recibe un retardo escalonado (stagger) —
// esa es la característica "letra por letra". Sigue el patrón del deck
// original: el estado final es la base y la animación se dispara al presentar.

const KEYFRAMES = `
@keyframes ss-fadeIn      { from{opacity:0} to{opacity:1} }
@keyframes ss-fadeOut     { from{opacity:1} to{opacity:0} }
@keyframes ss-slideInLeft { from{opacity:0; transform:translateX(-60px)} to{opacity:1; transform:none} }
@keyframes ss-slideInRight{ from{opacity:0; transform:translateX(60px)} to{opacity:1; transform:none} }
@keyframes ss-slideInTop  { from{opacity:0; transform:translateY(-50px)} to{opacity:1; transform:none} }
@keyframes ss-slideInBottom{from{opacity:0; transform:translateY(50px)} to{opacity:1; transform:none} }
@keyframes ss-scaleIn     { from{opacity:0; transform:scale(.86)} to{opacity:1; transform:scale(1)} }
@keyframes ss-zoom        { from{opacity:0; transform:scale(1.25)} to{opacity:1; transform:scale(1)} }
@keyframes ss-blurIn      { from{opacity:0; filter:blur(14px)} to{opacity:1; filter:blur(0)} }
@keyframes ss-bounce {
  0%{opacity:0; transform:translateY(40px)}
  60%{opacity:1; transform:translateY(-12px)}
  80%{transform:translateY(4px)} 100%{transform:translateY(0)}
}
`;

// Mapa tipo -> nombre de keyframe.
const NAME = {
  fadeIn: 'ss-fadeIn', fadeOut: 'ss-fadeOut',
  slideInLeft: 'ss-slideInLeft', slideInRight: 'ss-slideInRight',
  slideInTop: 'ss-slideInTop', slideInBottom: 'ss-slideInBottom',
  scaleIn: 'ss-scaleIn', zoom: 'ss-zoom', blurIn: 'ss-blurIn', bounce: 'ss-bounce',
};

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

// Prepara un nodo para animar (lo deja en estado inicial oculto). Necesario
// para que no haya parpadeo antes del disparo.
export function primeElement(node, anim) {
  if (!anim || anim.type === 'none') return;
  if (anim.type === 'typewriter') { node.setAttribute('data-tw', node.textContent); node.textContent = ''; return; }
  node.style.opacity = '0';
}

// Dispara la animación. Devuelve la duración total estimada (segundos).
export function playElement(node, anim) {
  if (!anim || anim.type === 'none') { node.style.opacity = ''; return 0; }
  const dur = Math.max(0.05, anim.duration || 0.5);
  const delay = anim.delay || 0;
  const easing = anim.easing || 'ease-out';

  if (anim.type === 'typewriter') return playTypewriter(node, anim);

  const kf = NAME[anim.type];
  if (!kf) { node.style.opacity = ''; return 0; }

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

function playTypewriter(node, anim) {
  const text = node.getAttribute('data-tw') ?? node.textContent;
  node.setAttribute('data-tw', text);
  node.textContent = '';
  node.style.opacity = '';
  const chars = [...text];
  const stag = anim.stagger || 0.05;
  const start = (anim.delay || 0) * 1000;
  chars.forEach((ch, i) => {
    const t = start + i * stag * 1000;
    setTimeout(() => { node.textContent += ch; }, t);
  });
  return (anim.delay || 0) + chars.length * stag;
}

// Resetea cualquier estado de animación dejado en el nodo (para volver a editar).
export function clearElement(node) {
  node.style.animation = '';
  node.style.opacity = '';
  if (node.hasAttribute('data-plain')) restorePlain(node);
  if (node.hasAttribute('data-tw')) { node.textContent = node.getAttribute('data-tw'); node.removeAttribute('data-tw'); }
}
