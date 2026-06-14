"use client";

import { useMemo, useState } from "react";
import {
  formatParcelBounds,
  PARCEL_DIMENSIONS,
  type ParcelConfigPayload,
} from "@/lib/minecraft-parcel";
import { softBtnPrimary, softInputNeutral, softPanel } from "@/lib/soft-ui";

export type ParcelEventRow = {
  id: string;
  gamertag: string;
  event: "enter" | "exit";
  occurredAt: string;
  timeMexico: string;
  timeColombia: string;
  x: number | null;
  y: number | null;
  z: number | null;
  dimension: string | null;
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
  directoryByTag: Record<string, DirectoryLookup>;
};

export function MinecraftParcelSection({
  parcel: initialParcel,
  events: initialEvents,
  directoryByTag,
}: Props) {
  const [parcelForm, setParcelForm] = useState(initialParcel);
  const [events] = useState(initialEvents);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const boundsLabel = useMemo(
    () => formatParcelBounds(parcelForm),
    [parcelForm],
  );

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
          ? "Parcela guardada y activa. El addon la detecta en ~1 minuto."
          : "Configuración guardada (monitoreo desactivado).",
      );
    } catch {
      setMessage("Error de red al guardar.");
    } finally {
      setSaving(false);
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
            Define un cubo en el mundo (esquina mínima + tamaño en bloques). El
            addon revisa cada segundo a los jugadores online y registra entrada
            y salida con fecha. En el juego podés ver coordenadas con{" "}
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
          Tamaño (bloques)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["sizeX", "sizeY", "sizeZ"] as const).map((key) => (
            <label key={key} className="block text-sm">
              <span className="text-zinc-500">{key.slice(4)}</span>
              <input
                type="number"
                min={1}
                max={512}
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
            Entradas y salidas
          </h3>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Últimos {events.length} eventos. Quien no esté en el grupo WA aparece
            resaltado.
          </p>
        </div>

        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aún no hay registros. Activá el monitoreo, guardá las coordenadas y
            subí el addon actualizado.
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
                              : "rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                          }
                        >
                          {ev.event === "enter" ? "Entrada" : "Salida"}
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
