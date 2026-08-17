// toolbar.js — Barra superior: insertar elementos, guardar, cambiar/crear
// proyecto, deshacer/rehacer y presentar. También registra atajos de teclado.

import { store } from '../store.js';
import { api } from '../api.js';
import { toast } from '../ui.js';
import { makeElement } from '../model.js';
import { exportPdf } from '../export/pdf.js';
import { exportHtml } from '../export/html.js';

export function initToolbar({ loadProject, startPresent, refreshProjectList }) {
  const projName = document.getElementById('proj-name');
  const select = document.getElementById('project-select');

  // ── Menú insertar ──
  const menu = document.getElementById('insert-menu');
  document.getElementById('insert-btn').addEventListener('click', (e) => {
    e.stopPropagation(); menu.classList.toggle('open');
  });
  document.addEventListener('click', () => menu.classList.remove('open'));
  menu.querySelectorAll('[data-insert]').forEach((btn) => {
    btn.addEventListener('click', () => { menu.classList.remove('open'); insert(btn.dataset.insert); });
  });

  function centerElement(el) {
    const p = store.project;
    el.x = Math.round((p.width - el.w) / 2);
    el.y = Math.round((p.height - el.h) / 2);
  }
  function addElement(el) {
    store.mutate(() => { store.currentSlide().elements.push(el); });
    store.selectElement(el.id);
  }
  async function insert(kind) {
    if (!store.currentSlide()) { toast('Crea o selecciona un slide primero.', 'err'); return; }
    if (kind === 'image') {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.addEventListener('change', async () => {
        const file = input.files[0]; if (!file) return;
        try {
          const { src } = await api.uploadAsset(store.slug, file);
          const el = makeElement('image'); el.src = src; centerElement(el); addElement(el);
        } catch (e) { toast(`Error: ${e.message}`, 'err'); }
      });
      input.click();
      return;
    }
    const el = makeElement(kind);
    if (kind !== 'background') centerElement(el);
    addElement(el);
  }

  // ── Guardar ──
  async function save() {
    if (!store.slug) return;
    try {
      await api.saveProject(store.slug, store.project);
      store.markSaved();
      toast('Proyecto guardado.');
    } catch (e) { toast(`Error al guardar: ${e.message}`, 'err'); }
  }
  document.getElementById('btn-save').addEventListener('click', save);

  // ── Proyectos ──
  document.getElementById('btn-new-project').addEventListener('click', async () => {
    const name = prompt('Nombre del nuevo proyecto:', 'Nueva presentación');
    if (!name) return;
    try {
      const { slug } = await api.createProject(name);
      await refreshProjectList();
      select.value = slug;
      await loadProject(slug);
      toast('Proyecto creado.');
    } catch (e) { toast(`Error: ${e.message}`, 'err'); }
  });
  // Duplicar la presentación actual (para editarla sin tocar la original).
  document.getElementById('btn-duplicate-project').addEventListener('click', async () => {
    if (!store.slug) return;
    try {
      // Se guarda antes para que el duplicado refleje el estado actual.
      if (store.dirty) { await api.saveProject(store.slug, store.project); store.markSaved(); }
      const { slug } = await api.duplicateProject(store.slug);
      await refreshProjectList();
      select.value = slug;
      await loadProject(slug);
      toast('Presentación duplicada. Estás editando la copia.');
    } catch (e) { toast(`Error al duplicar: ${e.message}`, 'err'); }
  });

  // Eliminar la presentación actual (irreversible; se pide confirmación).
  document.getElementById('btn-delete-project').addEventListener('click', async () => {
    if (!store.slug) return;
    const name = (store.project && store.project.name) || store.slug;
    if (!confirm(`¿Eliminar la presentación "${name}"?\nEsta acción no se puede deshacer.`)) return;
    try {
      await api.deleteProject(store.slug);
      const projects = await refreshProjectList();
      if (projects.length) {
        await loadProject(projects[0].slug);
      } else {
        // No dejar la app sin proyecto: crear uno vacío.
        const { slug } = await api.createProject('Nueva presentación');
        await refreshProjectList();
        await loadProject(slug);
      }
      toast('Presentación eliminada.');
    } catch (e) { toast(`Error al eliminar: ${e.message}`, 'err'); }
  });

  select.addEventListener('change', async () => {
    if (store.dirty && !confirm('Hay cambios sin guardar. ¿Descartarlos y cambiar de proyecto?')) {
      select.value = store.slug; return;
    }
    await loadProject(select.value);
  });

  // ── Undo / Redo ──
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  undoBtn.addEventListener('click', () => store.undo());
  redoBtn.addEventListener('click', () => store.redo());
  store.on('change', () => {
    undoBtn.disabled = !store.canUndo();
    redoBtn.disabled = !store.canRedo();
    projName.textContent = store.project ? store.project.name + (store.dirty ? ' •' : '') : '—';
  });

  // ── Exportar (PDF / HTML autónomo) ──
  const exportMenu = document.getElementById('export-menu');
  document.getElementById('export-btn').addEventListener('click', (e) => {
    e.stopPropagation(); exportMenu.classList.toggle('open');
  });
  document.addEventListener('click', () => exportMenu.classList.remove('open'));
  exportMenu.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', () => {
      exportMenu.classList.remove('open');
      const kind = btn.dataset.export;
      if (kind === 'pdf') exportPdf();
      else if (kind === 'html-present') exportHtml('present');
      else if (kind === 'html-static') exportHtml('static');
    });
  });

  // ── Presentar ──
  document.getElementById('btn-present').addEventListener('click', () => startPresent());

  // ── Atajos ──
  window.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)
      || document.activeElement?.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); store.redo(); return; }
    if (typing) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && store.currentElement()) {
      e.preventDefault();
      const id = store.selectedElementId;
      store.mutate(() => { const s = store.currentSlide(); s.elements = s.elements.filter((el) => el.id !== id); });
      store.selectElement(null);
    }
    // Nudge con flechas
    const el = store.currentElement();
    if (el && !el.locked && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      store.snapshot();
      if (e.key === 'ArrowLeft') el.x -= step;
      if (e.key === 'ArrowRight') el.x += step;
      if (e.key === 'ArrowUp') el.y -= step;
      if (e.key === 'ArrowDown') el.y += step;
      store.dirty = true; store.emit('slide:changed'); store.emit('change');
    }
  });

  return { save };
}
