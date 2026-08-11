"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type AdminOption = {
  id: string;
  gamertag: string;
  displayName: string | null;
};

type Props = {
  admins: AdminOption[];
};

type CmdAction =
  | "spectator"
  | "survival"
  | "tp"
  | "kill_silverfish"
  | "kill_withers";

const ONLINE_POLL_MS = 10_000;

function sameTag(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function MinecraftRemoteCommandsPanel({ admins }: Props) {
  const [targetGamertag, setTargetGamertag] = useState(
    () => admins[0]?.gamertag ?? "",
  );
  const [tpFrom, setTpFrom] = useState("");
  const [tpTo, setTpTo] = useState("");
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([]);
  const [onlineReportedAt, setOnlineReportedAt] = useState<string | null>(null);
  const [onlineFresh, setOnlineFresh] = useState(false);
  const [loading, setLoading] = useState<CmdAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const adminTagsLower = useMemo(
    () => new Set(admins.map((a) => a.gamertag.trim().toLowerCase())),
    [admins],
  );

  const onlineMods = useMemo(
    () => onlinePlayers.filter((p) => adminTagsLower.has(p.toLowerCase())),
    [onlinePlayers, adminTagsLower],
  );

  const refreshOnline = useCallback(async () => {
    try {
      const res = await fetch("/api/minecraft/online");
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok?: boolean;
        players?: string[];
        reportedAt?: string | null;
        fresh?: boolean;
      };
      if (!data.ok) return;
      const players = Array.isArray(data.players) ? data.players : [];
      setOnlinePlayers(players);
      setOnlineReportedAt(data.reportedAt ?? null);
      setOnlineFresh(Boolean(data.fresh));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshOnline();
    const id = setInterval(() => void refreshOnline(), ONLINE_POLL_MS);
    return () => clearInterval(id);
  }, [refreshOnline]);

  useEffect(() => {
    if (onlineMods.length === 0) {
      setTpFrom("");
      return;
    }
    setTpFrom((prev) =>
      prev && onlineMods.some((p) => sameTag(p, prev)) ? prev : onlineMods[0],
    );
  }, [onlineMods]);

  useEffect(() => {
    if (onlinePlayers.length === 0) {
      setTpTo("");
      return;
    }
    setTpTo((prev) => {
      const candidates = onlinePlayers.filter((p) => !sameTag(p, tpFrom));
      const pool = candidates.length > 0 ? candidates : onlinePlayers;
      if (prev && pool.some((p) => sameTag(p, prev)) && !sameTag(prev, tpFrom)) {
        return prev;
      }
      return pool[0] ?? "";
    });
  }, [onlinePlayers, tpFrom]);

  async function send(
    action: CmdAction,
    extra?: { targetGamertag?: string; destinationGamertag?: string },
  ) {
    setLoading(action);
    setMessage(null);
    try {
      const body: {
        action: CmdAction;
        targetGamertag?: string;
        destinationGamertag?: string;
      } = { action };

      if (action === "spectator" || action === "survival") {
        const tag = (extra?.targetGamertag ?? targetGamertag).trim();
        if (!tag) {
          setMessage("Elegí un admin del listado.");
          return;
        }
        body.targetGamertag = tag;
      }

      if (action === "tp") {
        const from = (extra?.targetGamertag ?? tpFrom).trim();
        const to = (extra?.destinationGamertag ?? tpTo).trim();
        if (!from || !to) {
          setMessage("Elegí moderador origen y jugador destino (online).");
          return;
        }
        if (sameTag(from, to)) {
          setMessage("Origen y destino deben ser distintos.");
          return;
        }
        body.targetGamertag = from;
        body.destinationGamertag = to;
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
        action === "tp"
          ? `TP encolado: ${body.targetGamertag} → ${body.destinationGamertag}. El addon lo ejecuta en unos segundos.`
          : "Comando enviado al servidor. El addon lo ejecuta en unos segundos (polling rápido).",
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

  const onlineLabel =
    onlineFresh && onlineReportedAt
      ? `Actualizado ${new Date(onlineReportedAt).toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}`
      : "Sin roster fresco del addon (espera ~30 s o revisá que el pack esté cargado)";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Los comandos se encolan en la misma cola ligera que el sync del addon (sin
        tablas nuevas). Solo gamertags con rol{" "}
        <span className="font-medium">admin</span> en el directorio pueden usarse
        para espectador / survival / origen del TP.
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
          onClick={() => void send("kill_silverfish")}
          className="rounded-lg bg-zinc-800 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-900 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        >
          {loading === "kill_silverfish"
            ? "Enviando…"
            : "Eliminar todos los silverfish"}
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

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Teleport (TP)
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Mueve un moderador online hacia otro jugador online (incluye
              moderadores en el destino). {onlineLabel}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshOnline()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Actualizar online
          </button>
        </div>

        {onlinePlayers.length === 0 ? (
          <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
            Nadie online reportado. Cuando el addon publique el roster vas a
            poder elegir origen y destino.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Moderador (origen)
              <select
                value={tpFrom}
                onChange={(e) => setTpFrom(e.target.value)}
                disabled={onlineMods.length === 0}
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                {onlineMods.length === 0 ? (
                  <option value="">Ningún admin online</option>
                ) : (
                  onlineMods.map((name) => (
                    <option key={`from-${name}`} value={name}>
                      {name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Jugador (destino, incluye mods)
              <select
                value={tpTo}
                onChange={(e) => setTpTo(e.target.value)}
                className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              >
                {onlinePlayers
                  .filter((p) => !sameTag(p, tpFrom))
                  .map((name) => (
                    <option key={`to-${name}`} value={name}>
                      {name}
                      {adminTagsLower.has(name.toLowerCase()) ? " (mod)" : ""}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        )}

        <button
          type="button"
          disabled={
            loading !== null ||
            !tpFrom ||
            !tpTo ||
            onlineMods.length === 0 ||
            sameTag(tpFrom, tpTo)
          }
          onClick={() => void send("tp")}
          className="mt-4 rounded-lg bg-sky-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          {loading === "tp" ? "Enviando…" : "Teleportar moderador → jugador"}
        </button>
      </div>

      {message ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
