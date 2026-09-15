# Minecraft en el panel WSP

Dos dedicated Bedrock (`vanilla` y `mods`) hablan con las mismas APIs. El selector del dashboard cambia los datos; el directorio y el bot de WhatsApp son **una sola comunidad**.

## Copiar el addon

El pack es `x:\Code\Mine\minecraft\ScriptUsuarios\PlayerStatusBP`. **La misma copia** vale para los dos BDS.

Al arrancar, el addon guarda un **UUIDv4** en el mundo (`wsp_install_id`). Cada ping lo manda en `X-Minecraft-Install-Id`. En Ajustes asignás ese UUID a Vanilla o Mods. Hasta que no lo asignes, ese dedicated no escribe jugadores ni comandos.

Actualizar el pack **no** cambia el UUID. Mundo nuevo = UUID nuevo = volver a asignar.

Addon viejo sin UUID sigue usando `SERVER_ID` en `config.js` (legado).

Ajustes (`/dashboard/ajustes`) muestra pendientes, pings y el emparejado. Si cambiás el mundo, **Borrar conexión** suelta el UUID; el dedicated nuevo aparece para asignarlo otra vez. **Sincronizar ajustes** baja umbrales, parcelas, ítems baneados y exclusiones de monitoreo al addon. Las blacklist/whitelist se sincronizan con **Sincronizar listas** en Jugadores → Listas (el panel también las empuja tras un ban/unban o al exportar).

## Listas: la web manda

El addon **no** mete a nadie a la blacklist por llevar días sin entrar. Solo guarda última conexión y aplica lo que diga el panel.

| Umbral (Ajustes, por mundo) | Efecto |
|-----------------------------|--------|
| Días para inactivo (7) | Estado en roster / directorio. No kick. |
| Días para blacklist automática (14) | El **panel** marca blacklist. El BDS kickea al sincronizar listas. |
| Días para purgar en Bedrock (21) | El addon deja de listar esa fila local. No es un ban. |

- **Whitelist** en Jugadores: no entra al auto-ban por inactividad.
- **Sacar de blacklist** en el panel gana: no se re-banea aunque siga inactivo. El hold dura hasta que esa persona vuelva a entrar; si más adelante se ausenta otra vez N días, el auto vuelve a aplicar.
- Ban / unban / whitelist se hacen en Jugadores. Los `scriptevent playerstatus:blacklist_*` del mundo son emergencia; el próximo sync los pisa con la web.

Cambiar el mundo (UUID nuevo) **no** borra la blacklist del panel. Quien ya estaba baneado sigue baneado al sincronizar listas. Quien solo estaba inactivo puede entrar; al conectar se reactiva.

No confundir con el **allowlist nativo** de Bedrock (`allowlist add/remove`): eso decide quién ni siquiera conecta. Es otra lista (altas de nuevos, bajas de inactivos/salidos del grupo).

## Qué es por mundo

Jugadores, allowlist/blacklist, parcelas, monitoreo, comandos rápidos, umbrales e ítems baneados.

## Qué es de la comunidad

Directorio, bot, salida o ban de WhatsApp (baja allowlist en **los dos** mundos).
