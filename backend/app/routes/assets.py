"""Subida y servicio de assets (imágenes) por proyecto.

Los archivos se guardan en projects/<slug>/assets/ y se referencian desde el
project.json por ruta relativa (p.ej. "assets/foto.png"). El frontend los
solicita vía GET /api/projects/{slug}/assets/{filename}.
"""
from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from .. import storage

router = APIRouter(prefix="/api/projects", tags=["assets"])

_SAFE = re.compile(r"[^A-Za-z0-9._-]")


def _safe_name(filename: str) -> str:
    stem = Path(filename).stem
    suffix = Path(filename).suffix.lower()
    stem = _SAFE.sub("_", stem)[:40] or "asset"
    if not re.fullmatch(r"\.[A-Za-z0-9]{1,8}", suffix):
        suffix = ""
    return f"{stem}-{uuid.uuid4().hex[:6]}{suffix}"


@router.post("/{slug}/assets", response_model=dict)
async def upload_asset(slug: str, file: UploadFile = File(...)):
    if not storage.exists(slug):
        raise HTTPException(status_code=404, detail=f"Proyecto no encontrado: {slug}")
    name = _safe_name(file.filename or "asset")
    dest = storage.assets_dir(slug) / name
    data = await file.read()
    dest.write_bytes(data)
    return {"src": f"assets/{name}", "url": f"/api/projects/{slug}/assets/{name}"}


@router.get("/{slug}/assets/{filename}")
def get_asset(slug: str, filename: str):
    if "/" in filename or "\\" in filename or ".." in filename or _SAFE.search(filename):
        raise HTTPException(status_code=400, detail="Nombre inválido")
    path = storage.assets_dir(slug) / filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Asset no encontrado")
    return FileResponse(path)
