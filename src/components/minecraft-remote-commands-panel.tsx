"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { XyzCoordFields } from "@/components/xyz-coord-fields";

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
  | "tp_coords"
  | "kill_silverfish"
  | "kill_withers"
  | "extinguish_fire";

const ONLINE_POLL_MS = 10_000;

function sameTag(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function MinecraftRemoteCommandsPanel({ admins }: Props) {
  const [targetGamertag, setTargetGamertag] = useState(
    () => admins[0]?.gamertag ?? "",
  );
  const [tpTo, setTpTo] = useState("");
  const [coordX, setCoordX] = useState("");
  const [coordY, setCoordY] = useState("");
  const [coordZ, setCoordZ] = useState("");
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([]);
  const [onlineReportedAt, setOnlineReportedAt] = useState<string | null>(null);
  const [onlineFresh, setOnlineFresh] = useState(false);
  const [loading, setLoading] = useState<CmdAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const adminTagsLower = useMemo(
    () => new Set(admins.map((a) => a.gamertag.trim().toLowerCase())),
    [admins],
  );

  const selectedOnline = useMemo(
    () =>
      Boolean(targetGamertag) &&
      onlinePlayers.some((p) => sameTag(p, targetGamertag)),
    [onlinePlayers, targetGamertag],
  );

  const rosterKnown = onlineFresh || onlinePlayers.length > 0;

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
    if (onlinePlayers.length === 0) {
      setTpTo("");
      return;
    }
    setTpTo((prev) => {
      const candidates = onlinePlayers.filter(
        (p) => !sameTag(p, targetGamertag),
      );
      const pool = candidates.length > 0 ? candidates : onlinePlayers;
      if (
        prev &&
        pool.some((p) => sameTag(p, prev)) &&
        !sameTag(prev, targetGamertag)
      ) {
        return prev;
      }
      return pool[0] ?? "";
    });
  }, [onlinePlayers, targetGamertag]);

  function requireActiveModerator(): boolean {
    const tag = targetGamertag.trim();
    if (!tag) {
      setMessage("Elegí un admin del listado.");
      return false;
    }
    if (!onlinePlayers.some((p) => sameTag(p, tag))) {
      setMessage(
        `${tag} no está activo en el servidor. Cambiá el gamertag o pedile que entre.`,
      );
      return false;
    }
    return true;
  }

  async function send(
    action: CmdAction,
    extra?: { targetGamertag?: string; destinationGamertag?: string },
  ) {
    setLoading(action);
    setMessage(null);
    try {
      const body: {
        action:
          | "spectator"
          | "survival"
          | "tp"
          | "kill_silverfish"
          | "kill_withers"
          | "extinguish_fire";
        targetGamertag?: string;
        destinationGamertag?: string;
        destinationX?: string;
        destinationY?: string;
        destinationZ?: string;
      } = {
        action: action === "tp_coords" ? "tp" : action,
      };

      if (
        action === "spectator" ||
        action === "survival" ||
        action === "tp" ||
        action === "tp_coords" ||
        action === "extinguish_fire"
      ) {
        if (!requireActiveModerator()) return;
        body.targetGamertag = (
          extra?.targetGamertag ?? targetGamertag
        ).trim();
      }

      if (action === "tp") {
        const to = (extra?.destinationGamertag ?? tpTo).trim();
        if (!to) {
          setMessage("Elegí un jugador destino (online).");
          return;
        }
        if (sameTag(body.targetGamertag ?? "", to)) {
          setMessage("Origen y destino deben ser distintos.");
          return;
        }
        body.destinationGamertag = to;
      }

      if (action === "tp_coords") {
        body.destinationX = coordX;
        body.destinationY = coordY;
        body.destinationZ = coordZ;
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
      if (action === "tp") {
        setMessage(
          `TP encolado: ${body.targetGamertag} → ${body.destinationGamertag}. El addon lo ejecuta en unos segundos.`,
        );
      } else if (action === "tp_coords") {
        const x = coordX.trim() || "~";
        const y = coordY.trim() || "~";
        const z = coordZ.trim() || "~";
        setMessage(
          `TP encolado: ${body.targetGamertag} → ${x} ${y} ${z}. El addon lo ejecuta en unos segundos.`,
        );
      } else if (action === "extinguish_fire") {
        setMessage(
          `Apagar fuego encolado alrededor de ${body.targetGamertag}. El addon lo ejecuta en unos segundos (radio 24).`,
        );
      } else {
        setMessage(
          "Comando enviado al servidor. El addon lo ejecuta en unos segundos (polling rápido).",
        );
      }
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

  const needsModerator = loading !== null || admins.length === 0 || !selectedOnline;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Los comandos se encolan en la misma cola ligera que el sync del addon (sin
        tablas nuevas). El gamertag de abajo se usa para espectador, survival y
        origen del TP: tiene que estar marcado como{" "}
        <span className="font-medium">admin</span> en el directorio y activo en
        el servidor.
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
            Moderador (gamertag)
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
                {onlinePlayers.some((p) => sameTag(p, a.gamertag))
                  ? " · online"
                  : ""}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-zinc-500">{onlineLabel}.</p>
          {targetGamertag && rosterKnown && !selectedOnline ? (
            <p
              className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
              role="status"
            >
              {targetGamertag} no está activo en el servidor. Cambiá el gamertag
              o pedile que entre.
            </p>
          ) : null}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={needsModerator}
          onClick={() => void send("spectator")}
          className="rounded-lg bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-700 disabled:opacity-50"
        >
          {loading === "spectator" ? "Enviando…" : "Modo espectador (admin)"}
        </button>
        <button
          type="button"
          disabled={needsModerator}
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
        <button
          type="button"
          disabled={needsModerator}
          onClick={() => void send("extinguish_fire")}
          className="rounded-lg bg-orange-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-700 disabled:opacity-50 sm:col-span-2"
          title="Borra fire y soul_fire en un radio de 24 alrededor del admin. Teleportalo a la casa primero."
        >
          {loading === "extinguish_fire"
            ? "Enviando…"
            : "Apagar fuego alrededor del admin"}
        </button>
        <p className="text-xs text-zinc-500 sm:col-span-2">
          Para salvar una casa: teletransportá al admin al incendio y pulsá
          apagar fuego. Quita bloques de fuego/soul_fire en radio 24 (no toca
          lava ni cambia gamerules).
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Teleport (TP)
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Usa el moderador de arriba como origen. Destino: otro jugador
              online o coordenadas (eje vacío = ~). {onlineLabel}.
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
            poder elegir destino y mandar TP.
          </p>
        ) : (
          <div className="mt-3 flex max-w-md flex-col gap-2">
            <label
              htmlFor="remote-cmd-tp-to"
              className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Jugador (destino, incluye mods)
            </label>
            <select
              id="remote-cmd-tp-to"
              value={tpTo}
              onChange={(e) => setTpTo(e.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            >
              {onlinePlayers
                .filter((p) => !sameTag(p, targetGamertag))
                .map((name) => (
                  <option key={`to-${name}`} value={name}>
                    {name}
                    {adminTagsLower.has(name.toLowerCase()) ? " (mod)" : ""}
                  </option>
                ))}
            </select>
          </div>
        )}

        <button
          type="button"
          disabled={
            needsModerator || !tpTo || sameTag(targetGamertag, tpTo)
          }
          onClick={() => void send("tp")}
          className="mt-4 rounded-lg bg-sky-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
        >
          {loading === "tp" ? "Enviando…" : "Teleportar moderador → jugador"}
        </button>

        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            TP a coordenadas
          </h4>
          <p className="mt-1 text-xs text-zinc-500">
            Eje vacío = ~ (no se mueve). Pegá las tres en X:{" "}
            <span className="font-mono">1304, 76, 4848</span> o{" "}
            <span className="font-mono">-8532 67 -10351</span>.
          </p>
          <div className="mt-3">
            <XyzCoordFields
              idPrefix="tp-coord"
              values={{ x: coordX, y: coordY, z: coordZ }}
              onChange={({ x, y, z }) => {
                setCoordX(x);
                setCoordY(y);
                setCoordZ(z);
              }}
              placeholders={{ x: "~", y: "~", z: "~" }}
              inputClassName="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
            />
          </div>
          <button
            type="button"
            disabled={needsModerator}
            onClick={() => void send("tp_coords")}
            className="mt-4 w-full rounded-lg bg-sky-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-800 disabled:opacity-50 sm:w-auto"
          >
            {loading === "tp_coords"
              ? "Enviando…"
              : "Teleportar a coordenadas"}
          </button>
        </div>
      </div>

      {message ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
