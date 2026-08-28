"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  formatParcelBounds,
  parcelBlockSpan,
  PARCEL_DIMENSIONS,
  PARCEL_EVENT_FILTER_OPTIONS,
  PARCEL_PAGE_SIZE,
  canDeleteParcel,
  type ParcelConfigPayload,
} from "@/lib/minecraft-parcel";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import { tryParseCoordNumber } from "@/lib/xyz-coords";
import { HistoryPurgeDialog } from "@/components/history-purge-dialog";
import { HistoryPurgeProgress } from "@/components/history-purge-progress";
import { useHistoryPurge } from "@/components/use-history-purge";
import {
  XyzCoordFields,
  type XyzCoordValues,
} from "@/components/xyz-coord-fields";
import {
  softBtnDanger,
  softBtnLavender,
  softBtnPeach,
  softBtnPrimary,
  softInputNeutral,
  softPanel,
} from "@/lib/soft-ui";
import {
  formatXyz,
  MobileListItem,
  ResponsiveDataList,
} from "@/components/responsive-data-list";

export type ParcelEventRow = {
  id: string;
  gamertag: string;
  event: "enter" | "exit" | "chest_open";
  occurredAt: string;
  timeMexico: string;
  timeColombia: string;
  x: number | null;
  y: number | null;
  z: number | null;
  dimension: string | null;
  blockType: string | null;
};

type DirectoryLookup = {
  gamertag: string;
  displayName: string | null;
  active: boolean;
  leftAt: string | null;
};

type Props = {
  parcelId: string;
  isPrimary: boolean;
  parcel: ParcelConfigPayload;
  events: ParcelEventRow[];
  totalEvents: number;
  directoryByTag: Record<string, DirectoryLookup>;
};

const POLL_MS = 4000;
const POLL_MAX_ATTEMPTS = 30;
/** Auto-refresh del historial mientras la pestaña está visible. */
const AUTO_REFRESH_MS = 5 * 60 * 1000;
const PAGE_WINDOW = 9;

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

function emptyParcelQuery(parcelId: string) {
  const p = new URLSearchParams();
  p.set("pageSize", String(PARCEL_PAGE_SIZE));
  p.set("parcelId", parcelId);
  return p.toString();
}

function xyzFromParcel(
  p: ParcelConfigPayload,
  kind: "min" | "max",
): XyzCoordValues {
  if (kind === "min") {
    return { x: String(p.minX), y: String(p.minY), z: String(p.minZ) };
  }
  return { x: String(p.maxX), y: String(p.maxY), z: String(p.maxZ) };
}

function applyXyzNumbers(
  p: ParcelConfigPayload,
  next: XyzCoordValues,
  kind: "min" | "max",
): ParcelConfigPayload {
  const x = tryParseCoordNumber(next.x);
  const y = tryParseCoordNumber(next.y);
  const z = tryParseCoordNumber(next.z);
  if (kind === "min") {
    return {
      ...p,
      minX: x ?? p.minX,
      minY: y ?? p.minY,
      minZ: z ?? p.minZ,
    };
  }
  return {
    ...p,
    maxX: x ?? p.maxX,
    maxY: y ?? p.maxY,
    maxZ: z ?? p.maxZ,
  };
}

function mapApiEvents(
  raw: Array<{
    id: string;
    gamertag: string;
    event: "enter" | "exit" | "chest_open";
    occurredAt: string;
    x: number | null;
    y: number | null;
    z: number | null;
    dimension: string | null;
    blockType: string | null;
  }>,
): ParcelEventRow[] {
  return raw.map((e) => {
    const zones = formatInstantMexicoColombia(new Date(e.occurredAt));
    return {
      ...e,
      timeMexico: zones.mexico,
      timeColombia: zones.colombia,
    };
  });
}

export function MinecraftParcelSection({
  parcelId,
  isPrimary,
  parcel: initialParcel,
  events: initialEvents,
  totalEvents: initialTotal,
  directoryByTag,
}: Props) {
  const router = useRouter();
  const [parcelForm, setParcelForm] = useState(initialParcel);
  const [minDraft, setMinDraft] = useState(() =>
    xyzFromParcel(initialParcel, "min"),
  );
  const [maxDraft, setMaxDraft] = useState(() =>
    xyzFromParcel(initialParcel, "max"),
  );
  const [events, setEvents] = useState(initialEvents);
  const [totalEvents, setTotalEvents] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    Math.max(1, Math.ceil(initialTotal / PARCEL_PAGE_SIZE)),
  );
  const [lastBatchAt, setLastBatchAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const purgeUrl = `/api/minecraft/parcel-events?parcelId=${encodeURIComponent(parcelId)}`;
  const purge = useHistoryPurge(purgeUrl, () => {
    setFilterGamertag("");
    setFilterEvent("");
    setFilterFrom("");
    setFilterTo("");
    setAppliedQuery(emptyParcelQuery(parcelId));
    setEvents([]);
    setTotalEvents(0);
    setPage(1);
    setTotalPages(1);
    setMessage("Historial de parcela borrado.");
  });

  const [filterGamertag, setFilterGamertag] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const filterQueryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filterGamertag.trim()) p.set("gamertag", filterGamertag.trim());
    if (filterEvent) p.set("event", filterEvent);
    if (filterFrom) p.set("from", new Date(filterFrom).toISOString());
    if (filterTo) p.set("to", new Date(filterTo).toISOString());
    p.set("pageSize", String(PARCEL_PAGE_SIZE));
    p.set("parcelId", parcelId);
    return p.toString();
  }, [filterGamertag, filterEvent, filterFrom, filterTo, parcelId]);

  const [appliedQuery, setAppliedQuery] = useState(() =>
    emptyParcelQuery(parcelId),
  );

  const boundsLabel = useMemo(
    () => formatParcelBounds(parcelForm),
    [parcelForm],
  );

  const loadFromApi = useCallback(async (pageNum: number, query = appliedQuery) => {
    const p = new URLSearchParams(query);
    p.set("page", String(pageNum));
    p.set("pageSize", String(PARCEL_PAGE_SIZE));
    const res = await fetch(`/api/minecraft/parcel-events?${p}`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      lastBatchAt?: string | null;
      total?: number;
      page?: number;
      totalPages?: number;
      events?: Array<{
        id: string;
        gamertag: string;
        event: "enter" | "exit" | "chest_open";
        occurredAt: string;
        x: number | null;
        y: number | null;
        z: number | null;
        dimension: string | null;
        blockType: string | null;
      }>;
    };
    if (!data.ok || !Array.isArray(data.events)) return null;
    const total = data.total ?? data.events.length;
    return {
      lastBatchAt: data.lastBatchAt ?? null,
      total,
      page: data.page ?? pageNum,
      totalPages:
        data.totalPages ?? Math.max(1, Math.ceil(total / PARCEL_PAGE_SIZE)),
      events: mapApiEvents(data.events),
    };
  }, [appliedQuery]);

  function applyLoaded(
    data: NonNullable<Awaited<ReturnType<typeof loadFromApi>>>,
  ) {
    setEvents(data.events);
    setTotalEvents(data.total);
    setTotalPages(data.totalPages);
    setPage(data.page);
    setLastBatchAt(data.lastBatchAt);
  }

  const loadingRef = useRef(loading);
  const syncingRef = useRef(syncing);
  const pageRef = useRef(page);
  loadingRef.current = loading;
  syncingRef.current = syncing;
  pageRef.current = page;
  purge.purgingRef.current = purge.purging;

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;

    const tick = () => {
      if (loadingRef.current || syncingRef.current || purge.purgingRef.current)
        return;
      void loadFromApi(pageRef.current).then((data) => {
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
  }, [loadFromApi]);

  async function applyQuery(query: string) {
    setLoading(true);
    setMessage(null);
    try {
      const data = await loadFromApi(1, query);
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
    setFilterFrom("");
    setFilterTo("");
    void applyQuery(emptyParcelQuery(parcelId));
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

  async function saveParcel() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/minecraft/parcels/${parcelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parcelForm),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo guardar");
        return;
      }
      setMessage(
        parcelForm.enabled
          ? "Parcela guardada y activa. El addon toma la zona en el próximo sync (~5 min)."
          : "Configuración guardada (monitoreo desactivado).",
      );
    } catch {
      setMessage("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function requestParcelBatch() {
    setSyncing(true);
    setMessage(null);
    const beforeBatchAt = lastBatchAt;
    const beforeTotal = totalEvents;

    try {
      const req = await fetch("/api/minecraft/parcel-sync-request", {
        method: "POST",
      });
      if (!req.ok) {
        const data = (await req.json()) as { error?: string };
        setMessage(data.error ?? "No se pudo solicitar el lote");
        return;
      }

      setMessage(
        "Solicitud enviada. Esperando al addon (hasta ~2 min)…",
      );

      for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const batch = await loadFromApi(1);
        if (!batch) continue;
        const batchArrived =
          (batch.lastBatchAt && batch.lastBatchAt !== beforeBatchAt) ||
          batch.total > beforeTotal;
        if (batchArrived) {
          applyLoaded(batch);
          const added = batch.total - beforeTotal;
          setMessage(
            added > 0
              ? `Historial actualizado: ${added} evento(s) nuevo(s) guardados.`
              : "Sync recibido; no hubo eventos nuevos en la parcela.",
          );
          return;
        }
      }

      setMessage(
        "Sin respuesta del addon aún. Probá de nuevo en unos minutos.",
      );
    } catch {
      setMessage("Error de red al solicitar el lote.");
    } finally {
      setSyncing(false);
    }
  }

  async function loadLastBatch() {
    setSyncing(true);
    setMessage(null);
    try {
      const batch = await loadFromApi(page);
      if (!batch) {
        setMessage("No se pudo leer el historial.");
        return;
      }
      applyLoaded(batch);
      setMessage(null);
    } catch {
      setMessage("Error de red al cargar el historial.");
    } finally {
      setSyncing(false);
    }
  }

  async function goToPage(next: number) {
    if (next < 1 || next > totalPages || next === page) return;
    setLoading(true);
    setMessage(null);
    try {
      const data = await loadFromApi(next);
      if (!data) {
        setMessage("No se pudo cargar el historial.");
        return;
      }
      applyLoaded(data);
    } catch {
      setMessage("Error de red al cargar el historial.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteThisParcel() {
    if (!canDeleteParcel(isPrimary)) return;
    const ok = window.confirm(
      `¿Borrar “${parcelForm.name}” y todo su historial? No se puede deshacer.`,
    );
    if (!ok) return;
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/minecraft/parcels/${parcelId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo borrar");
        return;
      }
      router.push("/dashboard/parcela");
      router.refresh();
    } catch {
      setMessage("Error de red al borrar.");
    } finally {
      setDeleting(false);
    }
  }

  function directoryHint(tag: string): string | null {
    const key = tag.trim().toLowerCase();
    const row = directoryByTag[key];
    if (!row) return "No está en el directorio WhatsApp";
    if (row.leftAt) return "Marcado como «se salió» del grupo";
    if (!row.active) return "En directorio pero inactivo en WA";
    return null;
  }

  const pageItems = useMemo(
    () => buildPageItems(page, totalPages),
    [page, totalPages],
  );
  const filtersActive = appliedQuery !== emptyParcelQuery(parcelId);
  const pageLinkClass =
    "text-sky-600 hover:underline disabled:pointer-events-none disabled:opacity-40 dark:text-sky-400";
  const pageActiveClass = "font-semibold text-zinc-900 dark:text-zinc-50";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/dashboard/parcela"
          className={`${softBtnLavender} inline-flex items-center`}
        >
          Todas las parcelas
        </Link>
        {canDeleteParcel(isPrimary) ? (
          <button
            type="button"
            disabled={deleting || saving}
            onClick={() => void deleteThisParcel()}
            className={softBtnPeach}
          >
            {deleting ? "Borrando…" : "Borrar esta parcela"}
          </button>
        ) : (
          <p className="text-xs text-zinc-500">Parcela original (no se borra)</p>
        )}
      </div>
      <div className={`${softPanel} gap-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
            Zona
          </p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Configurar terreno
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            El addon registra entradas, salidas y cofres en el terreno. Acumula
            los eventos en el mundo y los envía a la web cada 5 minutos, o
            antes si pedís el lote. El historial de abajo se actualiza solo
            cada 5 minutos y al llegar un lote nuevo.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
          <input
            type="checkbox"
            checked={parcelForm.enabled}
            onChange={(e) =>
              setParcelForm((p) => ({ ...p, enabled: e.target.checked }))
            }
            className="size-4 rounded border-zinc-300"
          />
          Monitoreo activo
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Nombre</span>
            <input
              className={`${softInputNeutral} mt-1 w-full`}
              value={parcelForm.name}
              onChange={(e) =>
                setParcelForm((p) => ({ ...p, name: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-700 dark:text-zinc-300">Dimensión</span>
            <select
              className={`${softInputNeutral} mt-1 w-full`}
              value={parcelForm.dimension}
              onChange={(e) =>
                setParcelForm((p) => ({
                  ...p,
                  dimension: e.target.value as ParcelConfigPayload["dimension"],
                }))
              }
            >
              {PARCEL_DIMENSIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Esquina mínima (bloque)
        </p>
        <XyzCoordFields
          idPrefix="parcel-min"
          values={minDraft}
          onChange={(next) => {
            setMinDraft(next);
            setParcelForm((p) => applyXyzNumbers(p, next, "min"));
          }}
          placeholders={{ x: "0", y: "0", z: "0" }}
          inputClassName={softInputNeutral}
        />

        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Esquina máxima (bloque opuesto)
        </p>
        <XyzCoordFields
          idPrefix="parcel-max"
          values={maxDraft}
          onChange={(next) => {
            setMaxDraft(next);
            setParcelForm((p) => applyXyzNumbers(p, next, "max"));
          }}
          placeholders={{ x: "0", y: "0", z: "0" }}
          inputClassName={softInputNeutral}
        />

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Área: {boundsLabel}
          {" · "}
          {(() => {
            const s = parcelBlockSpan(parcelForm);
            return `${s.spanX}×${s.spanY}×${s.spanZ} bloques`;
          })()}
          {" · "}
          Pegá las tres coords en X (`1304, 76, 4848`).
        </p>

        <button
          type="button"
          disabled={saving}
          onClick={() => void saveParcel()}
          className={softBtnPrimary}
        >
          {saving ? "Guardando…" : "Guardar parcela"}
        </button>
        {message ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
            {message}
          </p>
        ) : null}
      </div>

      <div className={`${softPanel} gap-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
            Historial
          </p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Entradas, salidas y cofres
          </h3>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {totalEvents} eventos (retención 6 meses).
            {totalPages > 1 ? ` · Página ${page} de ${totalPages}` : ""} Se
            refresca solo cada 5 min. Quien no esté en el grupo WA aparece
            resaltado.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={syncing || loading || purge.purging}
            onClick={() => void requestParcelBatch()}
            className={softBtnPrimary}
          >
            {syncing ? "Esperando addon…" : "Solicitar lote desde el servidor"}
          </button>
          <button
            type="button"
            disabled={syncing || loading || purge.purging}
            onClick={() => void loadLastBatch()}
            className={softBtnLavender}
          >
            Actualizar historial
          </button>
          <button
            type="button"
            disabled={
              purge.purging ||
              syncing ||
              loading ||
              totalEvents === 0
            }
            onClick={() => purge.setConfirmOpen(true)}
            className={softBtnDanger}
          >
            Borrar historial
          </button>
        </div>

        {message ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
            {message}
          </p>
        ) : null}

        <form
          className="flex flex-col gap-3"
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
              Evento
              <select
                value={filterEvent}
                onChange={(e) => setFilterEvent(e.target.value)}
                className={softInputNeutral}
              >
                <option value="">Todos</option>
                {PARCEL_EVENT_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading || purge.purging}
              className={softBtnLavender}
            >
              {loading ? "Filtrando…" : "Aplicar filtros"}
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
        </form>

        {purge.purging && purge.tick ? (
          <HistoryPurgeProgress
            deleted={purge.tick.deleted}
            remaining={purge.tick.remaining}
            total={purge.tick.total}
            error={purge.error}
            onRetry={purge.retry}
          />
        ) : (
          <>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {filtersActive
              ? "Sin eventos con estos filtros."
              : "Sin eventos cargados. Activá el monitoreo, subí el addon y pedí el lote con el botón de arriba."}
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl ring-1 ring-zinc-200/80 dark:ring-zinc-800/80">
            <ResponsiveDataList
              isEmpty={false}
              table={
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900/80 dark:text-zinc-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Hora</th>
                      <th className="px-3 py-2 font-medium">Evento</th>
                      <th className="px-3 py-2 font-medium">Gamertag</th>
                      <th className="px-3 py-2 font-medium">Posición</th>
                      <th className="px-3 py-2 font-medium">WA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => {
                      const hint = directoryHint(ev.gamertag);
                      return (
                        <tr
                          key={ev.id}
                          className={
                            hint
                              ? "border-t border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20"
                              : "border-t border-zinc-100 dark:border-zinc-800/80"
                          }
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <div>{ev.timeMexico}</div>
                            <div className="text-[10px] opacity-70">
                              {ev.timeColombia}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <ParcelEventBadge event={ev} />
                          </td>
                          <td className="px-3 py-2 font-medium">
                            <Link
                              href={`/dashboard?q=${encodeURIComponent(ev.gamertag)}`}
                              className="underline-offset-2 hover:underline"
                            >
                              {ev.gamertag}
                            </Link>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                            {formatXyz(ev.x, ev.y, ev.z)}
                          </td>
                          <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                            {hint ?? "En grupo (activo)"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              }
              cards={events.map((ev) => {
                const hint = directoryHint(ev.gamertag);
                return (
                  <MobileListItem
                    key={ev.id}
                    className={
                      hint
                        ? "bg-amber-50/50 dark:bg-amber-950/20"
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <ParcelEventBadge event={ev} />
                      <span className="shrink-0 text-right text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="block">{ev.timeMexico}</span>
                        <span className="block text-[11px] opacity-70">
                          {ev.timeColombia}
                        </span>
                      </span>
                    </div>
                    <Link
                      href={`/dashboard?q=${encodeURIComponent(ev.gamertag)}`}
                      className="mt-2 block text-base font-semibold text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
                    >
                      {ev.gamertag}
                    </Link>
                    <p className="mt-1 font-mono text-sm text-zinc-600 dark:text-zinc-400">
                      {formatXyz(ev.x, ev.y, ev.z)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {hint ?? "En grupo (activo)"}
                    </p>
                  </MobileListItem>
                );
              })}
            />
          </div>
        )}

        {totalPages > 1 ? (
          <nav
            className="flex flex-wrap items-center justify-center gap-3 text-sm"
            aria-label="Paginación del historial de parcela"
          >
            <button
              type="button"
              disabled={loading || syncing || page <= 1}
              onClick={() => void goToPage(page - 1)}
              className={`${pageLinkClass} min-h-11 px-2`}
            >
              Anterior
            </button>
            <span className="text-zinc-600 md:hidden dark:text-zinc-400">
              {page} / {totalPages}
            </span>
            <span className="hidden md:contents">
              {pageItems.map((p) =>
                p === page ? (
                  <span key={p} className={pageActiveClass} aria-current="page">
                    {p}
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    disabled={loading || syncing}
                    onClick={() => void goToPage(p)}
                    className={pageLinkClass}
                  >
                    {p}
                  </button>
                ),
              )}
            </span>
            <button
              type="button"
              disabled={loading || syncing || page >= totalPages}
              onClick={() => void goToPage(page + 1)}
              className={`${pageLinkClass} min-h-11 px-2`}
            >
              Siguiente
            </button>
          </nav>
        ) : null}
          </>
        )}
      </div>

      <HistoryPurgeDialog
        open={purge.confirmOpen}
        title="Borrar historial de esta parcela"
        description="Solo esta zona. Las demás parcelas no se tocan."
        eventCount={totalEvents}
        onCancel={() => purge.setConfirmOpen(false)}
        onConfirmed={() => void purge.start(totalEvents)}
      />
    </div>
  );
}

function ParcelEventBadge({ event }: { event: ParcelEventRow }) {
  const className =
    event.event === "enter"
      ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
      : event.event === "chest_open"
        ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
        : "rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100";
  const label =
    event.event === "enter"
      ? "Entrada"
      : event.event === "chest_open"
        ? `Cofre${event.blockType ? ` (${event.blockType})` : ""}`
        : "Salida";
  return <span className={className}>{label}</span>;
}
