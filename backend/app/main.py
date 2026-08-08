"""Aplicación FastAPI: API REST + servido de los estáticos del frontend.

Al arrancar, siembra (una sola vez) el proyecto de ejemplo importando el deck
HTML original. El frontend vanilla se sirve desde slide-studio/frontend.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.types import Scope

from . import config, storage
from .importer.deck_html import import_source_deck
from .routes import assets, projects

log = logging.getLogger("slide_studio")


class NoCacheStaticFiles(StaticFiles):
    """Sirve el frontend sin caché del navegador.

    Es una app local en desarrollo activo: el usuario debe recibir siempre el
    HTML/CSS/JS más reciente sin tener que forzar recargas. Se evita el 304 por
    ETag marcando las respuestas como no cacheables.
    """

    def is_not_modified(self, response_headers, request_headers) -> bool:  # type: ignore[override]
        return False  # nunca responder 304

    async def get_response(self, path: str, scope: Scope):
        response = await super().get_response(path, scope)
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

app = FastAPI(title="Slide Studio", version="0.1.0")

app.include_router(projects.router)
app.include_router(assets.router)


@app.on_event("startup")
def _startup() -> None:
    config.ensure_dirs()
    _seed_sample_project()


def _seed_sample_project() -> None:
    """Importa el deck original como proyecto de ejemplo si aún no existe."""
    slug = "tutorial-deshabilitar-root"
    if storage.exists(slug):
        return
    if not config.SOURCE_DECK_HTML.is_file():
        log.warning("Deck fuente no encontrado en %s; se omite el seed.", config.SOURCE_DECK_HTML)
        return
    try:
        project = import_source_deck(config.SOURCE_DECK_HTML)
        storage.save_project(slug, project)
        storage.assets_dir(slug)
        log.info("Proyecto de ejemplo importado: %s (%d slides)", slug, len(project.slides))
    except Exception as exc:  # el seed nunca debe impedir el arranque
        log.exception("No se pudo importar el deck de ejemplo: %s", exc)


@app.get("/api/health")
def health():
    return {"ok": True, "version": app.version}


# El frontend estático se monta al final para no ensombrecer /api/*.
if config.FRONTEND_DIR.is_dir():
    app.mount("/", NoCacheStaticFiles(directory=str(config.FRONTEND_DIR), html=True), name="frontend")
