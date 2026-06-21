"use client";

import { useMemo, useState } from "react";
import {
  formatParcelBounds,
  parcelBlockSpan,
  PARCEL_DIMENSIONS,
  type ParcelConfigPayload,
} from "@/lib/minecraft-parcel";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import { softBtnLavender, softBtnPrimary, softInputNeutral, softPanel } from "@/lib/soft-ui";

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
  parcel: ParcelConfigPayload;
  events: ParcelEventRow[];
  totalEvents: number;
  directoryByTag: Record<string, DirectoryLookup>;
};

const POLL_MS = 4000;
const POLL_MAX_ATTEMPTS = 30;

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
  parcel: initialParcel,
  events: initialEvents,
  totalEvents: initialTotal,
  directoryByTag,
}: Props) {
  const [parcelForm, setParcelForm] = useState(initialParcel);
  const [events, setEvents] = useState(initialEvents);
  const [totalEvents, setTotalEvents] = useState(initialTotal);
  const [lastBatchAt, setLastBatchAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const boundsLabel = useMemo(
    () => formatParcelBounds(parcelForm),
    [parcelForm],
  );

  async function loadFromApi() {
    const res = await fetch("/api/minecraft/parcel-events");
    if (!res.ok) return null;
    const data = (await res.json()) as {
      ok?: boolean;
      lastBatchAt?: string | null;
      total?: number;
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
    return {
      lastBatchAt: data.lastBatchAt ?? null,
      total: data.total ?? data.events.length,
      events: mapApiEvents(data.events),
    };
  }

  async function saveParcel() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/minecraft/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parcel: parcelForm }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo guardar");
        return;
      }
      setMessage(
        parcelForm.enabled
          ? "Parcela guardada y activa. El addon la detecta en el próximo sync (24 h)."
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
        const batch = await loadFromApi();
        if (!batch) continue;
        const batchArrived =
          (batch.lastBatchAt && batch.lastBatchAt !== beforeBatchAt) ||
          batch.total > beforeTotal;
        if (batchArrived) {
          setEvents(batch.events);
          setTotalEvents(batch.total);
          setLastBatchAt(batch.lastBatchAt);
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
      const batch = await loadFromApi();
      if (!batch) {
        setMessage("No se pudo leer el historial.");
        return;
      }
      setEvents(batch.events);
      setTotalEvents(batch.total);
      setLastBatchAt(batch.lastBatchAt);
      setMessage(null);
    } catch {
      setMessage("Error de red al cargar el historial.");
    } finally {
      setSyncing(false);
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

  return (
    <div className="flex flex-col gap-8">
      <div className={`${softPanel} gap-4`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
            Zona
          </p>
          <h3 className="mt-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Configurar terreno
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            El addon registra entradas, salidas y cofres en el mundo de
            Minecraft. No envía nada a la web hasta que pedís el lote o pasan
            24 h. En el juego podés ver coordenadas con{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
              /gamerule showcoordinates true
            </code>
            .
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
        <div className="grid grid-cols-3 gap-2">
          {(["minX", "minY", "minZ"] as const).map((key) => (
            <label key={key} className="block text-sm">
              <span className="text-zinc-500">{key.slice(3)}</span>
              <input
                type="number"
                className={`${softInputNeutral} mt-1 w-full`}
                value={parcelForm[key]}
                onChange={(e) =>
                  setParcelForm((p) => ({
                    ...p,
                    [key]: Number(e.target.value),
                  }))
                }
              />
            </label>
          ))}
        </div>

        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Esquina máxima (bloque opuesto)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["maxX", "maxY", "maxZ"] as const).map((key) => (
            <label key={key} className="block text-sm">
              <span className="text-zinc-500">{key.slice(3)}</span>
              <input
                type="number"
                className={`${softInputNeutral} mt-1 w-full`}
                value={parcelForm[key]}
                onChange={(e) =>
                  setParcelForm((p) => ({
                    ...p,
                    [key]: Number(e.target.value),
                  }))
                }
              />
            </label>
          ))}
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Área: {boundsLabel}
          {" · "}
          {(() => {
            const s = parcelBlockSpan(parcelForm);
            return `${s.spanX}×${s.spanY}×${s.spanZ} bloques`;
          })()}
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
            Últimos {events.length} de {totalEvents} eventos guardados en la base
            de datos. Quien no esté en el grupo WA aparece resaltado.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={syncing}
            onClick={() => void requestParcelBatch()}
            className={softBtnPrimary}
          >
            {syncing ? "Esperando addon…" : "Solicitar lote desde el servidor"}
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void loadLastBatch()}
            className={softBtnLavender}
          >
            Actualizar historial
          </button>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Sin eventos cargados. Activá el monitoreo, subí el addon y pedí el
            lote con el botón de arriba.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl ring-1 ring-zinc-200/80 dark:ring-zinc-800/80">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900/80 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha (MX)</th>
                  <th className="px-3 py-2 font-medium">Fecha (CO)</th>
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
                      <td className="whitespace-nowrap px-3 py-2 text-xs">
                        {ev.timeMexico}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs">
                        {ev.timeColombia}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            ev.event === "enter"
                              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
                              : ev.event === "chest_open"
                                ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
                                : "rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                          }
                        >
                          {ev.event === "enter"
                            ? "Entrada"
                            : ev.event === "chest_open"
                              ? `Cofre${ev.blockType ? ` (${ev.blockType})` : ""}`
                              : "Salida"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium">{ev.gamertag}</td>
                      <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                        {ev.x != null && ev.y != null && ev.z != null
                          ? `${ev.x}, ${ev.y}, ${ev.z}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400">
                        {hint ?? "En grupo (activo)"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
