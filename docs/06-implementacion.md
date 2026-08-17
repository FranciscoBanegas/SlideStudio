# 6 · Notas de implementación

Registro de las decisiones de diseño y del desarrollo por fases. Útil para
entender **por qué** el proyecto está construido así.

## Punto de partida

La carpeta original contenía **un solo deck HTML** ("Tutorial Deshabilitar
Root"), no una aplicación: un `.html` empaquetado cuyo contenido real está en
`Tutorial Deshabilitar Root.dc.html` (17 `<section class="sd">` de 1920×1080) y
un motor propio `deck-stage.js`. El objetivo no era convertir ese HTML, sino
**recrear su lenguaje visual** como base de un editor real. El deck original
**no se modifica**; se usa como referencia y como fuente del importador.

## Decisiones clave

### Python backend + frontend web (no toolkit nativo)
Los slides *son* HTML/CSS y las funciones críticas (animación letra por letra,
transiciones, presentación fullscreen) son nativas del navegador. Un toolkit
nativo (Qt/Tk) habría perdido fidelidad y multiplicado el trabajo. Python queda
como backend/lógica (modelo, validación, persistencia, importador, punto de
extensión para exportación).

### Vanilla JS sin build
Evita dependencias y toolchain (npm/webpack). Mantiene el proyecto
Python-céntrico y de arranque inmediato. La modularidad se logra con ES modules.

### Coordenadas de diseño + escala visual
El modelo guarda posiciones en el espacio 1920×1080. El canvas solo escala con
`transform: scale()`. Así las posiciones son estables y portables entre pantallas
y en la presentación.

### El importador usa un tipo de elemento `html`
Descomponer los layouts flex/grid arbitrarios del deck en elementos posicionados
sería frágil. En su lugar, cada `<section>` se conserva íntegra como un elemento
`html` a pantalla completa → fidelidad 1:1 inmediata. `html` es un tipo de
elemento legítimo del esquema; un futuro "descomponer" podría dividirlo. Los
slides **nuevos** se crean con elementos posicionados (text/image/rect/line/bg).

### Validación como contrato
Pydantic valida al cargar y guardar. Un `project.json` inválido falla de forma
explícita, protegiendo de datos corruptos y documentando el formato.

## Desarrollo por fases

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | Arquitectura, ventana/UI, 3 paneles, modelo de datos | ✅ |
| 2 | Crear/eliminar/duplicar/reordenar slides, guardar/cargar | ✅ |
| 3 | Elementos: texto, imagen, formas, fondo (+ bloque HTML) | ✅ |
| 4 | Animaciones: entrada/salida, por elemento/palabra/letra | ✅ (motor funcional) |
| 5 | Transiciones entre slides, timeline, modo presentación | ✅ (transiciones, presentación y **timeline visual** listos) |
| 6 | Pulido: UX, rendimiento, errores, persistencia | ◐ (en curso) |

## Correcciones notables

- **Auto-ajuste al maximizar:** el reajuste dependía solo de `window.resize`,
  que no siempre se emite (p. ej. en ciertas ventanas embebidas). Se añadió un
  `ResizeObserver` sobre el área del canvas, con `window.resize` como respaldo.
- **Disparo de animaciones:** se sustituyó `requestAnimationFrame` por un reflow
  forzado (`void node.offsetWidth`) para que la previsualización sea inmediata y
  no dependa del ciclo de composición.
- **Escalado de miniaturas y primer ajuste:** se hacen con medición síncrona
  (forzando reflow) en lugar de depender de callbacks diferidos.
- **Escala del timeline al redimensionar:** el timeline no recalculaba su escala
  `pxPerSec` al cambiar el ancho disponible (abrir/cerrar el dock, redimensionar
  la ventana), dejando las barras a una escala obsoleta. Se añadió un
  `ResizeObserver` sobre el cuerpo del timeline (mismo patrón que el canvas), que
  reconstruye solo si el ancho cambió. Además, el eje se escala al segundo entero
  superior para que las marcas de tiempo encajen exactas dentro del track.
- **Sincronía de campos de animación:** los campos de animación del panel de
  propiedades se enlazaban contra el objeto `animation` (`data-bind="delay"`),
  pero `refreshValues()` resuelve los binds contra el elemento, por lo que nunca
  se refrescaban en vivo. Se pasaron a ruta relativa al elemento
  (`animation.delay`), que funciona en ambos sentidos: editar desde el timeline
  actualiza el panel y viceversa.

## Pendiente / desacoplado a propósito

- **Exportación adicional** (imágenes / vídeo): ya están disponibles la
  exportación a **PDF** (`frontend/js/export/pdf.js`, vía impresión del
  navegador) y a **HTML autónomo** (`frontend/js/export/html.js`, un único
  `.html` reproducible o como documento estático). Los formatos restantes
  (imágenes por slide, vídeo) requerirían render de servidor; un
  `backend/app/export/` es el punto de extensión previsto. No implementados aún.
- **Transiciones avanzadas**: `wipe` real, máscaras y efectos 3D.
