"""Lanzador de Slide Studio.

    uv run python run.py                    # navegador (http://127.0.0.1:8000)
    uv run python run.py --window           # ventana de escritorio (Qt/PySide6)
    uv run python run.py --port 8080        # puerto personalizado
    uv run python run.py --host 0.0.0.0     # escuchar en todas las interfaces

Si por algún motivo el backend de ventana no cargara (p. ej. falta un display),
`--window` abre automáticamente el navegador en su lugar (nunca falla). Ambos
modos usan el mismo backend FastAPI.

El puerto por defecto es 8000 (o el valor de la env `SLIDE_STUDIO_PORT`). Si el
puerto elegido ya está en uso, el lanzador avisa con un mensaje claro en lugar
de volcar un traceback, y sugiere usar `--port`.
"""
from __future__ import annotations

import argparse
import socket
import sys
import threading
import time
import webbrowser

import uvicorn

from app import config
from app.main import app


def _url(host: str, port: int) -> str:
    return f"http://{host}:{port}"


def _port_available(host: str, port: int) -> bool:
    """True si se puede enlazar (host, port). Usa un socket de prueba sin
    SO_REUSEADDR para que en Windows detecte de forma fiable un puerto ocupado."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((host, port))
            return True
        except OSError:
            return False


def _serve(host: str, port: int) -> uvicorn.Server:
    cfg = uvicorn.Config(app, host=host, port=port, log_level="info")
    return uvicorn.Server(cfg)


def _start_server_thread(host: str, port: int) -> tuple[uvicorn.Server, threading.Thread]:
    server = _serve(host, port)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()
    # Esperar a que el servidor acepte conexiones antes de continuar.
    for _ in range(200):
        if getattr(server, "started", False):
            break
        time.sleep(0.05)
    return server, thread


def run_browser(host: str, port: int) -> None:
    url = _url(host, port)
    print(f"Slide Studio -> {url}")
    _serve(host, port).run()


def _fallback_to_browser(server: uvicorn.Server, url: str, reason: str) -> None:
    """Sin backend de ventana: abrir el navegador y seguir sirviendo."""
    print(
        f"\n[modo ventana] No hay backend de escritorio disponible ({reason}).\n"
        f"Instálalo con:  uv sync --extra desktop\n"
        f"Mientras tanto, abriendo en el navegador: {url}\n"
        "(Ctrl+C para salir.)\n"
    )
    try:
        webbrowser.open(url)
    except Exception:
        pass
    try:
        while not getattr(server, "should_exit", False):
            time.sleep(0.5)
    except KeyboardInterrupt:
        server.should_exit = True


def run_window(host: str, port: int) -> None:
    url = _url(host, port)
    server, _thread = _start_server_thread(host, port)

    try:
        import webview  # pywebview
    except ImportError:
        _fallback_to_browser(server, url, "pywebview no instalado")
        return

    try:
        webview.create_window(
            "Slide Studio",
            url,
            width=1440,
            height=900,
            min_size=(1024, 680),
        )
        # webview.start() bloquea hasta que se cierra la ventana. Si no hay
        # toolkit nativo (GTK/Qt), lanza WebViewException → caemos al navegador.
        webview.start()
        server.should_exit = True
    except Exception as exc:  # WebViewException u otros errores del backend
        _fallback_to_browser(server, url, str(exc).splitlines()[0] if str(exc) else exc.__class__.__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Slide Studio")
    parser.add_argument("--window", action="store_true", help="Abrir como ventana de escritorio")
    parser.add_argument("--port", type=int, default=config.PORT,
                        help=f"Puerto del servidor (por defecto {config.PORT})")
    parser.add_argument("--host", default=config.HOST,
                        help=f"Host/interfaz de escucha (por defecto {config.HOST})")
    args = parser.parse_args()

    # Chequeo previo: evita el traceback de "dirección ya en uso" y, en modo
    # ventana, que la app se quede colgada apuntando a un servidor que no arrancó.
    if not _port_available(args.host, args.port):
        print(
            f"\nEl puerto {args.port} ya está en uso en {args.host}.\n"
            f"Usa otro puerto:  uv run python run.py --port 8080\n",
            file=sys.stderr,
        )
        sys.exit(1)

    if args.window:
        run_window(args.host, args.port)
    else:
        run_browser(args.host, args.port)


if __name__ == "__main__":
    main()
