# 7 · Guía de uso

Guía sencilla para crear y presentar diapositivas con Slide Studio. **No hace
falta saber programar.**

## 1. Abrir la aplicación

Necesitas [uv](https://docs.astral.sh/uv/) instalado.

```bash
cd slide-studio/backend
uv sync                                  # solo la primera vez
uv run python run.py                     # se abre en el navegador
```

- En el navegador: entra en `http://127.0.0.1:8000`.
- Como ventana de escritorio: `uv run python run.py --window`.

Al abrir verás el proyecto de ejemplo **"Tutorial · Deshabilitar login de root"**
con sus 17 diapositivas.

## 2. La pantalla

```
┌───────────────────────────── Barra superior ──────────────────────────────┐
│  Slide Studio    + Insertar   ↶ ↷   [Proyecto ▾] Nuevo   Guardar  ▶ Presentar │
├──────────────┬──────────────────────────────────────┬──────────────────────┤
│              │                                      │                      │
│   Slides     │              Canvas                  │     Propiedades      │
│ (miniaturas) │      (tu diapositiva a escala)       │  (del elemento       │
│              │                                      │   seleccionado)      │
│  + Nuevo     │                                      │                      │
└──────────────┴──────────────────────────────────────┴──────────────────────┘
```

- **Izquierda:** lista de diapositivas.
- **Centro:** la diapositiva actual, donde editas.
- **Derecha:** propiedades de lo que tengas seleccionado.

## 3. Trabajar con diapositivas (panel izquierdo)

- **Nueva:** botón **+ Nuevo slide** (se añade tras la actual).
- **Seleccionar:** clic en su miniatura.
- **Duplicar:** pasa el ratón por la miniatura → icono **⧉**.
- **Eliminar:** pasa el ratón por la miniatura → icono **✕**.
- **Reordenar:** arrastra una miniatura arriba/abajo.

## 4. Añadir elementos (botón + Insertar)

| Opción | Qué inserta |
|--------|-------------|
| Texto / Título / Subtítulo | Bloques de texto con estilos predefinidos |
| Imagen… | Te pide un archivo y lo sube al proyecto |
| Rectángulo / Línea | Formas básicas |
| Fondo | Un fondo de color para la diapositiva |

## 5. Editar en el canvas

- **Seleccionar:** clic sobre el elemento (aparece un marco con manijas).
- **Mover:** arrástralo. También con las **flechas** del teclado (Shift = 10px).
- **Cambiar tamaño:** arrastra cualquiera de las 8 manijas del marco.
- **Editar texto:** **doble clic** sobre el texto y escribe. Clic fuera o `Esc`
  para terminar.
- **Eliminar:** selecciónalo y pulsa **Supr**.

## 6. Ajustar propiedades (panel derecho)

Al seleccionar un elemento aparecen sus opciones según el tipo. Por ejemplo, un
texto: contenido, fuente, tamaño, peso, color, alineación, interlineado,
posición, tamaño y opacidad.

Si **no** hay nada seleccionado, el panel muestra las propiedades de la
diapositiva: nombre, fondo, transición de entrada y notas del ponente.

## 7. Animar un elemento

1. Selecciona el elemento.
2. En **Propiedades → Animación**, elige:
   - **Tipo** (Fade In, Slide In, Zoom, Blur In, Bounce, Typewriter…).
   - **Aplicar a:** *Elemento*, *Cada letra*, *Cada palabra* o *Cada línea*.
   - **Duración**, **Delay** y **Stagger** (retardo entre letras/palabras).
   - **Easing** (curva de aceleración).
3. Pulsa **▶ Previsualizar animación** para verla en el canvas.

> Consejo: para el efecto "letra por letra", elige *Fade In* + *Cada letra* y un
> stagger de ~0.05 s.

## 8. Presentar

Pulsa **▶ Presentar** (arriba a la derecha). La presentación ocupa toda la
pantalla y ejecuta transiciones y animaciones.

| Tecla | Acción |
|-------|--------|
| → · Espacio · Av Pág | Siguiente |
| ← · Re Pág | Anterior |
| Inicio / Fin | Primera / última |
| Esc | Salir |

También puedes hacer clic: mitad derecha avanza, mitad izquierda retrocede.

## 8·bis. Exportar a PDF

Pulsa **⤓ PDF** (arriba, junto a *Presentar*). Se abre el diálogo de impresión
del navegador: elige **"Guardar como PDF"** como destino y confirma. Cada slide
se exporta como una página en formato 16:9, con la misma apariencia que en el
editor.

> Para la mejor fidelidad, en el diálogo activa **"Gráficos de fondo"** (o
> *Background graphics*) si aparece, y deja los márgenes en *Ninguno*.

## 9. Guardar y proyectos

- **Guardar:** botón **Guardar** o **⌘/Ctrl + S**. Un punto **•** junto al
  nombre indica cambios sin guardar.
- **Nuevo proyecto:** botón **Nuevo** (te pide un nombre).
- **Duplicar presentación:** botón **Duplicar**. Crea una copia completa (con sus
  imágenes) llamada *"… (copia)"* y te sitúa a editarla, **sin tocar la
  original**. Ideal para partir de una presentación existente y modificarla. Si
  tienes cambios sin guardar, se guardan antes para que la copia refleje el
  estado actual.
- **Eliminar presentación:** botón **Eliminar**. Borra la presentación actual
  (y sus imágenes) de forma **permanente**; pide confirmación antes. Si era la
  única, se crea una nueva vacía para no dejar la app sin proyecto.
- **Cambiar de proyecto:** el desplegable junto a **Nuevo**. Si tienes cambios
  sin guardar, te preguntará antes de descartarlos.

Tus proyectos se guardan en `slide-studio/projects/<nombre>/project.json`.

## Atajos de teclado

| Tecla | Acción |
|-------|--------|
| ⌘/Ctrl + S | Guardar |
| ⌘/Ctrl + Z · Ctrl + Y | Deshacer · Rehacer |
| Supr / Retroceso | Eliminar elemento |
| Flechas (+Shift) | Mover 1px (10px) |
| Doble clic (texto) | Editar en línea |
