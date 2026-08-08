"""Importa el deck HTML original a un `Project`.

El deck fuente (`Tutorial Deshabilitar Root.dc.html`) es una lista plana de
`<section class="sd">…</section>` dentro de `<x-import width height>`. Cada
sección usa layouts flex/grid propios con estilos inline; descomponerlos en
elementos posicionados sería frágil, así que cada sección se conserva íntegra
como un elemento `html` a pantalla completa. Esto da fidelidad 1:1 inmediata y
mantiene el deck como referencia visual viva dentro del editor.

Parser: `html.parser` (stdlib) para localizar las secciones de forma robusta;
el marcado interno se corta del texto original tal cual (sin reescribir),
preservando entidades y estilos.
"""
from __future__ import annotations

import re
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import List, Optional

from ..models import Animation, HtmlElement, Project, Slide, Transition


class _SectionFinder(HTMLParser):
    """Localiza los rangos [start, end) de cada <section> de nivel superior.

    Registra la posición de byte de la apertura del primer <section> y del
    final de su </section> de cierre, manejando anidamiento por si acaso.
    """

    def __init__(self, raw: str) -> None:
        super().__init__(convert_charrefs=False)
        self._raw = raw
        self._line_starts = self._compute_line_starts(raw)
        self.spans: List[tuple[int, int]] = []
        self._depth = 0
        self._open_offset: Optional[int] = None

    @staticmethod
    def _compute_line_starts(raw: str) -> List[int]:
        starts = [0]
        for i, ch in enumerate(raw):
            if ch == "\n":
                starts.append(i + 1)
        return starts

    def _offset(self) -> int:
        line, col = self.getpos()
        return self._line_starts[line - 1] + col

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag != "section":
            return
        if self._depth == 0:
            self._open_offset = self._offset()
        self._depth += 1

    def handle_endtag(self, tag: str) -> None:
        if tag != "section" or self._depth == 0:
            return
        self._depth -= 1
        if self._depth == 0 and self._open_offset is not None:
            # getpos apunta al inicio de "</section>"; sumamos su longitud.
            end = self._offset() + len("</section>")
            self.spans.append((self._open_offset, end))
            self._open_offset = None


_LABEL_RE = re.compile(r'data-label="([^"]*)"')
_NOTES_RE = re.compile(r'data-speaker-notes="([^"]*)"')


def _attr(pattern: re.Pattern, opening_tag: str) -> str:
    m = pattern.search(opening_tag)
    return unescape(m.group(1)) if m else ""


def parse_sections(raw: str) -> List[dict]:
    """Devuelve [{name, notes, markup}] por cada sección del deck."""
    finder = _SectionFinder(raw)
    finder.feed(raw)
    finder.close()
    out: List[dict] = []
    for i, (start, end) in enumerate(finder.spans, 1):
        markup = raw[start:end]
        opening = markup[: markup.find(">") + 1]
        name = _attr(_LABEL_RE, opening) or f"Slide {i}"
        notes = _attr(_NOTES_RE, opening)
        out.append({"name": name, "notes": notes, "markup": markup})
    return out


def import_source_deck(path: Path) -> Project:
    raw = Path(path).read_text(encoding="utf-8")
    sections = parse_sections(raw)

    project = Project(name="Tutorial · Deshabilitar login de root")
    for sec in sections:
        # Entrada por defecto: un fade suave para que la presentación del deck
        # de ejemplo muestre el sistema de animaciones en acción.
        element = HtmlElement(
            markup=sec["markup"],
            animation=Animation(type="fadeIn", applyTo="element", duration=0.55, easing="ease-out"),
        )
        slide = Slide(
            name=sec["name"],
            speakerNotes=sec["notes"],
            transitionIn=Transition(type="fade", duration=0.5, easing="ease"),
            elements=[element],
        )
        project.slides.append(slide)
    return project
