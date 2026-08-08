// slidesPanel.js — Rail izquierdo: miniaturas de slides con crear, seleccionar,
// eliminar, duplicar y reordenar por arrastre. Las miniaturas reutilizan el
// mismo renderer que el canvas, escalado a tamaño de tarjeta.

import { store } from '../store.js';
import { renderSlide } from '../renderer/slideRenderer.js';
import { makeSlide, cloneSlide } from '../model.js';
import { toast } from '../ui.js';

export function initSlidesPanel() {
  const list = document.getElementById('rail-list');
  const countEl = document.getElementById('slide-count');
  let dragId = null;

  // ResizeObserver escala las miniaturas en cuanto el layout conoce su tamaño,
  // sin depender de requestAnimationFrame (que no dispara si el panel no
  // está compositando).
  const ro = new ResizeObserver((entries) => {
    const w = (store.project && store.project.width) || 1920;
    for (const entry of entries) {
      const inner = entry.target.querySelector('.thumb-inner');
      if (inner && entry.target.clientWidth) {
        inner.style.transform = `scale(${entry.target.clientWidth / w})`;
      }
    }
  });

  function render() {
    const project = store.project;
    if (!project) { list.innerHTML = ''; return; }
    countEl.textContent = project.slides.length;
    ro.disconnect();
    list.innerHTML = '';

    project.slides.forEach((slide, i) => {
      const card = document.createElement('div');
      card.className = 'slide-card' + (slide.id === store.selectedSlideId ? ' active' : '');
      card.dataset.slideId = slide.id;
      card.draggable = true;

      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      const inner = document.createElement('div');
      inner.className = 'thumb-inner ss-slide';
      renderSlide(inner, slide, project, { editable: false });
      thumb.appendChild(inner);
      card.appendChild(thumb);
      ro.observe(thumb);

      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.innerHTML = `<span class="idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="label">${escapeHtml(slide.name)}</span>`;
      card.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.innerHTML = `
        <div class="mini" data-act="dup" title="Duplicar">⧉</div>
        <div class="mini danger" data-act="del" title="Eliminar">✕</div>`;
      card.appendChild(actions);

      // Eventos
      card.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]');
        if (act) { e.stopPropagation(); handleAction(act.dataset.act, slide.id); return; }
        store.selectSlide(slide.id);
      });

      // Drag & drop reordenamiento
      card.addEventListener('dragstart', () => { dragId = slide.id; card.classList.add('dragging'); });
      card.addEventListener('dragend', () => { dragId = null; card.classList.remove('dragging'); clearDropMarks(); });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (dragId === slide.id) return;
        const before = isBefore(e, card);
        clearDropMarks();
        card.classList.add(before ? 'drop-before' : 'drop-after');
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        if (dragId === null || dragId === slide.id) return;
        reorder(dragId, slide.id, isBefore(e, card));
      });

      list.appendChild(card);
    });

    // Medición síncrona (fuerza reflow) como vía principal; el ResizeObserver
    // reajusta ante cambios de tamaño posteriores.
    scaleThumbs();
  }

  function scaleThumbs() {
    const project = store.project;
    if (!project) return;
    const w = project.width || 1920;
    list.querySelectorAll('.thumb').forEach((thumb) => {
      const inner = thumb.querySelector('.thumb-inner');
      if (inner && thumb.clientWidth) inner.style.transform = `scale(${thumb.clientWidth / w})`;
    });
  }

  function isBefore(e, card) {
    const r = card.getBoundingClientRect();
    return (e.clientY - r.top) < r.height / 2;
  }
  function clearDropMarks() {
    list.querySelectorAll('.drop-before,.drop-after').forEach((c) => c.classList.remove('drop-before', 'drop-after'));
  }

  function reorder(fromId, toId, before) {
    store.mutate((p) => {
      const arr = p.slides;
      const from = arr.findIndex((s) => s.id === fromId);
      const moved = arr.splice(from, 1)[0];
      let to = arr.findIndex((s) => s.id === toId);
      if (!before) to += 1;
      arr.splice(to, 0, moved);
    }, { event: 'slides:reordered' });
  }

  function handleAction(act, slideId) {
    if (act === 'dup') {
      const idx = store.slides.findIndex((s) => s.id === slideId);
      const copy = cloneSlide(store.slides[idx]);
      store.mutate((p) => { p.slides.splice(idx + 1, 0, copy); }, { event: 'slides:reordered' });
      store.selectSlide(copy.id);
    } else if (act === 'del') {
      if (store.slides.length <= 1) { toast('No puedes eliminar el único slide.', 'err'); return; }
      const idx = store.slides.findIndex((s) => s.id === slideId);
      store.mutate((p) => { p.slides = p.slides.filter((s) => s.id !== slideId); }, { event: 'slides:reordered' });
      const next = store.slides[Math.min(idx, store.slides.length - 1)];
      store.selectSlide(next ? next.id : null);
    }
  }

  function addSlide() {
    const slide = makeSlide(`Slide ${store.slides.length + 1}`);
    const idx = store.slides.findIndex((s) => s.id === store.selectedSlideId);
    const at = idx >= 0 ? idx + 1 : store.slides.length;
    store.mutate((p) => { p.slides.splice(at, 0, slide); }, { event: 'slides:reordered' });
    store.selectSlide(slide.id);
  }

  document.getElementById('btn-add-slide').addEventListener('click', addSlide);

  store.on('project:loaded', render);
  store.on('slides:reordered', render);
  store.on('selection:slide', render);
  store.on('slide:changed', () => requestAnimationFrame(() => { render(); }));

  return { render, addSlide };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
