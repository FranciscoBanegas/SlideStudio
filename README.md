# Slide Studio

**Aplicación simple para crear, editar y presentar diapositivas (slides).**

Es una app sencilla hecha en **Python**, construida de forma rápida con ayuda de
**IA**. Funciona en tu propio ordenador y se usa desde el navegador: creas tus
presentaciones, las editas visualmente y las reproduces a pantalla completa.

## Qué puedes hacer

- Crear presentaciones y añadir todas las diapositivas que quieras.
- Añadir **textos, títulos, imágenes, formas y fondos**, y moverlos o
  redimensionarlos con el ratón.
- Aplicar **animaciones** (incluida la aparición **letra por letra**) y
  **transiciones** entre diapositivas.
- Ajustar los **tiempos de animación** en una **línea de tiempo** visual
  (arrastra para cambiar el retardo y la duración de cada elemento).
- **Presentar** a pantalla completa (avanzas con las flechas o la barra
  espaciadora).
- **Duplicar** o **eliminar** presentaciones.
- **Exportar** a **PDF** o a un **HTML autónomo** (un solo archivo que se abre
  sin servidor: como presentación reproducible o como documento con scroll).

## Cómo usarla

Necesitas [uv](https://docs.astral.sh/uv/) instalado (gestiona todo por ti).

```bash
cd slide-studio/backend
uv sync                  # solo la primera vez
uv run python run.py     # abre la app en tu navegador
```

Luego abre `http://127.0.0.1:8000`. Al arrancar por primera vez verás una
presentación de ejemplo para que empieces enseguida.

¿El puerto 8000 está ocupado? Usa otro con `--port`:

```bash
uv run python run.py --port 8080
```

¿Prefieres una ventana de escritorio en vez del navegador?

```bash
uv run python run.py --window
```

## Guía de uso

Guía paso a paso pensada para cualquier persona (sin tecnicismos):
**[docs/07-guia-de-uso.md](docs/07-guia-de-uso.md)**.

## Atajos de teclado

| Tecla | Acción |
|-------|--------|
| ⌘/Ctrl+S | Guardar |
| ⌘/Ctrl+Z · Ctrl+Y | Deshacer · Rehacer |
| Supr / Retroceso | Eliminar elemento |
| Flechas (+Shift) | Mover elemento 1px (10px) |
| ▶ Presentar · ← → Espacio · ESC | Presentación |

## Licencia

Distribuido bajo licencia [MIT](LICENSE). Uso libre, incluido comercial.
