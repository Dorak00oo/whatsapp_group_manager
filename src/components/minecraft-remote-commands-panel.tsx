"use client";

import { useState } from "react";

export type AdminOption = {
  id: string;
  gamertag: string;
  displayName: string | null;
};

type Props = {
  admins: AdminOption[];
};

type CmdAction = "spectator" | "survival" | "kill_endermites" | "kill_withers";

export function MinecraftRemoteCommandsPanel({ admins }: Props) {
  const [targetGamertag, setTargetGamertag] = useState(
    () => admins[0]?.gamertag ?? "",
  );
  const [loading, setLoading] = useState<CmdAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function send(action: CmdAction) {
    setLoading(action);
    setMessage(null);
    try {
      const body: { action: CmdAction; targetGamertag?: string } = { action };
      if (action === "spectator" || action === "survival") {
        if (!targetGamertag.trim()) {
          setMessage("Elegí un admin del listado.");
          return;
        }
        body.targetGamertag = targetGamertag.trim();
      }

      const res = await fetch("/api/minecraft/remote-cmd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo encolar el comando");
        return;
      }
      setMessage(
        "Comando enviado al servidor. El addon lo ejecuta en unos segundos (polling rápido).",
      );
    } catch {
      setMessage("Error de red al enviar el comando.");
    } finally {
      setLoading(null);
    }
  }

  const labelFor = (a: AdminOption) =>
    a.displayName?.trim()
      ? `${a.displayName.trim()} (${a.gamertag})`
      : a.gamertag;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Los comandos se encolan en la misma cola ligera que el sync del addon (sin
        tablas nuevas). Solo gamertags con rol{" "}
        <span className="font-medium">admin</span> en el directorio pueden usarse
        para espectador / survival.
      </p>

      {admins.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          No hay admins en el directorio. Marcá al menos una persona como admin
          en la lista.
        </p>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label
            htmlFor="remote-cmd-target"
            className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Admin (gamertag en el servidor)
          </label>
          <select
            id="remote-cmd-target"
            value={targetGamertag}
            onChange={(e) => setTargetGamertag(e.target.value)}
            className="mt-2 w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          >
            {admins.map((a) => (
              <option key={a.id} value={a.gamertag}>
                {labelFor(a)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={loading !== null || admins.length === 0}
          onClick={() => void send("spectator")}
          className="rounded-lg bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {loading === "spectator" ? "Enviando…" : "Modo espectador (admin)"}
        </button>
        <button
          type="button"
          disabled={loading !== null || admins.length === 0}
          onClick={() => void send("survival")}
          className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading === "survival" ? "Enviando…" : "Modo survival (admin)"}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void send("kill_endermites")}
          className="rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-900 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        >
          {loading === "kill_endermites"
            ? "Enviando…"
            : "Eliminar todos los endermitas"}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => void send("kill_withers")}
          className="rounded-lg bg-red-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-800 disabled:opacity-50"
        >
          {loading === "kill_withers"
            ? "Enviando…"
            : "Eliminar todos los withers"}
        </button>
      </div>

      {message ? (
        <p
          className="text-sm text-zinc-600 dark:text-zinc-400"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
