"use client";

import { useState } from "react";
import { softBtnMint } from "@/lib/soft-ui";

/**
 * Encola el comando remoto `allowlist_sync`: el addon lo recoge en unos
 * segundos y ejecuta `allowlist add "<gamertag>"` para cada miembro «nuevo»
 * (alta reciente en el directorio) y `allowlist remove "<gamertag>"` para
 * cada miembro inactivo o que se salió del grupo, sin esperar a que se
 * vuelva a descargar y subir el `allowlist.json` completo.
 */
export function AllowlistAddNewButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/minecraft/remote-cmd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "allowlist_sync" }),
      });
      const data = (await res.json()) as {
        error?: string;
        targetGamertagsAdd?: string[] | null;
        targetGamertagsRemove?: string[] | null;
      };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo encolar el comando");
        return;
      }
      const addCount = data.targetGamertagsAdd?.length ?? 0;
      const removeCount = data.targetGamertagsRemove?.length ?? 0;
      setMessage(
        `Comando enviado: el addon añadirá ${addCount} gamertag${addCount === 1 ? "" : "s"} nuevo${
          addCount === 1 ? "" : "s"
        } y quitará ${removeCount} inactivo${removeCount === 1 ? "" : "s"}/salido${
          removeCount === 1 ? "" : "s"
        } del allowlist en unos segundos.`,
      );
    } catch {
      setMessage("Error de red al enviar el comando.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        disabled={loading}
        onClick={() => void run()}
        className={`${softBtnMint} self-start`}
        title='Ejecuta "allowlist add" para los nuevos y "allowlist remove" para los inactivos/salidos'
      >
        {loading ? "Enviando…" : "Actualizar lista (allowlist)"}
      </button>
      {message ? (
        <p className="max-w-sm text-xs text-zinc-600 dark:text-zinc-400" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
