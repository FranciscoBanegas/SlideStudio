"""Persistencia de proyectos en disco.

Estructura:
    projects/<slug>/project.json   # manifiesto validado por Pydantic
    projects/<slug>/assets/        # imágenes y recursos referenciados por ruta relativa

`storage.py` es la única capa que toca el sistema de archivos; las rutas de la
API delegan aquí. Los slugs se derivan del nombre y son seguros para el FS.
"""
from __future__ import annotations

import json
import re
import shutil
import unicodedata
from pathlib import Path
from typing import List, Optional

from . import config
from .models import Project, ProjectSummary, TemplateSummary, _new_id

# Marcador de plantilla de sistema (no borrable). Su presencia en la carpeta de
# una plantilla la distingue de las creadas por el usuario.
SYSTEM_MARKER = ".system"


class StorageError(Exception):
    """Error de persistencia (proyecto inexistente, slug inválido, etc.)."""


def slugify(name: str) -> str:
    value = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    value = re.sub(r"[^\w\s-]", "", value).strip().lower()
    value = re.sub(r"[\s_-]+", "-", value)
    return value or "presentacion"


def _project_dir(slug: str) -> Path:
    # Defensa contra path traversal: el slug no puede contener separadores.
    if not slug or "/" in slug or "\\" in slug or ".." in slug:
        raise StorageError(f"Slug inválido: {slug!r}")
    return config.PROJECTS_DIR / slug


def _manifest_path(slug: str) -> Path:
    return _project_dir(slug) / config.PROJECT_FILE


def assets_dir(slug: str) -> Path:
    d = _project_dir(slug) / config.ASSETS_DIRNAME
    d.mkdir(parents=True, exist_ok=True)
    return d


def exists(slug: str) -> bool:
    return _manifest_path(slug).is_file()


def list_projects() -> List[ProjectSummary]:
    config.ensure_dirs()
    summaries: List[ProjectSummary] = []
    for child in sorted(config.PROJECTS_DIR.iterdir()):
        manifest = child / config.PROJECT_FILE
        if not manifest.is_file():
            continue
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
            summaries.append(
                ProjectSummary(
                    slug=child.name,
                    name=data.get("name", child.name),
                    slideCount=len(data.get("slides", [])),
                    width=data.get("width", 1920),
                    height=data.get("height", 1080),
                )
            )
        except (json.JSONDecodeError, OSError):
            # Un manifiesto corrupto no debe tumbar el listado completo.
            continue
    return summaries


def load_project(slug: str) -> Project:
    path = _manifest_path(slug)
    if not path.is_file():
        raise StorageError(f"Proyecto no encontrado: {slug}")
    data = json.loads(path.read_text(encoding="utf-8"))
    # La validación de Pydantic es el contrato: un manifiesto inválido falla aquí.
    return Project.model_validate(data)


def save_project(slug: str, project: Project) -> None:
    d = _project_dir(slug)
    d.mkdir(parents=True, exist_ok=True)
    path = d / config.PROJECT_FILE
    payload = project.model_dump(mode="json")
    # Escritura atómica: escribir a tmp y renombrar evita manifiestos truncados.
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def create_project(name: str, project: Optional[Project] = None) -> str:
    config.ensure_dirs()
    base = slugify(name)
    slug = base
    i = 2
    while exists(slug):
        slug = f"{base}-{i}"
        i += 1
    proj = project or Project(name=name)
    proj.name = name
    save_project(slug, proj)
    assets_dir(slug)  # crea carpeta assets vacía
    return slug


def delete_project(slug: str) -> None:
    d = _project_dir(slug)
    if not d.is_dir():
        raise StorageError(f"Proyecto no encontrado: {slug}")
    shutil.rmtree(d)


def _unique_slug(base_name: str) -> str:
    base = slugify(base_name)
    slug = base
    i = 2
    while exists(slug):
        slug = f"{base}-{i}"
        i += 1
    return slug


def duplicate_project(src_slug: str, new_name: Optional[str] = None) -> str:
    """Copia un proyecto completo (project.json + assets/) a un slug nuevo.

    El duplicado recibe un `id` nuevo y un nombre "<original> (copia)", de modo
    que sea independiente del original y se pueda modificar sin afectarlo.
    """
    if not exists(src_slug):
        raise StorageError(f"Proyecto no encontrado: {src_slug}")
    project = load_project(src_slug)
    name = new_name or f"{project.name} (copia)"
    slug = _unique_slug(name)
    # Copiar la carpeta entera (incluye assets/), luego sobrescribir el
    # manifiesto con id/nombre nuevos.
    shutil.copytree(_project_dir(src_slug), _project_dir(slug))
    project.id = _new_id("proj")
    project.name = name
    save_project(slug, project)
    return slug


# ─────────────────────────────── Plantillas ──────────────────────────────────
#
# Las plantillas viven en un directorio hermano (`templates/`) con la misma
# estructura que un proyecto (project.json + assets/). "Usar plantilla" y
# "guardar como plantilla" son copias de carpeta entre `templates/` y
# `projects/` (mismo patrón que duplicate_project), con `id` nuevo → la
# presentación creada es independiente y la plantilla no se modifica.


def _template_dir(slug: str) -> Path:
    if not slug or "/" in slug or "\\" in slug or ".." in slug:
        raise StorageError(f"Slug inválido: {slug!r}")
    return config.TEMPLATES_DIR / slug


def template_exists(slug: str) -> bool:
    return (_template_dir(slug) / config.PROJECT_FILE).is_file()


def template_is_system(slug: str) -> bool:
    return (_template_dir(slug) / SYSTEM_MARKER).exists()


def _unique_slug_in(base_dir: Path, base_name: str) -> str:
    base = slugify(base_name)
    slug = base
    i = 2
    while (base_dir / slug / config.PROJECT_FILE).is_file():
        slug = f"{base}-{i}"
        i += 1
    return slug


def list_templates() -> List[TemplateSummary]:
    config.ensure_dirs()
    out: List[TemplateSummary] = []
    for child in sorted(config.TEMPLATES_DIR.iterdir()):
        manifest = child / config.PROJECT_FILE
        if not manifest.is_file():
            continue
        try:
            data = json.loads(manifest.read_text(encoding="utf-8"))
            out.append(
                TemplateSummary(
                    slug=child.name,
                    name=data.get("name", child.name),
                    slideCount=len(data.get("slides", [])),
                    width=data.get("width", 1920),
                    height=data.get("height", 1080),
                    system=(child / SYSTEM_MARKER).exists(),
                )
            )
        except (json.JSONDecodeError, OSError):
            continue
    # Plantillas de sistema primero, luego por nombre.
    out.sort(key=lambda t: (not t.system, t.name.lower()))
    return out


def load_template(slug: str) -> Project:
    path = _template_dir(slug) / config.PROJECT_FILE
    if not path.is_file():
        raise StorageError(f"Plantilla no encontrada: {slug}")
    return Project.model_validate(json.loads(path.read_text(encoding="utf-8")))


def save_template(slug: str, project: Project, system: bool = False) -> None:
    d = _template_dir(slug)
    d.mkdir(parents=True, exist_ok=True)
    path = d / config.PROJECT_FILE
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(
        json.dumps(project.model_dump(mode="json"), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    tmp.replace(path)
    (d / config.ASSETS_DIRNAME).mkdir(parents=True, exist_ok=True)
    if system:
        (d / SYSTEM_MARKER).write_text("", encoding="utf-8")


def create_template_from_project(src_slug: str, name: Optional[str] = None) -> str:
    """Guarda un proyecto existente como plantilla de usuario (copia independiente)."""
    if not exists(src_slug):
        raise StorageError(f"Proyecto no encontrado: {src_slug}")
    project = load_project(src_slug)
    tname = name or project.name
    slug = _unique_slug_in(config.TEMPLATES_DIR, tname)
    shutil.copytree(_project_dir(src_slug), _template_dir(slug))
    marker = _template_dir(slug) / SYSTEM_MARKER  # nunca es de sistema
    if marker.exists():
        marker.unlink()
    project.id = _new_id("proj")
    project.name = tname
    save_template(slug, project, system=False)
    return slug


def create_project_from_template(tpl_slug: str, name: Optional[str] = None) -> str:
    """Crea una presentación nueva e independiente a partir de una plantilla."""
    if not template_exists(tpl_slug):
        raise StorageError(f"Plantilla no encontrada: {tpl_slug}")
    template = load_template(tpl_slug)
    pname = name or template.name
    slug = _unique_slug(pname)
    shutil.copytree(_template_dir(tpl_slug), _project_dir(slug))
    marker = _project_dir(slug) / SYSTEM_MARKER  # un proyecto no lleva marcador
    if marker.exists():
        marker.unlink()
    template.id = _new_id("proj")
    template.name = pname
    save_project(slug, template)
    return slug


def delete_template(slug: str) -> None:
    d = _template_dir(slug)
    if not (d / config.PROJECT_FILE).is_file():
        raise StorageError(f"Plantilla no encontrada: {slug}")
    if (d / SYSTEM_MARKER).exists():
        raise StorageError("No se puede borrar una plantilla de sistema")
    shutil.rmtree(d)
