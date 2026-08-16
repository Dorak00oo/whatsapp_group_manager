"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import {
  MAX_EXTRA_PARCELS,
  canAddExtraParcel,
  canDeleteParcel,
  formatParcelBounds,
  type ParcelEventType,
  type ParcelRecordPayload,
} from "@/lib/minecraft-parcel";
import { softBtnPeach, softBtnPrimary, softPanel } from "@/lib/soft-ui";

export type ParcelHubCard = ParcelRecordPayload & {
  lastEventAt: string | null;
  lastEventType: ParcelEventType | null;
  lastEventGamertag: string | null;
};

type Props = {
  parcels: ParcelHubCard[];
};

function lastEventLabel(card: ParcelHubCard): string {
  if (!card.lastEventAt) return "Sin eventos aún";
  const zones = formatInstantMexicoColombia(new Date(card.lastEventAt));
  const kind =
    card.lastEventType === "enter"
      ? "Entrada"
      : card.lastEventType === "exit"
        ? "Salida"
        : card.lastEventType === "chest_open"
          ? "Cofre"
          : "Evento";
  const who = card.lastEventGamertag ? ` · ${card.lastEventGamertag}` : "";
  return `${kind}${who} · ${zones.mexico}`;
}

export function MinecraftParcelHub({ parcels }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const extras = parcels.filter((p) => !p.isPrimary).length;
  const canAdd = canAddExtraParcel(extras);

  async function addParcel() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/minecraft/parcels", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        parcel?: { id?: string };
      };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo crear la parcela");
        return;
      }
      if (data.parcel?.id) {
        router.push(`/dashboard/parcela/${data.parcel.id}`);
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      setMessage("Error de red al crear la parcela.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteParcel(id: string, name: string) {
    const ok = window.confirm(
      `¿Borrar “${name}” y todo su historial? No se puede deshacer.`,
    );
    if (!ok) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/minecraft/parcels/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo borrar");
        return;
      }
      router.refresh();
    } catch {
      setMessage("Error de red al borrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Cada card es una zona monitoreada (entrada, salida, cofre). La original
        no se puede borrar. Podés añadir hasta {MAX_EXTRA_PARCELS} extras.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {parcels.map((p) => (
          <article key={p.id} className={softPanel}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {p.name}
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  {p.isPrimary ? "Parcela original · " : ""}
                  {p.enabled ? "Monitoreo on" : "Monitoreo off"}
                </p>
              </div>
              <span
                className={
                  p.enabled
                    ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
                    : "rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                }
              >
                {p.enabled ? "On" : "Off"}
              </span>
            </div>
            <p className="font-mono text-xs text-zinc-500">
              {p.dimension} {formatParcelBounds(p)}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {lastEventLabel(p)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/parcela/${p.id}`}
                className={`${softBtnPrimary} inline-flex text-center`}
              >
                Abrir
              </Link>
              {canDeleteParcel(p.isPrimary) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteParcel(p.id, p.name)}
                  className={softBtnPeach}
                >
                  Borrar
                </button>
              ) : null}
            </div>
          </article>
        ))}

        <button
          type="button"
          disabled={busy || !canAdd}
          onClick={() => void addParcel()}
          className={`${softPanel} items-center justify-center border-dashed text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-900`}
        >
          {canAdd
            ? busy
              ? "Creando…"
              : "Añadir parcela"
            : `Tope de ${MAX_EXTRA_PARCELS} extras`}
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
