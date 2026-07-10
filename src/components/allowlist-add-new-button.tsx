import { RemoteCmdTerminalButton } from "@/components/remote-cmd-terminal-button";
import { softBtnMint } from "@/lib/soft-ui";

/**
 * Encola el comando remoto `allowlist_sync`: el addon lo recoge en unos
 * segundos y ejecuta `allowlist add "<gamertag>"` para cada miembro «nuevo»
 * (alta reciente en el directorio) y `allowlist remove "<gamertag>"` para
 * cada miembro inactivo o que se salió del grupo, sin esperar a que se
 * vuelva a descargar y subir el `allowlist.json` completo.
 */
export function AllowlistAddNewButton() {
  return (
    <RemoteCmdTerminalButton
      action="allowlist_sync"
      idleLabel="Actualizar lista (allowlist)"
      loadingLabel="Enviando…"
      doneLabel="Volver a actualizar"
      buttonClassName={softBtnMint}
      title='Ejecuta "allowlist add" para los nuevos y "allowlist remove" para los inactivos/salidos'
    />
  );
}
