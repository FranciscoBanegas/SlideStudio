# Slide Studio

Editor de presentaciones por slides construido en **Python (FastAPI)** con un
frontend **HTML/CSS/JS vanilla**. Recrea el lenguaje visual del deck original
(IBM Plex, paleta oscura, componentes `.sd/.cmd/.cap/…`) como base para crear,
editar, previsualizar y presentar tus propias presentaciones.

## Requisitos

- [uv](https://docs.astral.sh/uv/) (gestor de entornos y dependencias)
- Python 3.10+ (uv puede instalarlo por ti)

## Instalación

```bash
cd slide-studio/backend
uv sync                  # crea .venv e instala dependencias desde pyproject.toml
```

## Ejecutar

```bash
uv run python run.py            # abre en el navegador → http://127.0.0.1:8000
uv run python run.py --window   # ventana de escritorio (pywebview)
```

Al primer arranque se importa automáticamente el deck original
("Tutorial · Deshabilitar login de root") como proyecto de ejemplo.

## Arquitectura

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| Modelo de datos | `backend/app/models.py` | Esquema Pydantic (Project/Slide/Element/Animation/Transition/Theme), versionado |
| Persistencia | `backend/app/storage.py` | `projects/<slug>/project.json` + `assets/` |
| API REST | `backend/app/routes/` | CRUD de proyectos, slides y assets |
| Importador | `backend/app/importer/deck_html.py` | Deck HTML original → modelo |
| Interfaz | `frontend/` | Editor de 3 paneles (vanilla JS, ES modules) |

El frontend nunca toca disco: todo pasa por la API. El sistema de elementos es
abierto — un tipo nuevo = modelo en `models.py` + renderer en
`frontend/js/renderer/elements.js` + campos en `propertiesPanel.js`.

## Estado (Fases 1–3)

Implementado: editor de 3 paneles, CRUD/duplicar/reordenar slides, elementos
(texto, título, imagen, rectángulo, línea, fondo, bloque HTML), edición visual
con arrastre/redimensión, panel de propiedades, guardar/cargar, animaciones
(incluida **letra por letra**), modo presentación con transiciones,
duplicar/eliminar presentaciones y **exportación a PDF**.

Pendiente (fases siguientes): timeline visual, transiciones avanzadas, y otros
formatos de exportación (HTML/imágenes/vídeo) — la lógica queda separada
(`frontend/js/export/`) para incorporarse sin tocar el core.

## Documentación

Documentación completa en [`docs/`](docs/README.md): arquitectura, modelo de
datos, API, frontend, animaciones, notas de implementación, **guía de uso** y
guía de desarrollo/extensión.

## Atajos

| Tecla | Acción |
|-------|--------|
| ⌘/Ctrl+S | Guardar |
| ⌘/Ctrl+Z · Ctrl+Y | Deshacer · Rehacer |
| Supr / Retroceso | Eliminar elemento |
| Flechas (+Shift) | Mover elemento 1px (10px) |
| ▶ Presentar · ← → Espacio · ESC | Presentación |

## Licencia

Distribuido bajo licencia [MIT](LICENSE). Uso libre, incluido comercial, citando
la autoría.
