"""Esquema de datos de una presentación (Pydantic v2).

Este módulo es el *contrato* del sistema: define qué es un proyecto, un slide,
un elemento, una animación y una transición. El frontend refleja estas mismas
estructuras en `js/model.js`. El campo `schemaVersion` permite evolucionar el
formato sin romper proyectos antiguos.

El sistema de elementos es deliberadamente abierto: agregar un tipo nuevo es
añadir un literal a `ElementType`, sus campos aquí, un renderer en el frontend y
un editor de propiedades. Nada más del core necesita cambiar.
"""
from __future__ import annotations

import uuid
from typing import List, Literal, Optional, Union

from pydantic import BaseModel, Field

SCHEMA_VERSION = 1


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


# ─────────────────────────────── Animación ───────────────────────────────

AnimationType = Literal[
    "none",
    "fadeIn",
    "fadeOut",
    "slideInLeft",
    "slideInRight",
    "slideInTop",
    "slideInBottom",
    "scaleIn",
    "zoom",
    "blurIn",
    "bounce",
    "typewriter",
    # Efectos añadidos (fase 6). La dirección (entrada/salida) la controla el
    # campo `direction`; el mismo efecto sirve para entrar o salir.
    "flipIn",
    "rotateIn",
    "wipeIn",
]

# A qué unidad se aplica la animación. "letter"/"word"/"line" habilitan el
# efecto escalonado (stagger) que es la característica especial pedida.
AnimationApplyTo = Literal["element", "letter", "word", "line"]

AnimationDirection = Literal["in", "out"]


class Animation(BaseModel):
    """Configuración de animación de entrada/salida de un elemento.

    El motor completo (incl. letra por letra) se activa en fases posteriores;
    el esquema queda completo desde ya para que la UI lo edite y persista.
    """

    type: AnimationType = "none"
    applyTo: AnimationApplyTo = "element"
    duration: float = 0.5           # segundos
    delay: float = 0.0              # segundos antes de arrancar
    stagger: float = 0.05           # segundos entre unidades (letra/palabra/línea)
    easing: str = "ease-out"
    direction: AnimationDirection = "in"


# ─────────────────────────────── Transición ──────────────────────────────

TransitionType = Literal[
    "none",
    "fade",
    "slideH",
    "slideV",
    "zoom",
    "blur",
    "scale",
    "push",
    "wipe",
]


class Transition(BaseModel):
    """Transición entre slides."""

    type: TransitionType = "fade"
    duration: float = 0.5
    easing: str = "ease"


# ─────────────────────────────── Elementos ───────────────────────────────

ElementType = Literal["text", "image", "rect", "line", "background", "html"]

TextRole = Literal["title", "subtitle", "body", "label"]
TextAlign = Literal["left", "center", "right", "justify"]
ImageFit = Literal["contain", "cover", "fill"]


class BaseElement(BaseModel):
    """Campos comunes a todo elemento. Coordenadas en el espacio de diseño
    (por defecto 1920×1080), no en píxeles de pantalla."""

    id: str = Field(default_factory=lambda: _new_id("el"))
    type: ElementType
    x: float = 0
    y: float = 0
    w: float = 400
    h: float = 120
    rotation: float = 0
    opacity: float = 1.0
    z: int = 0
    locked: bool = False
    animation: Animation = Field(default_factory=Animation)


class TextElement(BaseElement):
    type: Literal["text"] = "text"
    content: str = "Texto"
    role: TextRole = "body"
    fontFamily: str = "'IBM Plex Sans', sans-serif"
    fontSize: float = 30
    fontWeight: int = 400
    color: str = "var(--ink)"
    align: TextAlign = "left"
    lineHeight: float = 1.4
    letterSpacing: float = 0


class ImageElement(BaseElement):
    type: Literal["image"] = "image"
    src: str = ""                    # ruta relativa dentro de assets/
    fit: ImageFit = "contain"
    radius: float = 0


class RectElement(BaseElement):
    type: Literal["rect"] = "rect"
    fill: str = "var(--panel)"
    stroke: str = "var(--line)"
    strokeWidth: float = 1
    radius: float = 14


class LineElement(BaseElement):
    type: Literal["line"] = "line"
    h: float = 6
    stroke: str = "var(--line2)"
    strokeWidth: float = 6


class BackgroundElement(BaseElement):
    """Fondo del slide como elemento (permite gradientes/decorados)."""

    type: Literal["background"] = "background"
    x: float = 0
    y: float = 0
    w: float = 1920
    h: float = 1080
    z: int = -1000
    color: str = "var(--bg)"
    gradient: Optional[str] = None   # p.ej. "linear-gradient(...)"; si existe, prima


class HtmlElement(BaseElement):
    """Bloque de marcado crudo. Lo usa el importador para conservar la fidelidad
    del deck original; también es un tipo de elemento válido de pleno derecho."""

    type: Literal["html"] = "html"
    x: float = 0
    y: float = 0
    w: float = 1920
    h: float = 1080
    markup: str = ""


# Unión discriminada por `type`: al deserializar, Pydantic elige la clase correcta.
Element = Union[
    TextElement,
    ImageElement,
    RectElement,
    LineElement,
    BackgroundElement,
    HtmlElement,
]


# ─────────────────────────────── Slide ───────────────────────────────────

class Slide(BaseModel):
    id: str = Field(default_factory=lambda: _new_id("slide"))
    name: str = "Slide"
    background: str = "var(--bg)"
    transitionIn: Transition = Field(default_factory=Transition)
    transitionOut: Transition = Field(default_factory=Transition)
    speakerNotes: str = ""
    elements: List[Element] = Field(default_factory=list)


# ─────────────────────────────── Tema ────────────────────────────────────

class Theme(BaseModel):
    """Tokens de diseño heredados del deck original. Se inyectan como variables
    CSS en el canvas para garantizar fidelidad visual."""

    fontSans: str = "'IBM Plex Sans', sans-serif"
    fontMono: str = "'IBM Plex Mono', monospace"
    colors: dict = Field(
        default_factory=lambda: {
            "bg": "#0e1116",
            "panel": "#171b22",
            "code": "#0a0c10",
            "line": "rgba(255,255,255,.08)",
            "line2": "rgba(255,255,255,.14)",
            "ink": "#e7eaf0",
            "muted": "#96a0b0",
            "dim": "#69727f",
            "green": "#5cd48a",
            "amber": "#e6b95c",
            "red": "#e0776b",
            "blue": "#7fb4e8",
        }
    )
    # Escala tipográfica del deck (px), disponible para nuevos elementos.
    typeScale: dict = Field(
        default_factory=lambda: {
            "title": 60,
            "step": 28,
            "sub": 40,
            "body": 30,
            "code": 27,
            "small": 24,
            "mega": 150,
        }
    )
    fontsHref: str = (
        "https://fonts.googleapis.com/css2?"
        "family=IBM+Plex+Sans:wght@400;500;600;700&"
        "family=IBM+Plex+Mono:wght@400;500;600&display=swap"
    )


# ─────────────────────────────── Proyecto ────────────────────────────────

class Project(BaseModel):
    id: str = Field(default_factory=lambda: _new_id("proj"))
    schemaVersion: int = SCHEMA_VERSION
    name: str = "Nueva presentación"
    width: int = 1920
    height: int = 1080
    theme: Theme = Field(default_factory=Theme)
    defaultTransition: Transition = Field(default_factory=Transition)
    slides: List[Slide] = Field(default_factory=list)


class ProjectSummary(BaseModel):
    """Resumen ligero para listar proyectos sin cargar todos los slides."""

    slug: str
    name: str
    slideCount: int
    width: int
    height: int


class TemplateSummary(ProjectSummary):
    """Resumen de una plantilla. `system` distingue las de sistema (no borrables)
    de las creadas por el usuario."""

    system: bool = False
