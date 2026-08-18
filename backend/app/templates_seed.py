"""Plantillas de sistema.

Siembra (idempotente) las plantillas iniciales en `templates/`:
  - `por-defecto`: el diseño del ejemplo (importado del deck original si está
    disponible; si no, del proyecto de ejemplo existente; si no, un deck mínimo).
  - `portada-minimal` y `secciones`: dos variantes construidas con el mismo
    lenguaje visual (IBM Plex, oscuro) usando elementos posicionados para que
    sean fáciles de editar.

Las plantillas de sistema se marcan con `.system` (ver storage) y no son
borrables desde la UI.
"""
from __future__ import annotations

import logging

from . import config, storage
from .importer.deck_html import import_source_deck
from .models import (
    Animation,
    BackgroundElement,
    Project,
    RectElement,
    Slide,
    TextElement,
)

log = logging.getLogger("slide_studio")

SANS = "'IBM Plex Sans', sans-serif"
MONO = "'IBM Plex Mono', monospace"


def _text(content, x, y, w, h, size, *, weight=400, color="var(--ink)",
          role="body", align="left", family=SANS, ls=0, anim=None) -> TextElement:
    el = TextElement(
        content=content, x=x, y=y, w=w, h=h,
        fontSize=size, fontWeight=weight, color=color, role=role,
        align=align, fontFamily=family, letterSpacing=ls,
    )
    if anim is not None:
        el.animation = anim
    return el


def _bg(color="var(--bg)") -> BackgroundElement:
    return BackgroundElement(color=color)


def _in(kind, delay=0.0, dur=0.5, apply="element"):
    return Animation(type=kind, direction="in", duration=dur, delay=delay, applyTo=apply)


# ─────────────────────────────── Variantes ───────────────────────────────────

def _build_portada_minimal() -> Project:
    cover = Slide(name="Portada", elements=[
        _bg(),
        _text("PRESENTACIÓN", 140, 380, 900, 48, 28, weight=600, color="var(--amber)",
              role="label", family=MONO, ls=4, anim=_in("fadeIn")),
        _text("Título de la presentación", 140, 436, 1560, 200, 96, weight=700,
              role="title", anim=_in("slideInBottom", delay=0.1)),
        _text("Subtítulo o autor · fecha", 140, 660, 1300, 80, 40, color="var(--muted)",
              role="subtitle", anim=_in("fadeIn", delay=0.25)),
    ])
    content = Slide(name="Contenido", elements=[
        _bg(),
        _text("Sección", 140, 150, 1500, 110, 60, weight=700, role="title",
              anim=_in("fadeIn")),
        _text("• Primer punto de la idea\n• Segundo punto a desarrollar\n"
              "• Tercer punto de cierre", 140, 330, 1500, 520, 38, role="body",
              anim=_in("slideInBottom", delay=0.1)),
    ])
    closing = Slide(name="Cierre", elements=[
        _bg(),
        _text("Gracias", 0, 440, 1920, 200, 130, weight=700, role="title",
              align="center", anim=_in("zoom")),
    ])
    return Project(name="Portada minimal", slides=[cover, content, closing])


def _build_secciones() -> Project:
    cover = Slide(name="Portada", elements=[
        _bg(),
        _text("INFORME", 140, 360, 700, 48, 28, weight=600, color="var(--blue)",
              role="label", family=MONO, ls=4, anim=_in("fadeIn")),
        _text("Título del informe", 140, 420, 1560, 170, 88, weight=700, role="title",
              anim=_in("slideInLeft", delay=0.1)),
        _text("Subtítulo descriptivo", 140, 610, 1300, 70, 38, color="var(--muted)",
              role="subtitle", anim=_in("fadeIn", delay=0.25)),
    ])
    divider = Slide(name="Sección 01", elements=[
        _bg(),
        RectElement(x=0, y=470, w=1920, h=170, fill="var(--panel)",
                    stroke="var(--line)", strokeWidth=0, radius=0),
        _text("01", 140, 300, 320, 200, 150, weight=700, color="var(--amber)",
              family=MONO, anim=_in("fadeIn")),
        _text("Nombre de la sección", 140, 505, 1560, 110, 64, weight=700,
              role="title", anim=_in("slideInLeft", delay=0.1)),
    ])
    two_col = Slide(name="Contenido", elements=[
        _bg(),
        _text("Tema", 140, 150, 1500, 110, 60, weight=700, role="title",
              anim=_in("fadeIn")),
        _text("Columna izquierda: describe aquí la primera parte de la idea con el "
              "detalle necesario.", 140, 340, 760, 520, 32, role="body",
              anim=_in("slideInLeft", delay=0.1)),
        _text("Columna derecha: complementa con la segunda parte, datos o "
              "conclusiones.", 1020, 340, 760, 520, 32, role="body",
              anim=_in("slideInRight", delay=0.1)),
    ])
    return Project(name="Secciones", slides=[cover, divider, two_col])


def _build_minimal_default() -> Project:
    cover = Slide(name="Portada", elements=[
        _bg(),
        _text("Nueva presentación", 140, 440, 1560, 200, 96, weight=700, role="title",
              anim=_in("fadeIn")),
        _text("Empieza a editar", 140, 660, 1200, 80, 40, color="var(--muted)",
              role="subtitle", anim=_in("fadeIn", delay=0.2)),
    ])
    return Project(name="Por defecto", slides=[cover])


def _build_default() -> Project:
    """Plantilla por defecto = diseño del ejemplo, por orden de disponibilidad."""
    try:
        if config.SOURCE_DECK_HTML.is_file():
            p = import_source_deck(config.SOURCE_DECK_HTML)
            p.name = "Por defecto (Tutorial root)"
            return p
    except Exception:
        log.exception("No se pudo importar el deck fuente para la plantilla por defecto")
    try:
        if storage.exists("tutorial-deshabilitar-root"):
            p = storage.load_project("tutorial-deshabilitar-root")
            p.name = "Por defecto (Tutorial root)"
            return p
    except Exception:
        log.exception("No se pudo cargar el proyecto de ejemplo para la plantilla por defecto")
    return _build_minimal_default()


# ─────────────────────────────── Siembra ─────────────────────────────────────

SYSTEM_TEMPLATES = [
    ("por-defecto", _build_default),
    ("portada-minimal", _build_portada_minimal),
    ("secciones", _build_secciones),
]


def seed_system_templates() -> None:
    """Crea las plantillas de sistema que falten (idempotente)."""
    config.ensure_dirs()
    for slug, builder in SYSTEM_TEMPLATES:
        if storage.template_exists(slug):
            continue
        try:
            project = builder()
            storage.save_template(slug, project, system=True)
            log.info("Plantilla de sistema creada: %s (%d slides)", slug, len(project.slides))
        except Exception as exc:  # el seed nunca debe impedir el arranque
            log.exception("No se pudo crear la plantilla de sistema %s: %s", slug, exc)
