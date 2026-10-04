# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Los admins de una comunidad de jugadores que vive en un grupo de WhatsApp y en dos mundos de Minecraft Bedrock (Vanilla y Mods). Drako274 es el dueño y el único que administra las cuentas del panel. Los admins entran sobre todo desde la PC, con su gamertag y una contraseña grupal, para revisar y corregir el estado de la comunidad y moderar.

## Product Purpose

Panel WSP (`https://wsp.drk000.dev`): mantener el directorio de miembros alineado entre el grupo de WhatsApp y los servidores de Minecraft, y moderar la comunidad desde un solo lugar. Éxito: saber de un vistazo quién está activo, inactivo, nuevo, ausente o se salió, y actuar (strikes, baneos, allowlist, comandos al servidor) sin entrar al juego ni revisar el grupo a mano.

## Positioning

Une tres fuentes que en otros lados están separadas: el grupo de WhatsApp (vía WspBot, que avisa entradas y salidas y da altas con `.addwsp`), el addon PlayerStatusBP en los dos BDS (actividad real, parcelas, vandalismo, comandos remotos) y el directorio propio con su historial.

## Operating Context

- Directorio de miembros: gamertag, nombre, teléfono o @usuario de WhatsApp, país, edad, situación (activo, inactivo, nuevo, ausente con causa, se salió), admin, protegido/activo permanente, strikes y baneos.
- Sincronización con Minecraft: el addon manda heartbeats; quien no está activo en ningún mundo pasa a inactivo salvo que sea activo permanente.
- Selector de mundo (Vanilla | Mods) que cambia roster, parcelas, monitoreo y comandos.
- WspBot: consola con QR/código de vinculación y encendido/apagado vía Coolify.
- Self-hosted en Coolify con Postgres; el addon se copia a mano a los dos BDS.

## Capabilities and Constraints

- Directorio de 300 a 1000 personas y creciendo: listas paginadas, conteos desde la base.
- Login por gamertag + contraseña grupal para admins con cuenta; Drako274 con contraseña propia y acceso exclusivo a la gestión de cuentas.
- Historial de cambios con actor (cuenta del panel, admin desde WhatsApp o sistema).
- Importación y exportación del directorio en CSV.
- Copy en español. Formatos de hora de México/Colombia.
- Sin registro público, sin datos de terceros fuera de la comunidad.

## Brand Commitments

Nombre visible del panel: "WSP" / nombre de la comunidad configurable (`COMMUNITY_DISPLAY_NAME`). Sin marca, logo ni voz adicional confirmados.

## Evidence on Hand

Datos reales de la comunidad en la base de producción (no copiarlos a mocks). No hay testimonios, métricas públicas ni capturas de marketing; no inventarlos.

## Product Principles

- El estado real manda: lo que muestra el panel sale de la base y del addon, no de supuestos.
- Rápido de escanear en PC: conteos y estado arriba, detalle a un clic.
- Cada cambio deja rastro de quién lo hizo.
- No romper los flujos que ya usan los admins al agregar funciones.
