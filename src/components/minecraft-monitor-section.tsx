"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  DEFAULT_MONITOR_EXCLUDE,
  eventLabel,
  MONITOR_EVENT_TYPES,
  type MonitorEventType,
} from "@/lib/minecraft-monitor";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import {
  softBtnLavender,
  softBtnPrimary,
  softInputNeutral,
  softPanel,
} from "@/lib/soft-ui";

export type MonitorEventRow = {
  id: string;
  gamertag: string;
  event: MonitorEventType;
  occurredAt: string;
  timeMexico: string;
  timeColombia: string;
  x: number | null;
  y: number | null;
  z: number | null;
  dimension: string | null;
  blockType: string | null;
  itemType: string | null;
  priority: string;
  fireId: string | null;
  relatedFireId: string | null;
};

type AlertRow = {
  id: string;
  gamertag: string;
  eventCount: number;
  witherCount: number;
  windowStart: string;
  lastEventAt: string;
  expiresAt: string;
};

type Props = {
  events: MonitorEventRow[];
  totalEvents: number;
  alerts: AlertRow[];
  monitorExclude: string[];
};

const POLL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;

function mapApiEvents(
  raw: Array<{
    id: string;
    gamertag: string;
    event: MonitorEventType;
    occurredAt: string;
    x: number | null;
    y: number | null;
    z: number | null;
    dimension: string | null;
    blockType: string | null;
    itemType: string | null;
    priority: string;
    fireId: string | null;
    relatedFireId: string | null;
  }>,
): MonitorEventRow[] {
  return raw.map((e) => {
    const zones = formatInstantMexicoColombia(new Date(e.occurredAt));
    return {
      ...e,
      timeMexico: zones.mexico,
      timeColombia: zones.colombia,
    };
  });
}

export function MinecraftMonitorSection({
  events: initialEvents,
  totalEvents: initialTotal,
  alerts: initialAlerts,
  monitorExclude: initialExclude,
}: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [totalEvents, setTotalEvents] = useState(initialTotal);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [excludeText, setExcludeText] = useState(
    initialExclude.join("\n") || DEFAULT_MONITOR_EXCLUDE.join("\n"),
  );
  const [lastBatchAt, setLastBatchAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [savingExclude, setSavingExclude] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [filterGamertag, setFilterGamertag] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterMinX, setFilterMinX] = useState("");
  const [filterMinY, setFilterMinY] = useState("");
  const [filterMinZ, setFilterMinZ] = useState("");
  const [filterMaxX, setFilterMaxX] = useState("");
  const [filterMaxY, setFilterMaxY] = useState("");
  const [filterMaxZ, setFilterMaxZ] = useState("");
  const [loading, setLoading] = useState(false);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filterGamertag.trim()) p.set("gamertag", filterGamertag.trim());
    if (filterEvent) p.set("event", filterEvent);
    if (filterItem.trim()) p.set("item", filterItem.trim());
    if (filterFrom) p.set("from", new Date(filterFrom).toISOString());
    if (filterTo) p.set("to", new Date(filterTo).toISOString());
    if (filterMinX.trim()) p.set("minX", filterMinX.trim());
    if (filterMinY.trim()) p.set("minY", filterMinY.trim());
    if (filterMinZ.trim()) p.set("minZ", filterMinZ.trim());
    if (filterMaxX.trim()) p.set("maxX", filterMaxX.trim());
    if (filterMaxY.trim()) p.set("maxY", filterMaxY.trim());
    if (filterMaxZ.trim()) p.set("maxZ", filterMaxZ.trim());
    return p.toString();
  }, [
    filterGamertag,
    filterEvent,
    filterItem,
    filterFrom,
    filterTo,
    filterMinX,
    filterMinY,
    filterMinZ,
    filterMaxX,
    filterMaxY,
    filterMaxZ,
  ]);

  const loadFromApi = useCallback(async () => {
    const res = await fetch(
      `/api/minecraft/monitor-events${queryString ? `?${queryString}` : ""}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      lastBatchAt?: string | null;
      total?: number;
      alerts?: AlertRow[];
      events?: Parameters<typeof mapApiEvents>[0];
    };
    if (!data.ok || !Array.isArray(data.events)) return null;
    return {
      lastBatchAt: data.lastBatchAt ?? null,
      total: data.total ?? data.events.length,
      alerts: data.alerts ?? [],
      events: mapApiEvents(data.events),
    };
  }, [queryString]);

  async function applyFilters() {
    setLoading(true);
    setMessage(null);
    try {
      const data = await loadFromApi();
      if (!data) {
        setMessage("No se pudo cargar el historial.");
        return;
      }
      setEvents(data.events);
      setTotalEvents(data.total);
      setAlerts(data.alerts);
      setLastBatchAt(data.lastBatchAt);
    } finally {
      setLoading(false);
    }
  }

  async function requestBatch() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/minecraft/monitor-sync-request", {
        method: "POST",
      });
      if (!res.ok) {
        setMessage("No se pudo pedir el lote al addon.");
        return;
      }
      setMessage("Pedido enviado. Esperando lote del addon…");
      for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const data = await loadFromApi();
        if (!data) continue;
        setEvents(data.events);
        setTotalEvents(data.total);
        setAlerts(data.alerts);
        if (data.lastBatchAt && data.lastBatchAt !== lastBatchAt) {
          setLastBatchAt(data.lastBatchAt);
          setMessage("Lote recibido.");
          return;
        }
      }
      setMessage("Tiempo de espera agotado. Revisa si el addon está online.");
    } finally {
      setSyncing(false);
    }
  }

  async function saveExcludeList() {
    setSavingExclude(true);
    setMessage(null);
    try {
      const list = excludeText
        .split(/[\n,]+/)
        .map((s) => s.trim().toLowerCase().replace(/^minecraft:/, ""))
        .filter(Boolean);
      const res = await fetch("/api/minecraft/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitorExclude: list }),
      });
      if (!res.ok) {
        setMessage("No se pudo guardar la lista de excluidos.");
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        config?: { monitorExclude?: string[] };
      };
      if (data.ok && data.config?.monitorExclude) {
        setExcludeText(data.config.monitorExclude.join("\n"));
      }
      setMessage("Lista de excluidos guardada. El addon la tomará en el próximo sync.");
    } finally {
      setSavingExclude(false);
    }
  }

  async function dismissAlert(id: string) {
    setDismissingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/minecraft/monitor-alerts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setMessage(data.error ?? "No se pudo descartar la alerta.");
        return;
      }
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setMessage("Error de red al descartar la alerta.");
    } finally {
      setDismissingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {alerts.length > 0 ? (
        <div className={`${softPanel} gap-3 border-red-300/80 dark:border-red-900/60`}>
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
            Alertas de vandalismo
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            ≥3 críticos en 10 min, o un wither. Una alerta por jugador: se suma
            el contador si repite. Duran 7 días o hasta descartarlas.
          </p>
          <ul className="flex flex-col gap-2">
            {alerts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200/80 bg-red-50/60 px-3 py-2 text-sm dark:border-red-900/50 dark:bg-red-950/30"
              >
                <div>
                  <Link
                    href={`/dashboard?q=${encodeURIComponent(a.gamertag)}`}
                    className="font-semibold text-red-900 underline-offset-2 hover:underline dark:text-red-100"
                  >
                    {a.gamertag}
                  </Link>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {" "}
                    — {a.eventCount} evento{a.eventCount === 1 ? "" : "s"} crítico
                    {a.eventCount === 1 ? "" : "s"}
                    {a.witherCount > 0
                      ? ` · ${a.witherCount} wither${a.witherCount === 1 ? "" : "s"}`
                      : ""}
                  </span>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    Último:{" "}
                    {new Date(a.lastEventAt).toLocaleString("es-MX", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    {" · "}
                    Expira:{" "}
                    {new Date(a.expiresAt).toLocaleString("es-MX", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={dismissingId === a.id}
                  onClick={() => void dismissAlert(a.id)}
                  className="rounded-md border border-red-300/80 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-100/80 disabled:opacity-50 dark:border-red-800 dark:text-red-100 dark:hover:bg-red-950/60"
                >
                  {dismissingId === a.id ? "…" : "Descartar"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={`${softPanel} gap-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Historial de monitoreo
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {totalEvents} eventos (retención 21 días). El addon envía cada 30 s.
            </p>
          </div>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void requestBatch()}
            className={softBtnPrimary}
          >
            {syncing ? "Pidiendo lote…" : "Pedir lote ahora"}
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Jugador
            <input
              value={filterGamertag}
              onChange={(e) => setFilterGamertag(e.target.value)}
              className={softInputNeutral}
              placeholder="Gamertag"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Tipo
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className={softInputNeutral}
            >
              <option value="">Todos</option>
              {MONITOR_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {eventLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Ítem / bloque
            <input
              value={filterItem}
              onChange={(e) => setFilterItem(e.target.value)}
              className={softInputNeutral}
              placeholder="diamond, tnt, leaves…"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Desde
            <input
              type="datetime-local"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className={softInputNeutral}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Hasta
            <input
              type="datetime-local"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className={softInputNeutral}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Esquina mínima (bloque)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["X", filterMinX, setFilterMinX],
                  ["Y", filterMinY, setFilterMinY],
                  ["Z", filterMinZ, setFilterMinZ],
                ] as const
              ).map(([label, value, setValue]) => (
                <label key={`min-${label}`} className="flex flex-col gap-1 text-xs font-semibold">
                  {label}
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className={softInputNeutral}
                    inputMode="numeric"
                    placeholder="—"
                  />
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Esquina máxima (bloque opuesto)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["X", filterMaxX, setFilterMaxX],
                  ["Y", filterMaxY, setFilterMaxY],
                  ["Z", filterMaxZ, setFilterMaxZ],
                ] as const
              ).map(([label, value, setValue]) => (
                <label key={`max-${label}`} className="flex flex-col gap-1 text-xs font-semibold">
                  {label}
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className={softInputNeutral}
                    inputMode="numeric"
                    placeholder="—"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500">
          Por cada eje hace falta min y max para filtrar (si van al revés, se ordenan solos).
        </p>

        <button
          type="button"
          disabled={loading}
          onClick={() => void applyFilters()}
          className={softBtnLavender}
        >
          {loading ? "Filtrando…" : "Aplicar filtros"}
        </button>

        {message ? (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{message}</p>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-zinc-100/80 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60">
              <tr>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">Jugador</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Bloque / ítem</th>
                <th className="px-3 py-2">Coords</th>
                <th className="px-3 py-2">Fuego</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-zinc-500"
                  >
                    Sin eventos con estos filtros.
                  </td>
                </tr>
              ) : (
                events.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-zinc-200/70 dark:border-zinc-800/70"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      <div>{e.timeMexico}</div>
                      <div className="text-[10px] opacity-70">{e.timeColombia}</div>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/dashboard?q=${encodeURIComponent(e.gamertag)}`}
                        className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
                      >
                        {e.gamertag}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          e.priority === "critical"
                            ? "font-semibold text-red-700 dark:text-red-300"
                            : e.priority === "high"
                              ? "font-medium text-amber-800 dark:text-amber-200"
                              : ""
                        }
                      >
                        {eventLabel(e.event)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                      {e.blockType || e.itemType || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">
                      {e.x != null && e.y != null && e.z != null
                        ? `${e.x}, ${e.y}, ${e.z}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                      {e.relatedFireId
                        ? `← ${e.relatedFireId.slice(0, 8)}`
                        : e.fireId
                          ? e.fireId.slice(0, 8)
                          : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${softPanel} gap-3`}>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Bloques excluidos (ruido)
        </h3>
        <p className="text-xs text-zinc-500">
          Un id por línea (sin <code>minecraft:</code>). Leaves siguen excluidas
          en place/break; sí se registran si se queman por fuego atribuido.
        </p>
        <textarea
          value={excludeText}
          onChange={(e) => setExcludeText(e.target.value)}
          rows={10}
          className={`${softInputNeutral} font-mono text-xs`}
        />
        <button
          type="button"
          disabled={savingExclude}
          onClick={() => void saveExcludeList()}
          className={softBtnLavender}
        >
          {savingExclude ? "Guardando…" : "Guardar excluidos"}
        </button>
      </div>
    </div>
  );
}
