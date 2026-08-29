# Minecraft en el panel WSP

Dos dedicated Bedrock (`vanilla` y `mods`) hablan con las mismas APIs. El selector del dashboard cambia los datos; el directorio y el bot de WhatsApp son **una sola comunidad**.

## Copiar el addon

El pack es `x:\minecraft\ScriptUsuarios\PlayerStatusBP`. **La misma copia** vale para los dos BDS.

Al arrancar, el addon guarda un **UUIDv4** en el mundo (`wsp_install_id`). Cada ping lo manda en `X-Minecraft-Install-Id`. En Ajustes asignás ese UUID a Vanilla o Mods. Hasta que no lo asignes, ese dedicated no escribe jugadores ni comandos.

Actualizar el pack **no** cambia el UUID. Mundo nuevo = UUID nuevo = volver a asignar.

Addon viejo sin UUID sigue usando `SERVER_ID` en `config.js` (legado).

Ajustes (`/dashboard/ajustes`) muestra pendientes, pings y el emparejado.

## Qué es por mundo

Jugadores, allowlist/blacklist, parcelas, monitoreo, comandos rápidos, umbrales e ítems baneados.

## Qué es de la comunidad

Directorio, bot, salida o ban de WhatsApp (baja allowlist en **los dos** mundos).
