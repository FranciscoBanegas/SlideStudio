// templates.js — Modal "Plantillas". Al crear una presentación, el usuario elige
// una plantilla (de sistema o propia) o empieza en blanco. Usar una plantilla
// crea una presentación independiente (el backend copia la carpeta con id nuevo).

import { api } from '../api.js';
import { renderSlide } from '../renderer/slideRenderer.js';
import { toast } from '../ui.js';

export function initTemplates({ loadProject, refreshProjectList }) {
  const root = document.createElement('div');
  root.className = 'modal-root';
  root.id = 'templates-modal';
  root.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal">
      <div class="modal-head">
        <span>Plantillas</span>
        <button class="btn ghost icon" id="tpl-close" title="Cerrar">✕</button>
      </div>
      <div class="modal-body"><div class="tpl-grid" id="tpl-grid"></div></div>
    </div>`;
  document.body.appendChild(root);

  const grid = root.querySelector('#tpl-grid');
  let open_ = false;

  root.querySelector('#tpl-close').addEventListener('click', close);
  root.querySelector('.modal-backdrop').addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (open_ && e.key === 'Escape') close(); });

  function open() { open_ = true; root.classList.add('on'); render(); }
  function close() { open_ = false; root.classList.remove('on'); }

  async function render() {
    grid.innerHTML = '<div class="tpl-loading">Cargando…</div>';
    let templates;
    try { templates = await api.listTemplates(); }
    catch (e) { grid.innerHTML = `<div class="tpl-loading">Error: ${escapeHtml(e.message)}</div>`; return; }
    grid.innerHTML = '';
    grid.appendChild(blankCard());
    templates.forEach((t) => grid.appendChild(templateCard(t)));
  }

  function blankCard() {
    const card = document.createElement('div');
    card.className = 'tpl-card';
    card.innerHTML = `<div class="tpl-thumb tpl-thumb-blank">+</div>
      <div class="tpl-meta"><span class="tpl-name">En blanco</span>
        <span class="tpl-count">Presentación vacía</span></div>`;
    card.addEventListener('click', createBlank);
    return card;
  }

  function templateCard(t) {
    const card = document.createElement('div');
    card.className = 'tpl-card';
    const badge = t.system
      ? '<span class="tpl-badge sys">Sistema</span>'
      : '<span class="tpl-badge user">Tuya</span>';
    const del = t.system ? '' : '<button class="tpl-del" title="Borrar plantilla">✕</button>';
    card.innerHTML = `<div class="tpl-thumb"></div>
      <div class="tpl-meta"><span class="tpl-name">${escapeHtml(t.name)}</span>
        <span class="tpl-count">${t.slideCount} slide${t.slideCount === 1 ? '' : 's'}</span></div>
      ${badge}${del}`;
    loadThumb(card.querySelector('.tpl-thumb'), t.slug);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.tpl-del')) { e.stopPropagation(); confirmDelete(t); return; }
      useTemplate(t);
    });
    return card;
  }

  // Miniatura del primer slide, reutilizando el renderer del editor.
  async function loadThumb(box, slug) {
    try {
      const project = await api.getTemplate(slug);
      if (!project.slides.length) return;
      const inner = document.createElement('div');
      inner.className = 'ss-slide tpl-thumb-inner';
      renderSlide(inner, project.slides[0], project, { editable: false });
      box.appendChild(inner);
      // Escalar el slide (1920×…) al ancho de la tarjeta. ResizeObserver (como en
      // slidesPanel) aplica la escala de forma fiable aunque el layout aún no
      // conozca el tamaño al insertar.
      const w = project.width || 1920;
      const scale = () => { if (box.clientWidth) inner.style.transform = `scale(${box.clientWidth / w})`; };
      scale();
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(scale).observe(box);
    } catch (_) { /* miniatura best-effort */ }
  }

  async function useTemplate(t) {
    const name = prompt('Nombre de la nueva presentación:', t.name);
    if (name === null) return;
    try {
      const { slug } = await api.useTemplate(t.slug, name || t.name);
      await refreshProjectList();
      close();
      await loadProject(slug);
      toast('Presentación creada desde la plantilla.');
    } catch (e) { toast(`Error: ${e.message}`, 'err'); }
  }

  async function createBlank() {
    const name = prompt('Nombre de la nueva presentación:', 'Nueva presentación');
    if (name === null) return;
    try {
      const { slug } = await api.createProject(name || 'Nueva presentación');
      await refreshProjectList();
      close();
      await loadProject(slug);
      toast('Presentación creada.');
    } catch (e) { toast(`Error: ${e.message}`, 'err'); }
  }

  async function confirmDelete(t) {
    if (!confirm(`¿Borrar la plantilla "${t.name}"?\nEsta acción no se puede deshacer.`)) return;
    try { await api.deleteTemplate(t.slug); toast('Plantilla borrada.'); render(); }
    catch (e) { toast(`Error: ${e.message}`, 'err'); }
  }

  return { open, close };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
