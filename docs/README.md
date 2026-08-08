# Documentación de Slide Studio

Slide Studio es un **editor de presentaciones por slides** hecho en Python
(FastAPI) con un frontend web vanilla. Recrea el lenguaje visual del deck HTML
original (IBM Plex, paleta oscura) como base para crear, editar, previsualizar y
presentar tus propias presentaciones.

Esta carpeta documenta el proyecto **desde la implementación hasta el uso diario**.

## Índice

| # | Documento | Para quién |
|---|-----------|-----------|
| 1 | [Arquitectura](01-arquitectura.md) | Entender cómo encaja todo |
| 2 | [Modelo de datos](02-modelo-de-datos.md) | El esquema `project.json` |
| 3 | [Backend y API](03-backend-api.md) | Endpoints REST y persistencia |
| 4 | [Frontend](04-frontend.md) | Módulos JS del editor |
| 5 | [Animaciones y transiciones](05-animaciones-y-transiciones.md) | El motor de animación (incl. letra por letra) |
| 6 | [Notas de implementación](06-implementacion.md) | Decisiones de diseño y fases |
| 7 | [Guía de uso](07-guia-de-uso.md) | **Usuario final: empieza aquí** |
| 8 | [Desarrollo y extensión](08-desarrollo.md) | Añadir tipos de elemento, correr, depurar |

## Arranque rápido

Requiere [uv](https://docs.astral.sh/uv/).

```bash
cd slide-studio/backend
uv sync                                  # crea .venv e instala dependencias
uv run python run.py                     # navegador → http://127.0.0.1:8000
uv run python run.py --window            # ventana de escritorio (pywebview)
```

Al primer arranque se importa el deck original como proyecto de ejemplo.

## Estado del proyecto

- **Fases 1–3 completas:** editor de 3 paneles, CRUD/duplicar/reordenar slides,
  elementos (texto, título, imagen, formas, fondo, bloque HTML), edición visual,
  guardar/cargar, animaciones (incl. letra por letra) y modo presentación.
- **Pendiente (fases 4–6):** timeline visual, transiciones avanzadas y
  exportación (HTML/PDF/imágenes/vídeo). La arquitectura ya deja estos puntos
  desacoplados del núcleo.
