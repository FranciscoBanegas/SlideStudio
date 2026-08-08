# 2 · Modelo de datos

El esquema vive en [`backend/app/models.py`](../backend/app/models.py) (Pydantic
v2) y se refleja en el cliente en
[`frontend/js/model.js`](../frontend/js/model.js). El campo `schemaVersion`
permite evolucionar el formato sin romper proyectos antiguos.

## Jerarquía

```
Project
├── theme        (Theme)            tokens de diseño heredados del deck
├── defaultTransition (Transition)  transición global por defecto
└── slides[]     (Slide)
    ├── transitionIn / transitionOut (Transition)
    └── elements[] (Element)        unión discriminada por `type`
        ├── TextElement
        ├── ImageElement
        ├── RectElement
        ├── LineElement
        ├── BackgroundElement
        └── HtmlElement
            └── animation (Animation)
```

## Entidades

### Project
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | str | `proj-xxxxxxxx` |
| `schemaVersion` | int | Versión del esquema (actual: 1) |
| `name` | str | Nombre visible |
| `width`, `height` | int | Resolución base (por defecto 1920×1080) |
| `theme` | Theme | Colores, fuentes, escala tipográfica |
| `defaultTransition` | Transition | Transición global |
| `slides` | Slide[] | Lista ordenada |

### Slide
| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | str | `slide-xxxxxxxx` |
| `name` | str | Etiqueta (se muestra en el rail) |
| `background` | str | Color/gradiente de fondo |
| `transitionIn` / `transitionOut` | Transition | Al entrar/salir |
| `speakerNotes` | str | Notas del ponente |
| `elements` | Element[] | Ordenados; se pintan por `z` |

### Element (base común)
Todo elemento comparte: `id`, `type`, `x`, `y`, `w`, `h`, `rotation`,
`opacity`, `z`, `locked`, `animation`. **Las coordenadas están en el espacio de
diseño** (1920×1080), no en píxeles de pantalla — el canvas las escala al
mostrar.

Campos propios por tipo:

- **text** — `content`, `role` (title/subtitle/body/label), `fontFamily`,
  `fontSize`, `fontWeight`, `color`, `align`, `lineHeight`, `letterSpacing`.
- **image** — `src` (ruta relativa en `assets/`), `fit`, `radius`.
- **rect** — `fill`, `stroke`, `strokeWidth`, `radius`.
- **line** — `stroke`, `strokeWidth`.
- **background** — `color`, `gradient` (si existe, prima sobre `color`).
- **html** — `markup` (bloque de marcado crudo; lo usa el importador).

### Animation
`type` · `applyTo` (element/letter/word/line) · `duration` · `delay` ·
`stagger` (retardo entre unidades) · `easing` · `direction` (in/out).
Ver [05 · Animaciones](05-animaciones-y-transiciones.md).

### Transition
`type` (fade/slideH/slideV/zoom/blur/scale/push/wipe) · `duration` · `easing`.

## Ejemplo de `project.json`

```json
{
  "id": "proj-1a2b3c4d",
  "schemaVersion": 1,
  "name": "Mi presentación",
  "width": 1920,
  "height": 1080,
  "theme": { "colors": { "bg": "#0e1116", "ink": "#e7eaf0", "green": "#5cd48a" } },
  "defaultTransition": { "type": "fade", "duration": 0.5, "easing": "ease" },
  "slides": [
    {
      "id": "slide-aa11",
      "name": "Portada",
      "background": "var(--bg)",
      "transitionIn": { "type": "fade", "duration": 0.5, "easing": "ease" },
      "speakerNotes": "",
      "elements": [
        {
          "id": "el-77aa",
          "type": "text",
          "x": 200, "y": 400, "w": 1200, "h": 90,
          "opacity": 1, "z": 0,
          "content": "Hola mundo",
          "role": "title",
          "fontFamily": "'IBM Plex Sans', sans-serif",
          "fontSize": 60, "fontWeight": 700,
          "color": "var(--ink)", "align": "left",
          "animation": {
            "type": "fadeIn", "applyTo": "letter",
            "duration": 0.4, "delay": 0, "stagger": 0.05,
            "easing": "ease-out", "direction": "in"
          }
        }
      ]
    }
  ]
}
```

## Almacenamiento en disco

```
projects/
└── <slug>/
    ├── project.json      ← manifiesto (validado por Pydantic al cargar y guardar)
    └── assets/           ← imágenes subidas, referenciadas por ruta relativa
```

El `slug` se deriva del nombre y es seguro para el sistema de archivos. La
escritura es **atómica** (se escribe a un temporal y se renombra) para evitar
manifiestos corruptos.
