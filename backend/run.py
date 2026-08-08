"""Lanzador de Slide Studio.

    uv run python run.py            # sirve en el navegador (http://127.0.0.1:8000)
    uv run python run.py --window   # ventana de escritorio (Qt/PySide6)

Si por algún motivo el backend de ventana no cargara (p. ej. falta un display),
`--window` abre automáticamente el navegador en su lugar (nunca falla). Ambos
modos usan el mismo backend FastAPI.
"""
from __future__ import annotations

import argparse
import threading
import time
import webbrowser

import uvicorn

from app import config
from app.main import app

URL = f"http://{config.HOST}:{config.PORT}"


def _serve() -> uvicorn.Server:
    cfg = uvicorn.Config(app, host=config.HOST, port=config.PORT, log_level="info")
    return uvicorn.Server(cfg)


def _start_server_thread() -> tuple[uvicorn.Server, threading.Thread]:
    server = _serve()
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    # Esperar a que el servidor acepte conexiones antes de continuar.
    for _ in range(200):
        if getattr(server, "started", False):
            break
        time.sleep(0.05)
    return server, thread


def run_browser() -> None:
    print(f"Slide Studio → {URL}")
    _serve().run()


def _fallback_to_browser(server: uvicorn.Server, reason: str) -> None:
    """Sin backend de ventana: abrir el navegador y seguir sirviendo."""
    print(
        f"\n[modo ventana] No hay backend de escritorio disponible ({reason}).\n"
        f"Instálalo con:  uv sync --extra desktop\n"
        f"Mientras tanto, abriendo en el navegador: {URL}\n"
        "(Ctrl+C para salir.)\n"
    )
    try:
        webbrowser.open(URL)
    except Exception:
        pass
    try:
        while not getattr(server, "should_exit", False):
            time.sleep(0.5)
    except KeyboardInterrupt:
        server.should_exit = True


def run_window() -> None:
    server, _thread = _start_server_thread()

    try:
        import webview  # pywebview
    except ImportError:
        _fallback_to_browser(server, "pywebview no instalado")
        return

    try:
        webview.create_window(
            "Slide Studio",
            URL,
            width=1440,
            height=900,
            min_size=(1024, 680),
        )
        # webview.start() bloquea hasta que se cierra la ventana. Si no hay
        # toolkit nativo (GTK/Qt), lanza WebViewException → caemos al navegador.
        webview.start()
        server.should_exit = True
    except Exception as exc:  # WebViewException u otros errores del backend
        _fallback_to_browser(server, str(exc).splitlines()[0] if str(exc) else exc.__class__.__name__)


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
