"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { XyzCoordFields } from "@/components/xyz-coord-fields";
import {
  orderAccountFirst,
  tpDestinationOptions,
} from "@/lib/minecraft-remote-commands";
import {
  softBtnDanger,
  softBtnLavender,
  softBtnMint,
  softBtnPeach,
  softBtnPrimary,
  softInputNeutral,
  softPanel,
  softSelectNeutral,
} from "@/lib/soft-ui";

type Props = {
  /** Gamertag de la cuenta logueada: origen si está en línea. */
  defaultOriginGamertag: string;
  worldName: string;
  variant?: "full" | "compact";
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

export function MinecraftRemoteCommandsPanel({
  defaultOriginGamertag,
  worldName,
  variant = "full",
}: Props) {
  const compact = variant === "compact";
  const idPrefix = compact ? "quick-cmd" : "remote-cmd";
  const [targetGamertag, setTargetGamertag] = useState(defaultOriginGamertag);
  const [tpTo, setTpTo] = useState("");
  const [coordX, setCoordX] = useState("");
  const [coordY, setCoordY] = useState("");
  const [coordZ, setCoordZ] = useState("");
  const [onlinePlayers, setOnlinePlayers] = useState<string[]>([]);
  const [onlineReportedAt, setOnlineReportedAt] = useState<string | null>(null);
  const [onlineFresh, setOnlineFresh] = useState(false);
  const [loading, setLoading] = useState<CmdAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const originOptions = useMemo(() => {
    const ordered = orderAccountFirst(onlinePlayers, defaultOriginGamertag);
    const account = defaultOriginGamertag.trim();
    if (account && !ordered.some((player) => sameTag(player, account))) {
      return [account, ...ordered];
    }
    return ordered;
  }, [onlinePlayers, defaultOriginGamertag]);

  const destOptions = useMemo(
    () =>
      orderAccountFirst(
        tpDestinationOptions(onlinePlayers, targetGamertag),
        defaultOriginGamertag,
      ),
    [onlinePlayers, targetGamertag, defaultOriginGamertag],
  );

  const selectedOnline = useMemo(
    () =>
      Boolean(targetGamertag) &&
      onlinePlayers.some((player) => sameTag(player, targetGamertag)),
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
      /* el siguiente intento lo recupera */
    }
  }, []);

  useEffect(() => {
    void refreshOnline();
    const id = setInterval(() => void refreshOnline(), ONLINE_POLL_MS);
    return () => clearInterval(id);
  }, [refreshOnline]);

  useEffect(() => {
    setTpTo((prev) => {
      if (destOptions.some((player) => sameTag(player, prev))) return prev;
      return destOptions[0] ?? "";
    });
  }, [destOptions]);

  function requireOnlineOrigin(): boolean {
    const tag = targetGamertag.trim();
    if (!tag) {
      setMessage("Elige un jugador que esté en línea.");
      return false;
    }
    if (!onlinePlayers.some((player) => sameTag(player, tag))) {
      setMessage(
        `${tag} no está en línea en este mundo. Elige a otra persona o espera a que entre.`,
      );
      return false;
    }
    return true;
  }

  async function send(action: CmdAction) {
    setMessage(null);
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
      if (!requireOnlineOrigin()) return;
      body.targetGamertag = targetGamertag.trim();
    }

    if (action === "tp") {
      const to = tpTo.trim();
      if (!to) {
        setMessage("Elige a quién teletransportar.");
        return;
      }
      if (sameTag(body.targetGamertag ?? "", to)) {
        setMessage("Origen y destino tienen que ser distintos.");
        return;
      }
      body.destinationGamertag = to;
    }

    if (action === "tp_coords") {
      body.destinationX = coordX;
      body.destinationY = coordY;
      body.destinationZ = coordZ;
    }

    setLoading(action);
    try {
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
          "Comando enviado al servidor. El addon lo ejecuta en unos segundos.",
        );
      }
    } catch {
      setMessage("Error de red al enviar el comando.");
    } finally {
      setLoading(null);
    }
  }

  const onlineLabel =
    onlineFresh && onlineReportedAt
      ? `Actualizado ${new Date(onlineReportedAt).toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}`
      : "Sin roster fresco del addon";

  const needsOrigin = loading !== null || !selectedOnline;
  const fieldLabel =
    "block text-xs font-semibold text-zinc-800 dark:text-zinc-200";

  const originBlock = (
    <div>
      <label htmlFor={`${idPrefix}-target`} className={fieldLabel}>
        Jugador (origen)
      </label>
      <select
        id={`${idPrefix}-target`}
        value={targetGamertag}
        onChange={(event) => setTargetGamertag(event.target.value)}
        className={`mt-1.5 w-full ${softSelectNeutral}`}
      >
        {originOptions.map((name) => {
          const online = onlinePlayers.some((player) => sameTag(player, name));
          return (
            <option key={name} value={name}>
              {name}
              {online ? "" : " · no está en línea"}
              {sameTag(name, defaultOriginGamertag) ? " · tu cuenta" : ""}
            </option>
          );
        })}
      </select>
      <p className="mt-1.5 text-xs text-zinc-500">{onlineLabel}.</p>
      {targetGamertag && rosterKnown && !selectedOnline ? (
        <p
          className="mt-2 rounded-2xl bg-amber-100 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-300/80 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800/50"
          role="status"
        >
          {targetGamertag} no está en línea. Elige a otra persona o espera a que
          entre.
        </p>
      ) : null}
    </div>
  );

  const actionButtons = (
    <div className={`grid gap-2 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>
      <button
        type="button"
        disabled={needsOrigin}
        onClick={() => void send("spectator")}
        className={softBtnLavender}
      >
        {loading === "spectator" ? "Enviando…" : "Modo espectador"}
      </button>
      <button
        type="button"
        disabled={needsOrigin}
        onClick={() => void send("survival")}
        className={softBtnMint}
      >
        {loading === "survival" ? "Enviando…" : "Modo survival"}
      </button>
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => void send("kill_silverfish")}
        className={softBtnPrimary}
      >
        {loading === "kill_silverfish" ? "Enviando…" : "Eliminar silverfish"}
      </button>
      <button
        type="button"
        disabled={loading !== null}
        onClick={() => void send("kill_withers")}
        className={softBtnDanger}
      >
        {loading === "kill_withers" ? "Enviando…" : "Eliminar withers"}
      </button>
      <button
        type="button"
        disabled={needsOrigin}
        onClick={() => void send("extinguish_fire")}
        className={`${softBtnPeach} sm:col-span-2`}
        title="Borra fire y soul_fire en un radio de 24 alrededor del jugador."
      >
        {loading === "extinguish_fire" ? "Enviando…" : "Apagar fuego alrededor"}
      </button>
    </div>
  );

  const tpBlock = (
    <div className={compact ? "flex flex-col gap-3" : "flex flex-col gap-4"}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Teleport
          </h3>
          {!compact ? (
            <p className="mt-1 max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
              Tu cuenta va primero en las dos listas. Elige cualquier origen y
              cualquier otro jugador en línea: dos personas que no son admin, o
              una persona hacia el admin. Coordenadas: eje vacío = ~.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void refreshOnline()}
          className="rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-300/80 hover:bg-zinc-100 dark:text-zinc-200 dark:ring-zinc-700 dark:hover:bg-zinc-800"
        >
          Actualizar online
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-tp-from`} className={fieldLabel}>
            Origen
          </label>
          <select
            id={`${idPrefix}-tp-from`}
            value={targetGamertag}
            onChange={(event) => setTargetGamertag(event.target.value)}
            className={softSelectNeutral}
          >
            {originOptions.map((name) => {
              const online = onlinePlayers.some((player) => sameTag(player, name));
              return (
                <option key={`from-${name}`} value={name}>
                  {name}
                  {sameTag(name, defaultOriginGamertag) ? " · tu cuenta" : ""}
                  {online ? "" : " · no está en línea"}
                </option>
              );
            })}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${idPrefix}-tp-to`} className={fieldLabel}>
            Destino
          </label>
          <select
            id={`${idPrefix}-tp-to`}
            value={tpTo}
            onChange={(event) => setTpTo(event.target.value)}
            disabled={destOptions.length === 0}
            className={softSelectNeutral}
          >
            {destOptions.length === 0 ? (
              <option value="">Nadie más en línea</option>
            ) : (
              destOptions.map((name) => (
                <option key={`to-${name}`} value={name}>
                  {name}
                  {sameTag(name, defaultOriginGamertag) ? " · tu cuenta" : ""}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <button
        type="button"
        disabled={needsOrigin || destOptions.length === 0 || !tpTo}
        onClick={() => void send("tp")}
        className={`${softBtnPrimary} w-full sm:w-auto`}
      >
        {loading === "tp" ? "Enviando…" : "Teleportar al jugador"}
      </button>

      <div className="border-t border-zinc-200/80 pt-3 dark:border-zinc-800/80">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          A coordenadas
        </h4>
        {!compact ? (
          <p className="mt-1 text-xs text-zinc-500">
            Eje vacío = ~. Puedes pegar las tres en X:{" "}
            <span className="font-mono">1304, 76, 4848</span> o{" "}
            <span className="font-mono">-8532 67 -10351</span>.
          </p>
        ) : null}
        <div className="mt-2">
          <XyzCoordFields
            idPrefix={`${idPrefix}-coord`}
            values={{ x: coordX, y: coordY, z: coordZ }}
            onChange={({ x, y, z }) => {
              setCoordX(x);
              setCoordY(y);
              setCoordZ(z);
            }}
            placeholders={{ x: "~", y: "~", z: "~" }}
            inputClassName={softInputNeutral}
          />
        </div>
        <button
          type="button"
          disabled={needsOrigin}
          onClick={() => void send("tp_coords")}
          className={`${softBtnLavender} mt-3 w-full sm:w-auto`}
        >
          {loading === "tp_coords" ? "Enviando…" : "Teleportar a coordenadas"}
        </button>
      </div>
    </div>
  );

  return (
    <div className={compact ? "flex flex-col gap-4" : "flex flex-col gap-6"}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Salen al mundo <span className="font-medium text-zinc-900 dark:text-zinc-100">{worldName}</span>.
        {compact
          ? " El origen es tu cuenta si estás en línea."
          : " El jugador de abajo tiene que estar en línea: sirve para espectador, survival, fuego y como origen del TP."}
      </p>
      {compact ? (
        <div className={softPanel}>
          {originBlock}
          {actionButtons}
          {tpBlock}
        </div>
      ) : (
        <>
          <div className={softPanel}>{originBlock}</div>
          {actionButtons}
          <p className="text-xs text-zinc-500">
            Para salvar una casa: teletransporta al jugador al incendio y pulsa
            apagar fuego. Quita bloques de fuego y soul fire en radio 24.
          </p>
          <div className={softPanel}>{tpBlock}</div>
        </>
      )}
      {message ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
