---
name: Panel WSP
description: Panel de admins de la comunidad (WhatsApp + Minecraft Bedrock), crema cálido con estados en pastel.
colors:
  paper: "#fbf9f7"
  surface: "#f5f0eb"
  card: "#fffefb"
  line: "#ebe4dc"
  line-strong: "#d9cfc3"
  ink: "#1a1a1a"
  ink-soft: "#5c534c"
  ink-muted: "#7d7167"
  night: "#050506"
  night-surface: "#0c0c0f"
  night-ink: "#e8e8ec"
  mint: "#b0e8d4"
  lavender: "#c4b5fc"
  peach: "#fdd9b0"
  danger: "#c4354f"
  link: "#0284c7"
  status-active: "#b0e8d4"
  status-inactive: "#d9d4cd"
  status-left: "#feead3"
  status-permanent: "#fdd9b0"
  status-absent: "#b8e6fd"
  status-new: "#d9f99d"
  status-admin: "#e9d5ff"
  status-protected: "#b5e8f0"
  status-ban: "#f8d7da"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1rem + 2vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  subtitle:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.025em"
  micro:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 500
    lineHeight: 1
rounded:
  sm: "8px"
  tile: "12px"
  control: "16px"
  panel: "28px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-mint:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-lavender:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  input-neutral:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.panel}"
    padding: "20px"
  chip-status:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
    typography: "{typography.label}"
  nav-tile-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.tile}"
---

# Design System: Panel WSP

## Overview

**Creative North Star: "El cuaderno de control"**

Un cuaderno de papel crema donde los admins anotan y corrigen el estado de la comunidad. La superficie es cálida y quieta: neutros beige en lugar de grises fríos, radios grandes y blandos, sombras casi imperceptibles. El color no decora: casi todo el tono vive en las fichas de estado (activo, inactivo, nuevo, ausente, se salió, admin, protegido, ban) y en un par de botones pastel. La sección activa se marca invirtiendo el contraste (tinta sobre papel pasa a papel sobre tinta), nunca con un color de categoría.

Es un panel de trabajo para PC primero: denso pero respirado, con listas y tablas que se escanean rápido, conteos arriba y el detalle a un clic. En celular las tablas se vuelven tarjetas y la barra lateral pasa a pestañas horizontales con scroll. El modo oscuro existe y es casi negro (no azul), con un único resplandor violeta muy tenue arriba a la derecha.

**Key Characteristics:**

- Neutros cálidos (escala zinc redefinida a crema/carbón) en toda la interfaz.
- Estado = ficha pastel redondeada con anillo de 1px; el ban es la única con anillo de 2px.
- Activo = contraste invertido, sin tinte.
- Radios grandes: paneles de 28px, controles de 16px.
- Plano: profundidad por capas tonales (papel → superficie → tarjeta), no por sombras.
- Copy en español, tuteo, frases cortas que dicen qué pasa.

## Colors

Paleta de papel cálido con pasteles planos que solo aparecen para comunicar estado o acción.

### Primary

- **Tinta** (ink): texto principal, botón primario y tesela de navegación activa. Es el único "acento" fuerte del sistema; su peso viene del contraste, no del tono.

### Secondary

- **Menta** (mint): botón de acción positiva secundaria (agregar, guardar notas, dar cuenta) y ficha de activo. Distinta del verde puro del roster de Minecraft.
- **Lavanda** (lavender): botón secundario neutral-amable (aplicar filtros en monitoreo, acciones de Minecraft).
- **Melocotón** (peach): botón cálido de advertencia suave y ficha de activo permanente.

### Tertiary

- **Fichas de estado**: `status-active` (menta), `status-inactive` (piedra), `status-left` (ámbar claro), `status-permanent` (ámbar), `status-absent` (cielo), `status-new` (lima), `status-admin` (fucsia lavanda), `status-protected` (cian), `status-ban` (rosa con anillo rojo de 2px). Cada una lleva su propio texto 950 y un anillo del mismo tono al 60–95 %.
- **Peligro** (danger): botón de borrar o confirmar algo irreversible, texto de error.
- **Enlace** (link): paginación y enlaces de texto en tablas (cielo 600; 400 en oscuro).

### Neutral

- **Papel** (paper): fondo de la página.
- **Superficie** (surface): fondo de inputs y bloques internos (zinc-100).
- **Tarjeta** (card): paneles y tarjetas; el "blanco" del sistema es marfil, no #fff.
- **Línea** (line) y **Línea fuerte** (line-strong): bordes de paneles, divisores y anillos de inputs.
- **Tinta suave** (ink-soft) y **Tinta apagada** (ink-muted): texto secundario, descripciones, metadatos.
- **Noche** (night), **Superficie nocturna** (night-surface) y **Tinta nocturna** (night-ink): base del modo oscuro.

### Named Rules

**The Estado-Es-Color Rule.** El tono se reserva para el estado de un miembro o de un evento. Si algo no comunica estado ni es una acción, va en neutros.

**The Mismo-Significado Rule.** Un color de estado significa lo mismo en todo el panel: ámbar es "se salió" o "salida", rojo es ban, borrado o strike, fucsia es admin. No reutilices un tono de estado para otra cosa.

## Typography

**Display Font:** Geist (con system-ui, sans-serif)
**Body Font:** Geist (con system-ui, sans-serif)
**Label/Mono Font:** ui-monospace / Cascadia Code solo para logs y comandos

**Character:** Una sola sans geométrica y neutra; la jerarquía sale del peso y el tamaño, no de mezclar familias.

### Hierarchy

- **Display** (700, 24px → 36px, tracking -0.025em): el título de la sección en el encabezado principal (solo PC).
- **Title** (600, 18px): título de página dentro del contenido (`h2`), repetido también en celular.
- **Subtitle** (600, 16px): título de un panel dentro de la página (`h3`).
- **Body** (400, 14px, 1.5): texto, tablas, descripciones. Descripciones largas a `max-w-prose`.
- **Label** (600, 12px): etiquetas de campos de filtro, fichas de estado (500).
- **Caption** (600, 11px, mayúsculas, tracking 0.025em): cabeceras de tabla, hora secundaria (Colombia), pistas bajo campos.
- **Micro** (500, 10px, interlineado 1): solo texto bajo los iconos de las pestañas de celular y de las teselas, y microetiquetas dentro del editor de miembro. Nunca para texto de lectura.

### Named Rules

**The Una-Familia Rule.** Geist para todo; mono solo para salida técnica (logs, comandos remotos).

**The Hora-Doble Rule.** Las horas se muestran en México y debajo, más chica, en Colombia, con cifras tabulares.

## Layout

- **Escritorio (md+):** barra lateral fija de teselas en una rejilla de 2 columnas, agrupadas por función (Vista, Administración, Sistema) con un divisor corto entre grupos. Contenido a la derecha con encabezado grande (título + subtítulo de una línea) y luego la página.
- **Celular:** barra superior con pestañas horizontales (icono + texto de 10px) con scroll y pistas de flecha en los bordes; menú «Más» para tema y salir. El encabezado grande se oculta; la página repite su `h2`.
- **Página:** `section` en columna con 16–24px entre bloques. Cada bloque es un panel (tarjeta de 28px de radio, 16px de padding en celular y 20px desde sm).
- **Listas y tablas:** tabla desde md con filas separadas por línea fina; en celular la misma información como tarjetas apiladas con divisores. 50 elementos por página con paginación de texto («Anterior · Página X de Y · Siguiente»).
- **Filtros:** rejilla de campos con etiqueta arriba que pasa de 1 columna (celular) a 2 (md) y a una fila (xl), con el botón al final.

## Elevation & Depth

El sistema es plano. La profundidad sale de capas tonales: papel (fondo) → tarjeta marfil (panel) → superficie beige (inputs y bloques internos). Las sombras son ambientales y casi invisibles, y en oscuro desaparecen.

### Shadow Vocabulary

- **Panel** (`box-shadow: 0 1px 2px 0 rgb(26 26 26 / 0.04)`): paneles en reposo.
- **Botón** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): botones rellenos.
- **Diálogo** (`box-shadow: 0 10px 15px -3px rgb(26 26 26 / 0.1)`): editor de miembro y diálogos de confirmación sobre un velo oscuro con desenfoque de 2px.

### Named Rules

**The Plano-Por-Defecto Rule.** Si un bloque necesita separarse, cambia su tono de fondo o añade un anillo de 1px; no le subas la sombra.

## Shapes

Formas blandas y grandes. Paneles a 28px, controles (inputs, selects, botones) a 16px, teselas de navegación a 12px, botones pequeños y enlaces-botón a 8–12px, fichas en píldora. Los bordes son de 1px en tonos de línea al 70–90 %; los inputs no tienen borde, solo un anillo de 1px. Nada de bordes laterales de acento.

## Components

### Buttons

- **Shape:** esquinas suaves (16px), 10px × 16px, texto 14px 500.
- **Primary:** tinta sobre marfil; en oscuro se invierte (marfil sobre tinta).
- **Mint / Lavender / Peach:** pastel plano con texto tinta; hover un paso más saturado.
- **Danger:** rojo con texto marfil, solo para confirmar algo irreversible.
- **Hover / Focus:** transición de color; deshabilitado al 60 % de opacidad.
- **Ghost:** texto con hover de superficie (por ejemplo «Ver historial», «Cerrar» con borde de línea, «Quitar» en rojo sobre hover rosado).

### Chips

- **Style:** píldora de 2px × 10px, texto 12px 500, fondo pastel 100–200, texto del mismo tono 950 y anillo de 1px del mismo tono. El ban usa anillo de 2px rojo 600.
- **State:** las fichas son informativas, no interactivas. En el historial, la ficha de la acción usa la misma semántica: menta para altas y entradas, ámbar para salidas y cuentas quitadas, rojo para borrado, strike y ban, neutro para el resto.

### Cards / Containers

- **Corner Style:** 28px.
- **Background:** tarjeta marfil sobre papel; en oscuro casi negro al 90 %.
- **Shadow Strategy:** sombra de panel (ver Elevation & Depth).
- **Border:** 1px de línea al 70 %.
- **Internal Padding:** 16px, 20px desde sm.
- **Filas internas:** bloques de 16px de radio en superficie o tinte pastel muy claro con anillo de 1px (sugerencias de gamertag, cuentas del panel).

### Inputs / Fields

- **Style:** superficie beige, sin borde, anillo de 1px de línea, 16px de radio, 10px × 16px, texto 14px. Etiqueta arriba en 12px 600.
- **Focus:** anillo de 2px en tinta al 15 %.
- **Select:** mismo estilo con flecha SVG propia (sin la caja nativa del navegador).

### Navigation

- **Barra lateral:** teselas de icono (trazo 2px, estilo lucide) con texto corto debajo, en rejilla de 2. Reposo neutro con hover de papel; activa en contraste invertido; salir con hover rojo.
- **Celular:** pestañas de 50px de ancho con icono de 18px y texto de 10px; la activa con fondo de línea.

### Diálogo de confirmación

Tarjeta centrada sobre velo oscuro, título, una frase que dice qué pasa después y dos botones (cancelar neutro, confirmar rojo o tinta según el riesgo).

## Do's and Don'ts

### Do:

- **Do** usar las fichas de estado existentes con su significado de siempre antes de inventar un color nuevo.
- **Do** marcar la sección activa con contraste invertido (tinta ↔ marfil).
- **Do** usar tablas en PC y tarjetas en celular para listas, con la hora de México y debajo la de Colombia.
- **Do** escribir el copy en español con tuteo, y que cada mensaje diga qué pasó y qué sigue.
- **Do** usar cifras tabulares en horas, conteos y paginación.

### Don't:

- **Don't** usar grises fríos ni #fff puro: el sistema es crema y marfil.
- **Don't** poner bordes laterales de color como acento ni etiquetas pequeñas en mayúsculas encima de los títulos.
- **Don't** usar sombras para separar bloques; usa tono o un anillo de 1px.
- **Don't** usar un tono de estado como decoración ni con otro significado.
