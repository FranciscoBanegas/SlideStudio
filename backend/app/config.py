"""Rutas base y configuración del servidor.

Centraliza la ubicación de las carpetas del proyecto para que backend, importador
y almacenamiento compartan una única fuente de verdad.
"""
from __future__ import annotations

import os
from pathlib import Path

# slide-studio/backend/app/config.py -> subir 3 niveles = slide-studio/
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
ROOT_DIR = BACKEND_DIR.parent                      # slide-studio/
REPO_DIR = ROOT_DIR.parent                          # "Tutorial de slides paso a paso/"

FRONTEND_DIR = ROOT_DIR / "frontend"
PROJECTS_DIR = ROOT_DIR / "projects"

# Deck HTML original usado por el importador (queda fuera de slide-studio/).
SOURCE_DECK_HTML = REPO_DIR / "Tutorial Deshabilitar Root.dc.html"

# Nombre de archivo de manifiesto dentro de cada proyecto.
PROJECT_FILE = "project.json"
ASSETS_DIRNAME = "assets"

HOST = os.environ.get("SLIDE_STUDIO_HOST", "127.0.0.1")
PORT = int(os.environ.get("SLIDE_STUDIO_PORT", "8000"))


def ensure_dirs() -> None:
    """Crea las carpetas base si no existen."""
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
