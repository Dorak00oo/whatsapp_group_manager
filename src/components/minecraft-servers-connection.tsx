"use client";

import { useCallback, useEffect, useState } from "react";
import { assignMinecraftInstallAction } from "@/app/dashboard/minecraft-install-actions";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import {
  MINECRAFT_SERVER_IDS,
  flavorLabel,
  minecraftLinkStatus,
  minecraftLinkStatusLabel,
  parseMinecraftServerId,
  type MinecraftServerId,
} from "@/lib/minecraft-server";
import { softPanel } from "@/lib/soft-ui";

export type MinecraftServerLinkRow = {
  id: string;
  name: string;
  flavor: string;
  edition: string;
  lastSeenAt: string | null;
  lastVersion: string | null;
  lastWorldName: string | null;
};

export type MinecraftInstallLinkRow = {
  id: string;
  serverId: MinecraftServerId | null;
  lastWorldName: string | null;
  lastVersion: string | null;
  lastSeenAt: string;
  assignedAt: string | null;
};

type Props = {
  selectedWorld: MinecraftServerId;
  initialServers: MinecraftServerLinkRow[];
  initialInstalls?: MinecraftInstallLinkRow[];
};

const POLL_MS = 5_000;

const STATUS_TONE: Record<
  ReturnType<typeof minecraftLinkStatus>,
  string
> = {
  live: "bg-emerald-200 text-zinc-900 dark:bg-emerald-800/85 dark:text-emerald-50",
  quiet: "bg-amber-200 text-zinc-900 dark:bg-amber-800/80 dark:text-amber-50",
  offline: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  never: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function sortServers(rows: MinecraftServerLinkRow[]): MinecraftServerLinkRow[] {
  const byId = new Map(rows.map((s) => [s.id, s]));
  return MINECRAFT_SERVER_IDS.map(
    (id) =>
      byId.get(id) ?? {
        id,
        name: id === "vanilla" ? "Vanilla" : "Mods",
        flavor: id,
        edition: "bedrock",
        lastSeenAt: null,
        lastVersion: null,
        lastWorldName: null,
      },
  );
}

function shortInstallId(id: string) {
  return id.slice(0, 8);
}

export function MinecraftServersConnection({
  selectedWorld,
  initialServers,
  initialInstalls = [],
}: Props) {
  const [servers, setServers] = useState(() => sortServers(initialServers));
  const [installs, setInstalls] = useState(initialInstalls);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/minecraft/servers");
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        servers?: MinecraftServerLinkRow[];
        installs?: MinecraftInstallLinkRow[];
      };
      if (!res.ok || !data.ok || !Array.isArray(data.servers)) {
        setError(data.error ?? "No se pudo leer el estado");
        return;
      }
      setServers(sortServers(data.servers));
      setInstalls(Array.isArray(data.installs) ? data.installs : []);
      setNowMs(Date.now());
      setError(null);
    } catch {
      setError("Error de red al consultar los servidores");
    }
  }, []);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      if (id !== undefined) return;
      id = setInterval(() => {
        setNowMs(Date.now());
        void refresh();
      }, POLL_MS);
    };
    const stop = () => {
      if (id !== undefined) {
        clearInterval(id);
        id = undefined;
      }
    };
    const onVis = () => {
      stop();
      if (document.visibilityState === "visible") {
        void refresh();
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const pending = installs.filter((row) => row.serverId === null);
  const assignedByWorld = new Map(
    installs
      .filter((row) => row.serverId)
      .map((row) => [row.serverId as MinecraftServerId, row]),
  );

  const assign = async (installId: string, serverId: MinecraftServerId) => {
    setBusyId(installId);
    try {
      const result = await assignMinecraftInstallAction(installId, serverId);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={softPanel}>
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Conexión con los servidores
        </h3>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          El mismo addon puede ir en los dos BDS. Cada mundo genera un UUIDv4;
          acá lo asignás a Vanilla o Mods. Hasta que no lo asignes, ese dedicated
          no escribe jugadores ni comandos.
        </p>
      </div>

      {pending.length > 0 ? (
        <div className="rounded-2xl bg-amber-50/80 p-4 ring-1 ring-amber-200/70 dark:bg-amber-950/30 dark:ring-amber-900/50">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Dedicated sin asignar
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {pending.map((row) => {
              const seen = formatInstantMexicoColombia(new Date(row.lastSeenAt));
              return (
                <li key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {row.lastWorldName ?? "Mundo sin nombre"}{" "}
                      <span className="font-mono text-xs text-zinc-500">
                        {shortInstallId(row.id)}…
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      Último ping: {seen.mexico} (MX) · {seen.colombia} (CO)
                      {row.lastVersion ? ` · ${row.lastVersion}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {servers.map((world) => {
                      const id = parseMinecraftServerId(world.id) ?? "vanilla";
                      return (
                        <button
                          key={id}
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void assign(row.id, id)}
                          className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                        >
                          Es {world.name}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {servers.map((row) => {
          const id = parseMinecraftServerId(row.id) ?? "vanilla";
          const status = minecraftLinkStatus(row.lastSeenAt, nowMs);
          const lastSeen = row.lastSeenAt
            ? formatInstantMexicoColombia(new Date(row.lastSeenAt))
            : null;
          const selected = id === selectedWorld;
          const linked = assignedByWorld.get(id);
          return (
            <li
              key={id}
              className={`rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200/80 dark:bg-zinc-900/50 dark:ring-zinc-800/80 ${
                selected ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {row.name}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[status]}`}
                >
                  {minecraftLinkStatusLabel(status)}
                </span>
                {selected ? (
                  <span className="text-[11px] font-medium text-zinc-500">
                    Editando ahora
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {flavorLabel(row.flavor, row.edition)}
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {lastSeen
                  ? `Último ping: ${lastSeen.mexico} (MX) · ${lastSeen.colombia} (CO)`
                  : "Este BDS todavía no ha llamado al panel."}
              </p>
              {linked ? (
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  Emparejado {shortInstallId(linked.id)}…
                  {linked.lastWorldName ? ` · ${linked.lastWorldName}` : ""}
                </p>
              ) : (
                <p className="mt-1 text-xs text-zinc-500">
                  Sin UUID asignado (o el addon viejo usa SERVER_ID).
                </p>
              )}
              {row.lastVersion ? (
                <p className="text-sm text-zinc-500">Versión: {row.lastVersion}</p>
              ) : null}
              {row.lastWorldName ? (
                <p className="text-sm text-zinc-500">
                  Mundo Bedrock: {row.lastWorldName}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {error ? <p className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
