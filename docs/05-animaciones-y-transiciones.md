# 5 · Animaciones y transiciones

El motor vive en
[`frontend/js/anim/animations.js`](../frontend/js/anim/animations.js). Es
**declarativo por CSS**, siguiendo el mismo patrón del deck original: el estado
final visible es la base, y la animación se **dispara** al presentar/previsualizar.

## Animaciones de elemento

Cada tipo corresponde a un `@keyframes` inyectado una sola vez en el documento:

| Tipo | Efecto |
|------|--------|
| `fadeIn` / `fadeOut` | Opacidad |
| `slideInLeft` / `Right` / `Top` / `Bottom` | Desplazamiento + opacidad |
| `scaleIn` | Escala desde 0.86 |
| `zoom` | Escala desde 1.25 |
| `blurIn` | Desenfoque → nítido |
| `bounce` | Rebote de entrada |
| `typewriter` | Máquina de escribir (carácter a carácter) |

Parámetros configurables por elemento (`Animation`):

```
Tipo:      fadeIn
Aplicar a: ● Cada letra   ○ Elemento   ○ Cada palabra   ○ Cada línea
Duración:  0.4 s
Delay:     0.0 s   (antes de empezar)
Stagger:   0.05 s  (retardo entre unidades)
Easing:    ease-out
Dirección: entrada / salida
```

## Animación por letra / palabra / línea

Es la característica especial. Cuando `applyTo` es `letter`, `word` o `line`, el
motor **parte el texto** en unidades envueltas en `<span>` y aplica un retardo
escalonado a cada una:

```
delay(unidad i) = delay_base + i × stagger
```

Resultado (fade in por letra de "Hello"):

```
t=0.00s   H
t=0.05s   He
t=0.10s   Hel
t=0.15s   Hell
t=0.20s   Hello
```

Detalles de implementación:

- `splitInto(node, unit)` guarda el texto original en `data-plain` y crea los
  spans (`.ss-unit`), preservando espacios.
- Cada span recibe `animation: <keyframe> <dur> <easing> <delay> both`.
- `typewriter` es un caso aparte: revela un carácter cada `stagger` segundos con
  `setTimeout`.
- `restorePlain(node)` / `clearElement(node)` devuelven el texto a su estado
  editable.

El disparo se hace con un **reflow forzado** (`void node.offsetWidth`) en lugar
de `requestAnimationFrame`, para que la previsualización sea inmediata y fiable
en cualquier contexto (navegador o ventana embebida).

## Transiciones entre slides

Configurables por slide (`transitionIn` / `transitionOut`) y con un valor global
por defecto (`project.defaultTransition`):

| Tipo | Efecto de entrada |
|------|-------------------|
| `fade` | Opacidad 0 → 1 |
| `slideH` / `slideV` / `push` | Desplazamiento horizontal/vertical |
| `zoom` | Desde escala 1.15 |
| `scale` | Desde escala 0.9 |
| `blur` | Desde desenfoque |
| `wipe` | (base: fade; ampliable) |

En [`present.js`](../frontend/js/present/present.js), al pasar de slide se fija
el estado inicial de la transición, se fuerza un reflow y se anima al estado
final con `transition`. Las animaciones de los elementos del slide entrante se
disparan a continuación (tras ~60 % de la transición) para encadenar el efecto.

## Cómo se conecta todo

```
propertiesPanel  → edita el objeto Animation del elemento (persiste en project.json)
      ↓
timeline         → misma edición en una vista temporal (arrastrar barra = delay,
                   borde = duración); comparte la fuente de verdad del store
      ↓
▶ Previsualizar  → main.previewAnimation() reproduce un elemento en el canvas
▶ Reproducir slide → main.playSlide() encadena todas las animaciones del slide
      ↓
▶ Presentar      → present.js reproduce transición + animaciones a pantalla completa
```

## Timeline visual

El dock inferior ([`frontend/js/editor/timeline.js`](../frontend/js/editor/timeline.js))
muestra una **pista por elemento** del slide activo sobre un eje temporal común.
Cada barra representa `delay → delay+duration`; para animaciones por
letra/palabra/línea añade una **cola de stagger** que estima el fin total
(`delay + (n−1)·stagger + duration`, con `n` derivado del contenido del texto).

Interacciones (mismo patrón de arrastre que el canvas: snapshot al empezar, un
solo paso de historial por gesto):

- **Arrastrar la barra** → cambia `delay`.
- **Arrastrar su borde derecho** → cambia `duration`.
- **Clic en una fila** → selecciona el elemento.
- **▶ Reproducir slide** → dispara todas las animaciones encadenadas en el canvas.

Edita el mismo objeto `Animation` que el panel de propiedades (única fuente de
verdad en el store), por lo que ambos se mantienen en sincronía. La escala se
recalcula al redimensionar mediante un `ResizeObserver`, igual que el canvas.

## Roadmap

- Transiciones avanzadas (`wipe` real, máscaras, 3D).
