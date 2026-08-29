"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StrokeSyncIcon } from "@/components/stroke-sync-icon";
import { softBtnLavender, softBtnPrimary, softInputNeutral, softPanel } from "@/lib/soft-ui";
import type { MinecraftServerId } from "@/lib/minecraft-server";

type ConfigForm = {
  daysInactive: number;
  daysBlacklist: number;
  daysPurge: number;
  snapshotRetentionDays: number;
  snapshotKeepMinimum: number;
};

export function MinecraftWorldSettingsForm({
  serverId,
  initialName,
  config,
}: {
  serverId: MinecraftServerId;
  initialName: string;
  config: ConfigForm;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [form, setForm] = useState(config);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const [nameRes, cfgRes] = await Promise.all([
        fetch("/api/minecraft/servers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: serverId, name }),
        }),
        fetch("/api/minecraft/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }),
      ]);
      const nameData = (await nameRes.json()) as { error?: string };
      const cfgData = (await cfgRes.json()) as { error?: string };
      if (!nameRes.ok) {
        setMessage(nameData.error ?? "No se pudo guardar el nombre");
        return;
      }
      if (!cfgRes.ok) {
        setMessage(cfgData.error ?? "No se pudieron guardar los umbrales");
        return;
      }
      setMessage("Ajustes guardados.");
      router.refresh();
    } catch {
      setMessage("Error de red");
    } finally {
      setSaving(false);
    }
  }

  async function syncConfig() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/minecraft/sync-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "syncconfig" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo encolar la sincronización");
        return;
      }
      setMessage(
        "Sincronizar ajustes solicitado. El addon bajará umbrales, parcelas, ítems baneados y exclusiones de monitoreo en ~30 s.",
      );
    } catch {
      setMessage("Error de red");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className={softPanel}>
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Nombre y umbrales
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Nombre visible
          </span>
          <input
            className={`${softInputNeutral} mt-1 w-full`}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {(
          [
            ["daysInactive", "Días para inactivo"],
            ["daysBlacklist", "Días para blacklist automática"],
            ["daysPurge", "Días para purgar en Bedrock"],
            ["snapshotRetentionDays", "Días de historial de snapshots"],
            ["snapshotKeepMinimum", "Mínimo de snapshots a conservar"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {label}
            </span>
            <input
              type="number"
              min={1}
              className={`${softInputNeutral} mt-1 w-full`}
              value={form[key]}
              onChange={(e) =>
                setForm({
                  ...form,
                  [key]: parseInt(e.target.value, 10) || 1,
                })
              }
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={softBtnPrimary}
          disabled={saving || syncing}
          onClick={() => void save()}
        >
          {saving ? "Guardando…" : "Guardar ajustes"}
        </button>
        <button
          type="button"
          className={`${softBtnLavender} inline-flex items-center gap-1.5`}
          disabled={saving || syncing}
          onClick={() => void syncConfig()}
        >
          <StrokeSyncIcon />
          {syncing ? "Solicitando…" : "Sincronizar ajustes"}
        </button>
      </div>
      {message ? (
        <p className="mt-2 text-sm text-zinc-500">{message}</p>
      ) : null}
    </div>
  );
}
