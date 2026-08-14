"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  animalLabel,
  DEFAULT_MONITOR_EXCLUDE,
  eventLabel,
  formatAlertTypeBreakdown,
  MONITOR_FILTER_OPTIONS,
  MONITOR_PAGE_SIZE,
  type MonitorEventType,
} from "@/lib/minecraft-monitor";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import { XyzCoordFields } from "@/components/xyz-coord-fields";
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
  counts?: Record<string, number>;
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

/** Polling tras “Pedir lote ahora”. */
const POLL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;
/** Auto-refresh del panel mientras la pestaña está visible. */
const AUTO_REFRESH_MS = 20_000;
/** Números visibles en la ventana central (sin contar 1 ni última). */
const PAGE_WINDOW = 9;

function emptyMonitorQuery() {
  const p = new URLSearchParams();
  p.set("pageSize", String(MONITOR_PAGE_SIZE));
  return p.toString();
}

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

/** Páginas a mostrar: siempre 1 y última; ventana centrada en `current`. */
function buildPageItems(current: number, totalPages: number): number[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= PAGE_WINDOW + 2) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(PAGE_WINDOW / 2);
  let start = Math.max(2, current - half);
  let end = Math.min(totalPages - 1, current + half);

  if (end - start + 1 < PAGE_WINDOW) {
    if (start === 2) end = Math.min(totalPages - 1, start + PAGE_WINDOW - 1);
    else start = Math.max(2, end - PAGE_WINDOW + 1);
  }

  const pages = [1];
  for (let p = start; p <= end; p++) pages.push(p);
  if (pages[pages.length - 1] !== totalPages) pages.push(totalPages);
  return pages;
}

export function MinecraftMonitorSection({
  events: initialEvents,
  totalEvents: initialTotal,
  alerts: initialAlerts,
  monitorExclude: initialExclude,
}: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [totalEvents, setTotalEvents] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    Math.max(1, Math.ceil(initialTotal / MONITOR_PAGE_SIZE)),
  );
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
  const [filterX, setFilterX] = useState("");
  const [filterY, setFilterY] = useState("");
  const [filterZ, setFilterZ] = useState("");
  const [filterRadius, setFilterRadius] = useState("");
  const [loading, setLoading] = useState(false);

  const filterQueryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filterGamertag.trim()) p.set("gamertag", filterGamertag.trim());
    if (filterEvent) p.set("event", filterEvent);
    if (filterItem.trim()) p.set("item", filterItem.trim());
    if (filterFrom) p.set("from", new Date(filterFrom).toISOString());
    if (filterTo) p.set("to", new Date(filterTo).toISOString());
    if (filterX.trim()) p.set("x", filterX.trim());
    if (filterY.trim()) p.set("y", filterY.trim());
    if (filterZ.trim()) p.set("z", filterZ.trim());
    if (filterRadius.trim()) p.set("radius", filterRadius.trim());
    p.set("pageSize", String(MONITOR_PAGE_SIZE));
    return p.toString();
  }, [
    filterGamertag,
    filterEvent,
    filterItem,
    filterFrom,
    filterTo,
    filterX,
    filterY,
    filterZ,
    filterRadius,
  ]);

  /** Filtros confirmados con “Aplicar”; el auto-refresh no usa el borrador del form. */
  const [appliedQuery, setAppliedQuery] = useState(emptyMonitorQuery);

  const loadPage = useCallback(async (pageNum: number, query = appliedQuery) => {
    const p = new URLSearchParams(query);
    p.set("page", String(pageNum));
    const res = await fetch(`/api/minecraft/monitor-events?${p}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      lastBatchAt?: string | null;
      total?: number;
      page?: number;
      totalPages?: number;
      alerts?: AlertRow[];
      events?: Parameters<typeof mapApiEvents>[0];
    };
    if (!data.ok || !Array.isArray(data.events)) return null;
    const total = data.total ?? data.events.length;
    const pages =
      data.totalPages ?? Math.max(1, Math.ceil(total / MONITOR_PAGE_SIZE));
    return {
      lastBatchAt: data.lastBatchAt ?? null,
      total,
      page: data.page ?? pageNum,
      totalPages: pages,
      alerts: data.alerts ?? [],
      events: mapApiEvents(data.events),
    };
  }, [appliedQuery]);

  function applyLoaded(
    data: NonNullable<Awaited<ReturnType<typeof loadPage>>>,
  ) {
    setEvents(data.events);
    setTotalEvents(data.total);
    setTotalPages(data.totalPages);
    setPage(data.page);
    setAlerts(data.alerts);
    setLastBatchAt(data.lastBatchAt);
  }

  const loadingRef = useRef(loading);
  const syncingRef = useRef(syncing);
  const pageRef = useRef(page);
  loadingRef.current = loading;
  syncingRef.current = syncing;
  pageRef.current = page;

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;

    const tick = () => {
      if (loadingRef.current || syncingRef.current) return;
      void loadPage(pageRef.current).then((data) => {
        if (data) applyLoaded(data);
      });
    };

    const startIfVisible = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      if (id !== undefined) return;
      id = setInterval(tick, AUTO_REFRESH_MS);
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
        tick();
        startIfVisible();
      }
    };

    startIfVisible();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadPage]);

  async function applyQuery(query: string) {
    setLoading(true);
    setMessage(null);
    try {
      const data = await loadPage(1, query);
      if (!data) {
        setMessage("No se pudo cargar el historial.");
        return;
      }
      setAppliedQuery(query);
      applyLoaded(data);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    void applyQuery(filterQueryString);
  }

  function clearFilters() {
    setFilterGamertag("");
    setFilterEvent("");
    setFilterItem("");
    setFilterFrom("");
    setFilterTo("");
    setFilterX("");
    setFilterY("");
    setFilterZ("");
    setFilterRadius("");
    void applyQuery(emptyMonitorQuery());
  }

  function handleFilterFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    applyFilters();
  }

  function handleFilterFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "TEXTAREA" || tag === "BUTTON") return;
    e.preventDefault();
    applyFilters();
  }

  async function goToPage(next: number) {
    if (next < 1 || next > totalPages || next === page) return;
    setLoading(true);
    setMessage(null);
    try {
      const data = await loadPage(next);
      if (!data) {
        setMessage("No se pudo cargar el historial.");
        return;
      }
      applyLoaded(data);
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
        const data = await loadPage(page);
        if (!data) continue;
        applyLoaded(data);
        if (data.lastBatchAt && data.lastBatchAt !== lastBatchAt) {
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
      setMessage(
        "Lista de excluidos guardada. El addon la tomará en el próximo sync.",
      );
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

  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );

  const pageLinkClass =
    "text-sky-600 hover:underline disabled:pointer-events-none disabled:opacity-40 dark:text-sky-400";
  const pageActiveClass = "font-semibold text-zinc-900 dark:text-zinc-50";

  return (
    <div className="flex flex-col gap-6">
      {alerts.length > 0 ? (
        <div
          className={`${softPanel} gap-3 border-red-300/80 dark:border-red-900/60`}
        >
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
            Alertas de vandalismo
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            ≥3 críticos en 10 min, o un wither. Una alerta por jugador: se suma
            el contador si repite. Duran 5 días o hasta descartarlas.
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
                    —{" "}
                    {(() => {
                      const breakdown = formatAlertTypeBreakdown(a.counts ?? {});
                      if (breakdown) return breakdown;
                      return `${a.eventCount} evento${a.eventCount === 1 ? "" : "s"} crítico${a.eventCount === 1 ? "" : "s"}${
                        a.witherCount > 0
                          ? ` · ${a.witherCount} wither${a.witherCount === 1 ? "" : "s"}`
                          : ""
                      }`;
                    })()}
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
              {totalEvents} eventos (retención 7 días). Actualización automática
              cada 20 s; el addon envía cada ~30 s.
              {totalPages > 1 ? ` · Página ${page} de ${totalPages}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={() => void requestBatch()}
              className={softBtnPrimary}
            >
              {syncing ? "Pidiendo lote…" : "Pedir lote ahora"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={clearFilters}
              className={softBtnLavender}
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={handleFilterFormSubmit}
          onKeyDown={handleFilterFormKeyDown}
        >
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
              {MONITOR_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
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

        <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_10rem]">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Coordenada (centro)
            </p>
            <XyzCoordFields
              idPrefix="monitor-center"
              values={{ x: filterX, y: filterY, z: filterZ }}
              onChange={({ x, y, z }) => {
                setFilterX(x);
                setFilterY(y);
                setFilterZ(z);
              }}
              placeholders={{ x: "X", y: "Y", z: "Z" }}
              inputClassName={softInputNeutral}
            />
          </div>
          <label className="flex min-w-0 flex-col gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Radio (bloques)
            <input
              value={filterRadius}
              onChange={(e) => setFilterRadius(e.target.value)}
              className={softInputNeutral}
              inputMode="numeric"
              placeholder="100"
            />
          </label>
        </div>
        <p className="text-[11px] text-zinc-500">
          Pegá las tres coords en X (`1304, 76, 4848`). El radio acepta{" "}
          <span className="font-mono">100</span> o{" "}
          <span className="font-mono">10.000</span>. Si Y va vacío, se filtra
          solo en XZ (todas las alturas).
        </p>

        <button
          type="submit"
          disabled={loading}
          className={softBtnLavender}
        >
          {loading ? "Filtrando…" : "Aplicar filtros"}
        </button>
        </form>

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
                      <div className="text-[10px] opacity-70">
                        {e.timeColombia}
                      </div>
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
                      {e.event === "animal_kill"
                        ? animalLabel(e.blockType || e.itemType || "")
                        : e.blockType || e.itemType || "—"}
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

        {totalPages > 1 ? (
          <nav
            className="flex flex-wrap items-center justify-center gap-3 text-sm"
            aria-label="Paginación del historial"
          >
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => void goToPage(page - 1)}
              className={pageLinkClass}
            >
              Anterior
            </button>
            {pageItems.map((p) =>
              p === page ? (
                <span key={p} className={pageActiveClass} aria-current="page">
                  {p}
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  disabled={loading}
                  onClick={() => void goToPage(p)}
                  className={pageLinkClass}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => void goToPage(page + 1)}
              className={pageLinkClass}
            >
              Siguiente
            </button>
          </nav>
        ) : null}
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
