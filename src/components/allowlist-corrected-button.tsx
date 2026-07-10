import { RemoteCmdTerminalButton } from "@/components/remote-cmd-terminal-button";
import { softBtnPeach } from "@/lib/soft-ui";

/**
 * Encola `allowlist_sync_corrected`: gamertags corregidos, reactivaciones
 * manuales (inactivo → activo) y bajas de nombres antiguos en el allowlist.
 */
export function AllowlistCorrectedButton() {
  return (
    <RemoteCmdTerminalButton
      action="allowlist_sync_corrected"
      idleLabel="Sincronizar gamertags corregidos"
      loadingLabel="Enviando…"
      doneLabel="Volver a sincronizar"
      buttonClassName={softBtnPeach}
      title='Ejecuta "allowlist add" / "allowlist remove" para correcciones de gamertag y para quien pasaste de inactivo a activo a mano'
    />
  );
}
