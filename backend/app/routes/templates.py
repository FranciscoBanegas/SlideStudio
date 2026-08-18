"""API REST de plantillas.

Las plantillas viven en `templates/` (separadas de los proyectos). Se pueden
listar, previsualizar, usar (crear una presentación independiente a partir de
una) y crear a partir de un proyecto propio. Las de sistema no se borran.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import storage
from ..models import Project, TemplateSummary

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=List[TemplateSummary])
def list_templates():
    return storage.list_templates()


@router.get("/{slug}", response_model=Project)
def get_template(slug: str):
    try:
        return storage.load_template(slug)
    except storage.StorageError as e:
        raise HTTPException(status_code=404, detail=str(e))


class SaveTemplateBody(BaseModel):
    sourceSlug: str
    name: str | None = None


@router.post("", response_model=dict)
def create_template(body: SaveTemplateBody):
    """Guarda un proyecto existente como plantilla de usuario."""
    try:
        slug = storage.create_template_from_project(body.sourceSlug, body.name)
    except storage.StorageError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"slug": slug}


class UseTemplateBody(BaseModel):
    name: str | None = None


@router.post("/{slug}/use", response_model=dict)
def use_template(slug: str, body: UseTemplateBody | None = None):
    """Crea una presentación nueva e independiente a partir de una plantilla."""
    try:
        new_slug = storage.create_project_from_template(slug, body.name if body else None)
    except storage.StorageError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"slug": new_slug}


@router.delete("/{slug}", response_model=dict)
def delete_template(slug: str):
    try:
        storage.delete_template(slug)
    except storage.StorageError as e:
        # Plantilla de sistema → 403; inexistente → 404.
        status = 403 if "sistema" in str(e) else 404
        raise HTTPException(status_code=status, detail=str(e))
    return {"ok": True}
