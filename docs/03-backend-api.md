# 3 · Backend y API

FastAPI expone una API REST y sirve el frontend estático. La documentación
interactiva (Swagger) está disponible en `http://127.0.0.1:8000/docs` al
ejecutar la app.

## Endpoints

### Proyectos — `routes/projects.py`

| Método | Ruta | Cuerpo | Respuesta |
|--------|------|--------|-----------|
| `GET` | `/api/projects` | — | Lista de `ProjectSummary` (slug, nombre, nº slides, tamaño) |
| `POST` | `/api/projects` | `{ "name": "..." }` | `{ "slug": "..." }` |
| `POST` | `/api/projects/{slug}/duplicate` | `{ "name"?: "..." }` | `{ "slug": "..." }` (copia completa: manifiesto + assets, id nuevo) |
| `GET` | `/api/projects/{slug}` | — | `Project` completo |
| `PUT` | `/api/projects/{slug}` | `Project` | `{ "ok": true }` (valida con Pydantic) |
| `DELETE` | `/api/projects/{slug}` | — | `{ "ok": true }` |
| `POST` | `/api/projects/{slug}/slides/duplicate` | `{ "slideId": "..." }` | `Project` actualizado |

### Assets — `routes/assets.py`

| Método | Ruta | Notas |
|--------|------|-------|
| `POST` | `/api/projects/{slug}/assets` | `multipart/form-data` con campo `file`. Devuelve `{ src, url }`. |
| `GET` | `/api/projects/{slug}/assets/{filename}` | Sirve el archivo. Nombre saneado contra path traversal. |

### Utilidad

| Método | Ruta | Notas |
|--------|------|-------|
| `GET` | `/api/health` | `{ ok, version }` |
| `GET` | `/` (y estáticos) | Sirve `frontend/` |

## Persistencia — `storage.py`

Es la **única** capa que toca disco. Funciones clave:

- `list_projects()` → resúmenes ligeros (no carga todos los slides).
- `load_project(slug)` → valida el JSON contra el esquema Pydantic.
- `save_project(slug, project)` → escritura **atómica** (temp + rename).
- `create_project(name)` → genera slug único, crea `assets/`.
- `delete_project(slug)`, `assets_dir(slug)`, `slugify(name)`.

Defensa contra *path traversal*: los slugs no pueden contener `/`, `\` ni `..`.

## Validación como contrato

Cargar y guardar pasan por `Project.model_validate(...)`. Un `project.json` con
un campo de tipo incorrecto **falla al cargar** con `ValidationError` — esto es
intencional: el esquema es el contrato y protege de datos corruptos.

## Importador — `importer/deck_html.py`

Convierte el deck HTML original en un `Project`:

1. Localiza cada `<section>` de nivel superior con `html.parser` (stdlib).
2. Extrae `data-label` (nombre) y `data-speaker-notes` (notas).
3. Envuelve el marcado íntegro de la sección en un elemento `html` a pantalla
   completa → **fidelidad 1:1** con el deck original.
4. Asigna una animación de entrada `fadeIn` por defecto a cada slide.

Se ejecuta una sola vez al arrancar (en `main.py`), sembrando el proyecto de
ejemplo `tutorial-deshabilitar-root` si no existe.

## Arranque — `run.py`

```bash
uv run python run.py            # navegador: uvicorn en 127.0.0.1:8000
uv run python run.py --window   # ventana pywebview con el mismo backend en un hilo
```

Variables de entorno: `SLIDE_STUDIO_HOST`, `SLIDE_STUDIO_PORT`.
