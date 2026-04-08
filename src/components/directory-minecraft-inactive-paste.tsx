"use client";

import { useActionState } from "react";
import {
  bulkMarkInactiveFromMinecraftLog,
  type InactiveLogResult,
} from "@/app/dashboard/actions";
import { softBtnPeach, softInputAmber, softPanel } from "@/lib/soft-ui";

export function DirectoryMinecraftInactivePaste() {
  const [state, formAction, pending] = useActionState<
    InactiveLogResult | null,
    FormData
  >(bulkMarkInactiveFromMinecraftLog, null);

  return (
    <div className={`${softPanel} gap-3`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
          Minecraft
        </p>
        <h3 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Log de jugadores inactivos (Minecraft)
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          Pega el log con líneas{" "}
          <code className="rounded-lg bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-amber-200/90 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800/50">
            [INACTIVO]
          </code>{" "}
          y{" "}
          <code className="rounded-lg bg-amber-100 px-1.5 py-0.5 font-mono text-xs text-zinc-800 ring-1 ring-amber-200/90 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800/50">
            última conexión
          </code>
          . Solo se cambia a{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">
            inactivo
          </strong>{" "}
          a quien esté <strong className="font-medium text-zinc-800 dark:text-zinc-200">activo</strong>{" "}
          y <strong className="font-medium text-zinc-800 dark:text-zinc-200">sin salida</strong> (sigue en
          roster). Quien ya esté en «se salió» o ya sea inactivo no se mueve de columna. Gamertag sin
          distinguir mayúsculas.
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Log del servidor
          <textarea
            name="log"
            required
            rows={12}
            disabled={pending}
            placeholder={`[2026-04-08 21:14:37:821 WARN] [Scripting] [PlayerStatus] Jugadores inactivos (51):\n\n[2026-04-08 …] [INACTIVO] jugador123 - última conexión: 2026-03-31 20:13\n…`}
            className={`${softInputAmber} min-h-[12rem] resize-y font-mono text-xs text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 disabled:opacity-60`}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className={`${softBtnPeach} self-start`}
        >
          {pending ? "Aplicando…" : "Marcar inactivos según el log"}
        </button>
      </form>

      {state && "error" in state ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      {state && "ok" in state && state.ok ? (
        <div className="rounded-2xl bg-amber-100 px-3 py-2 text-xs ring-1 ring-amber-200/90 dark:bg-amber-950/35 dark:ring-amber-800/50">
          <p className="font-semibold text-zinc-800 dark:text-amber-100">
            Líneas con gamertag en el log: {state.parsed}. Pasados a inactivo (solo activos en
            comunidad): {state.updated}
            {state.alreadyInactive > 0
              ? ` · Sin cambio (ya inactivos en comunidad): ${state.alreadyInactive}`
              : ""}
            {state.skippedLeft > 0
              ? ` · Sin cambio (ya se salieron; siguen en esa columna): ${state.skippedLeft}`
              : ""}
            {state.notFound.length > 0
              ? ` · No en tu lista: ${state.notFound.length}`
              : ""}
          </p>
          {state.notFound.length > 0 ? (
            <ul className="mt-2 max-h-36 list-inside list-disc space-y-0.5 overflow-y-auto text-zinc-600 dark:text-zinc-300">
              {state.notFound.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
