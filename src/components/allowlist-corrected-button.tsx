import { RemoteCmdTerminalButton } from "@/components/remote-cmd-terminal-button";
import { softBtnPeach } from "@/lib/soft-ui";

/**
 * Encola `allowlist_sync_corrected`: añade el gamertag corregido y quita el
 * nombre erróneo que tenía en WhatsApp antes, tanto para correcciones
 * aprobadas en la auditoría como para ediciones manuales del gamertag hechas
 * desde la ficha del miembro.
 */
export function AllowlistCorrectedButton() {
  return (
    <RemoteCmdTerminalButton
      action="allowlist_sync_corrected"
      idleLabel="Sincronizar gamertags corregidos"
      loadingLabel="Enviando…"
      doneLabel="Volver a sincronizar"
      buttonClassName={softBtnPeach}
      title='Ejecuta "allowlist add" con el gamertag corregido y "allowlist remove" con el nombre erróneo'
    />
  );
}
