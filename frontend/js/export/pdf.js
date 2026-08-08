// pdf.js — Exportación a PDF de la presentación.
//
// Estrategia: se construye una vista de impresión con todos los slides (cada
// uno a 1920×1080, una página por slide) y se invoca el motor de impresión del
// navegador. El usuario elige "Guardar como PDF" como destino. Sin dependencias
// externas y con fidelidad 1:1 respecto al canvas (mismo renderer y tokens).
//
// La lógica de exportación vive aislada aquí para poder añadir en el futuro
// otros formatos (imágenes, vídeo, HTML) o un backend de render sin tocar el
// resto del editor.

import { store } from '../store.js';
import { renderSlide } from '../renderer/slideRenderer.js';
import { toast } from '../ui.js';

// Espera a que imágenes y fuentes estén listas para que el PDF no salga con
// recursos a medio cargar. Con límite de tiempo para no bloquear.
function waitForAssets(root, timeout = 4000) {
  const imgs = [...root.querySelectorAll('img')].filter((im) => !im.complete);
  const imgPromises = imgs.map(
    (im) => new Promise((res) => { im.onload = im.onerror = res; })
  );
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const all = Promise.all([...imgPromises, fonts]);
  return Promise.race([all, new Promise((res) => setTimeout(res, timeout))]);
}

export async function exportPdf() {
  const project = store.project;
  if (!project || !project.slides.length) {
    toast('No hay slides para exportar.', 'err');
    return;
  }

  // Reconstruir la raíz de impresión desde cero.
  document.getElementById('print-root')?.remove();
  const root = document.createElement('div');
  root.id = 'print-root';

  for (const slide of project.slides) {
    const page = document.createElement('div');
    page.className = 'print-slide ss-slide';
    // Render estático (sin animaciones): estado final visible, igual que el canvas.
    renderSlide(page, slide, project, { editable: false });
    root.appendChild(page);
  }
  document.body.appendChild(root);

  toast('Preparando PDF… elige "Guardar como PDF" en el diálogo.');
  await waitForAssets(root);

  const cleanup = () => {
    root.remove();
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);

  // El diálogo de impresión es modal; afterprint limpia al cerrarlo.
  window.print();

  // Respaldo de limpieza por si el navegador no emite afterprint.
  setTimeout(() => { if (document.getElementById('print-root')) cleanup(); }, 60000);
}
