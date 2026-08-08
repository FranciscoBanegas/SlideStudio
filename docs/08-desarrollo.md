# 8 · Desarrollo y extensión

Guía para ejecutar, depurar y ampliar Slide Studio.

## Requisitos e instalación

- [uv](https://docs.astral.sh/uv/) (gestor de entornos/dependencias).
- Python 3.10+ (uv puede instalarlo: `uv python install 3.12`).
- Dependencias declaradas en `backend/pyproject.toml`:
  `fastapi`, `uvicorn[standard]`, `pydantic>=2`, `python-multipart`, y para la
  ventana de escritorio `pywebview` + `pyside6` + `qtpy` (backend Qt
  autocontenido y multiplataforma).

```bash
cd slide-studio/backend
uv sync                 # crea .venv, resuelve e instala; genera/usa uv.lock
```

`uv sync` es reproducible: `uv.lock` fija las versiones exactas. Para añadir una
dependencia nueva: `uv add <paquete>` (actualiza pyproject.toml y el lock).

## Ejecutar

```bash
uv run python run.py            # navegador (uvicorn en 127.0.0.1:8000)
uv run python run.py --window   # ventana de escritorio (pywebview)
```

`uv run` usa automáticamente el entorno del proyecto (no hace falta activar el
`.venv` manualmente). Para abrir un shell con el entorno activo:
`source .venv/bin/activate`.

- Recarga en caliente del frontend: basta con **recargar el navegador** (los JS
  son módulos servidos como estáticos, sin build).
- Cambios en el backend: reinicia `run.py`.
- API interactiva: `http://127.0.0.1:8000/docs`.

## Estructura

```
slide-studio/
├── backend/app/       modelo, storage, rutas, importador, main
├── backend/run.py     lanzador
├── frontend/          index.html, css/, js/
├── projects/          proyectos del usuario (project.json + assets)
└── docs/              esta documentación
```

## Añadir un tipo de elemento nuevo (ejemplo: `video`)

El sistema de elementos es abierto. Toca **tres** puntos:

**1. Modelo** — en `backend/app/models.py`:

```python
class VideoElement(BaseElement):
    type: Literal["video"] = "video"
    src: str = ""
    autoplay: bool = False

# añadir a la unión y al Literal ElementType:
ElementType = Literal["text", "image", "rect", "line", "background", "html", "video"]
Element = Union[..., VideoElement]
```

**2. Renderer** — en `frontend/js/renderer/elements.js`, añade una entrada al
objeto `renderers`:

```js
video(el) {
  const n = document.createElement('video');
  applyBox(n, el);
  n.src = api.assetUrl(store.slug, el.src);
  if (el.autoplay) n.autoplay = true;
  n.setAttribute('data-anim-self', '');
  return n;
}
```

Y en `frontend/js/model.js`, un caso en `makeElement()` con sus defaults.

**3. Propiedades** — en `frontend/js/editor/propertiesPanel.js`, un bloque
`else if (el.type === 'video')` con los campos a editar.

Nada más del núcleo (store, canvas, persistencia, presentación) necesita cambios.

## Añadir un tipo de animación

En `frontend/js/anim/animations.js`:

1. Añade el `@keyframes` a la constante `KEYFRAMES`.
2. Mapea su nombre en el objeto `NAME`.
3. Añade el literal a `ANIMATION_TYPES` en `frontend/js/model.js` y al
   `Literal AnimationType` en `backend/app/models.py`.

## Convenciones

- **El frontend nunca toca disco**: todo pasa por `api.js` → API.
- **No mutar el proyecto directamente**: usar `store.mutate(fn)` para que entren
  en juego el historial (undo/redo) y los eventos.
- **Coordenadas en espacio de diseño** (1920×1080), nunca en píxeles de pantalla.
- Mantener sincronizados `models.py` (backend) y `model.js` (frontend) al tocar
  el esquema.

## Depuración

- Errores de backend: consola donde corre `run.py`.
- Errores de frontend: consola del navegador (F12).
- Validación de datos: si un `project.json` no carga, revisa el
  `ValidationError` — indica el campo y el tipo esperado.

## Trabajo futuro (desacoplado del núcleo)

- **Timeline visual** (`frontend/js/editor/`): UI sobre los `delay`/`stagger`
  que ya guarda el modelo.
- **Exportación**: crear `backend/app/export/` con backends independientes
  (HTML autónomo, PDF, imágenes, vídeo) que consuman el modelo sin acoplarse al
  editor. Exponer endpoints `POST /api/projects/{slug}/export/{formato}`.
