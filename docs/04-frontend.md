# 4 · Frontend

Frontend **vanilla** (sin build, sin npm): módulos ES nativos que el navegador
carga directamente. Se organiza por responsabilidad.

## Mapa de módulos

```
frontend/
├── index.html              Shell: toolbar + 3 paneles + timeline + presentación
├── css/
│   ├── app.css             Cromo del editor (tokens --ui-*)
│   └── slide-theme.css     Tokens y componentes del deck (--bg, .sd, .cmd…) 1:1
└── js/
    ├── main.js             Bootstrap: inicializa módulos y carga proyecto
    ├── api.js              Cliente REST (fetch)
    ├── store.js            Estado + observer + undo/redo (fuente de verdad)
    ├── model.js            Fábricas y defaults (espejo de models.py)
    ├── ui.js               Utilidades (toasts)
    ├── anim/animations.js  Motor de animación CSS (incl. letra por letra)
    ├── renderer/
    │   ├── slideRenderer.js  Slide → DOM a 1920×1080
    │   └── elements.js       Renderer por tipo de elemento
    ├── editor/
    │   ├── canvas.js         Escalado, selección, arrastre, redimensión
    │   ├── slidesPanel.js    Rail: crear/seleccionar/eliminar/duplicar/reordenar
    │   ├── propertiesPanel.js Panel derecho por tipo + animación
    │   ├── timeline.js       Dock inferior: línea de tiempo de animaciones
    │   └── toolbar.js        Insertar, guardar, proyectos, atajos, presentar
    ├── present/present.js    Reproducción fullscreen
    └── export/pdf.js         Exportación a PDF (vía impresión del navegador)
```

## El store (patrón observer)

`store.js` es la **única fuente de verdad**. Los componentes:

- **se suscriben** con `store.on(evento, fn)`;
- **nunca mutan** el proyecto directamente: usan `store.mutate(fn)`, que toma un
  snapshot para deshacer, marca *dirty* y emite eventos.

Eventos principales: `project:loaded`, `selection:slide`, `selection:element`,
`slide:changed`, `slides:reordered`, `zoom`, `change`.

Deshacer/rehacer se implementa con snapshots JSON del proyecto
(`store.snapshot()` / `undo()` / `redo()`), con un límite de historial.

## El canvas (escalado sin deformar)

El slide se renderiza a su tamaño real (1920×1080) dentro de `.ss-slide`, y se
muestra escalado con `transform: scale(z)` sobre el contenedor padre. Las
coordenadas del modelo **no se tocan**; solo cambia la escala visual:

```
Canvas real:  1920 × 1080   (coordenadas del modelo)
Visualización: 1920·z × 1080·z   (z = ajuste al área disponible)
```

La capa de **selección** (marco + 8 manijas) vive fuera del contenedor escalado,
en coordenadas de pantalla, para que las manijas tengan un tamaño constante
independientemente del zoom.

El **auto-ajuste** al redimensionar/maximizar usa un `ResizeObserver` sobre el
área del canvas (más un respaldo con `window.resize`), de modo que la vista se
reajusta de forma fiable aunque el entorno no emita eventos de ventana.

## Interacciones de edición

- **Seleccionar:** clic en un elemento → `store.selectElement(id)`.
- **Mover:** arrastrar el elemento (delta de pantalla ÷ zoom = delta de diseño).
- **Redimensionar:** arrastrar cualquiera de las 8 manijas.
- **Editar texto:** doble clic → `contenteditable` en línea.
- **Teclado:** flechas mueven (Shift = 10px), Supr elimina, ⌘/Ctrl+Z/Y
  deshacer/rehacer, ⌘/Ctrl+S guardar.

## Timeline de animaciones

El dock inferior (`editor/timeline.js`, conmutable con el botón «☰ Timeline»)
dibuja una pista por elemento sobre un eje de segundos. Arrastrar la barra edita
el `delay` del elemento y su borde derecho la `duration`; el botón «▶ Reproducir
slide» encadena todas las animaciones en el canvas. Edita el mismo objeto
`Animation` que el panel de propiedades (misma fuente de verdad), y recalcula su
escala al redimensionar con un `ResizeObserver`. Detalles en
[05 · Animaciones y transiciones](05-animaciones-y-transiciones.md#timeline-visual).

## Fidelidad visual

`slide-theme.css` copia **verbatim** el bloque `:root` y los componentes
(`.sd`, `.cmd`, `.cap`, `.steplabel`, `.foot`, `.dot`, `.mono`) del deck
original, acotados a `.ss-slide` para no chocar con el cromo del editor. Además,
`slideRenderer.applyTheme()` inyecta los colores de `project.theme` como
variables CSS, de modo que `var(--ink)`, `var(--green)`, etc. resuelven al tema
del proyecto.
