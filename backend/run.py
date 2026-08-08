"""Lanzador de Slide Studio.

    uv run python run.py            # sirve en el navegador (http://127.0.0.1:8000)
    uv run python run.py --window   # abre una ventana de escritorio (pywebview)

(También funciona con `python run.py` si ya tienes las dependencias en el
entorno activo.) Ambos modos usan exactamente el mismo backend FastAPI.
"""
from __future__ import annotations

import argparse
import threading
import time

import uvicorn

from app import config
from app.main import app


def _serve() -> uvicorn.Server:
    cfg = uvicorn.Config(app, host=config.HOST, port=config.PORT, log_level="info")
    return uvicorn.Server(cfg)


def run_browser() -> None:
    print(f"Slide Studio → http://{config.HOST}:{config.PORT}")
    _serve().run()


def run_window() -> None:
    try:
        import webview  # pywebview
    except ImportError:
        print("pywebview no está instalado. Usa `pip install pywebview` "
              "o ejecuta sin --window para abrir en el navegador.")
        raise SystemExit(1)

    server = _serve()
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    # Esperar a que el servidor acepte conexiones antes de abrir la ventana.
    for _ in range(100):
        if getattr(server, "started", False):
            break
        time.sleep(0.05)

    webview.create_window(
        "Slide Studio",
        f"http://{config.HOST}:{config.PORT}",
        width=1440,
        height=900,
        min_size=(1024, 680),
    )
    webview.start()
    server.should_exit = True


def main() -> None:
    parser = argparse.ArgumentParser(description="Slide Studio")
    parser.add_argument("--window", action="store_true", help="Abrir como ventana de escritorio")
    args = parser.parse_args()
    if args.window:
        run_window()
    else:
        run_browser()


if __name__ == "__main__":
    main()
