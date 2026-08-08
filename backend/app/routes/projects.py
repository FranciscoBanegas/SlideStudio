"""API REST de proyectos y slides.

El frontend nunca toca disco: crea, carga y guarda todo a través de estos
endpoints. El guardado es de proyecto completo (put), que es simple y robusto
para esta primera versión; operaciones de conveniencia (duplicar/reordenar
slide) se ofrecen como atajos server-side.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import storage
from ..models import Project, ProjectSummary, Slide, _new_id

router = APIRouter(prefix="/api/projects", tags=["projects"])


class CreateProjectBody(BaseModel):
    name: str = "Nueva presentación"


@router.get("", response_model=List[ProjectSummary])
def list_projects():
    return storage.list_projects()


@router.post("", response_model=dict)
def create_project(body: CreateProjectBody):
    slug = storage.create_project(body.name)
    return {"slug": slug}


class DuplicateProjectBody(BaseModel):
    name: str | None = None


@router.post("/{slug}/duplicate", response_model=dict)
def duplicate_project(slug: str, body: DuplicateProjectBody | None = None):
    try:
        new_slug = storage.duplicate_project(slug, body.name if body else None)
    except storage.StorageError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"slug": new_slug}


@router.get("/{slug}", response_model=Project)
def get_project(slug: str):
    try:
        return storage.load_project(slug)
    except storage.StorageError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{slug}", response_model=dict)
def save_project(slug: str, project: Project):
    if not storage.exists(slug):
        raise HTTPException(status_code=404, detail=f"Proyecto no encontrado: {slug}")
    storage.save_project(slug, project)
    return {"ok": True}


@router.delete("/{slug}", response_model=dict)
def delete_project(slug: str):
    try:
        storage.delete_project(slug)
    except storage.StorageError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"ok": True}


# ── Atajos de conveniencia sobre slides (operan sobre el proyecto guardado) ──

class DuplicateSlideBody(BaseModel):
    slideId: str


def _clone_slide(slide: Slide) -> Slide:
    data = slide.model_dump(mode="json")
    new = Slide.model_validate(data)
    new.id = _new_id("slide")
    new.name = f"{slide.name} (copia)"
    for el in new.elements:
        el.id = _new_id("el")
    return new


@router.post("/{slug}/slides/duplicate", response_model=Project)
def duplicate_slide(slug: str, body: DuplicateSlideBody):
    try:
        project = storage.load_project(slug)
    except storage.StorageError as e:
        raise HTTPException(status_code=404, detail=str(e))
    idx = next((i for i, s in enumerate(project.slides) if s.id == body.slideId), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Slide no encontrado")
    project.slides.insert(idx + 1, _clone_slide(project.slides[idx]))
    storage.save_project(slug, project)
    return project
