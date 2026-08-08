# 1 · Arquitectura

## Visión general

Slide Studio separa con claridad **datos**, **lógica** e **interfaz**:

```
┌──────────────────────────── Navegador / Ventana pywebview ───────────────────────────┐
│  Frontend (HTML/CSS/JS vanilla, ES modules)                                           │
│  ┌───────────┐   ┌──────────────────────────┐   ┌───────────────┐                     │
│  │  Slides   │   │        Canvas            │   │  Propiedades  │   Toolbar / Present  │
│  │ (rail)    │   │  (1920×1080 escalado)    │   │  (por tipo)   │                     │
│  └───────────┘   └──────────────────────────┘   └───────────────┘                     │
│         store.js  ·  api.js  ·  renderer  ·  anim  ·  present                          │
└───────────────────────────────────────────┬──────────────────────────────────────────┘
                                             │  HTTP JSON (fetch)
┌────────────────────────────────────────────▼─────────────────────────────────────────┐
│  Backend (FastAPI)                                                                     │
│   routes/projects.py · routes/assets.py   ← API REST                                   │
│   models.py  ← esquema Pydantic (contrato)                                             │
│   storage.py ← persistencia en disco (project.json + assets/)                          │
│   importer/deck_html.py ← deck HTML original → modelo                                  │
└────────────────────────────────────────────┬─────────────────────────────────────────┘
                                             │
                                    projects/<slug>/project.json  +  assets/
```

**Regla de oro:** el frontend nunca toca el disco. Toda lectura/escritura pasa
por la API. Esto mantiene un único punto de validación (Pydantic) y facilita
sustituir el almacenamiento en el futuro.

## Capas y responsabilidades

| Capa | Archivo(s) | Responsabilidad |
|------|-----------|-----------------|
| **Modelo de datos** | `backend/app/models.py` | Define qué es un proyecto/slide/elemento/animación/transición. Es el *contrato*. |
| **Persistencia** | `backend/app/storage.py` | Único módulo que toca el sistema de archivos. Escritura atómica. |
| **API REST** | `backend/app/routes/` | Expone CRUD de proyectos, slides y assets. |
| **Importador** | `backend/app/importer/deck_html.py` | Convierte el deck HTML original al modelo. |
| **Arranque** | `backend/app/main.py`, `run.py` | Monta la app, siembra el ejemplo, lanza navegador o ventana. |
| **Estado (cliente)** | `frontend/js/store.js` | Única fuente de verdad + observer + undo/redo. |
| **Render** | `frontend/js/renderer/` | Convierte el modelo a DOM (por tipo de elemento). |
| **Editor** | `frontend/js/editor/` | Canvas, panel de slides, propiedades, toolbar. |
| **Animación** | `frontend/js/anim/` | Motor CSS declarativo (incl. letra por letra). |
| **Presentación** | `frontend/js/present/` | Reproducción fullscreen con transiciones. |

## Flujo de datos (un ciclo completo)

```
Insertar texto        → toolbar.js crea el modelo (model.js) y lo añade vía store.mutate
   ↓
Guardar               → api.saveProject() → PUT /api/projects/{slug} → Pydantic valida → storage escribe
   ↓
Cargar                → api.getProject()  → GET → Pydantic valida → store.setProject()
   ↓
Editar                → propertiesPanel enlaza campos ↔ modelo; canvas re-renderiza
   ↓
Animar                → anim/animations.js aplica keyframes por elemento/letra
   ↓
Presentar             → present.js reproduce transiciones + animaciones a pantalla completa
```

Ningún componente queda aislado: cada acción viaja por el mismo `store` y el
mismo modelo, de principio a fin.

## Principio de extensibilidad

El **sistema de elementos es abierto**. Añadir un tipo nuevo (p. ej. `video`)
toca exactamente tres puntos y nada más del núcleo:

1. Un modelo en `models.py` (subclase de `BaseElement`).
2. Un renderer en `frontend/js/renderer/elements.js`.
3. Campos de edición en `frontend/js/editor/propertiesPanel.js`.

Ver detalles en [08 · Desarrollo y extensión](08-desarrollo.md).
