"use client";

import { useState, type FormEvent } from "react";
import { sanitizeBannedItemsList } from "@/lib/minecraft-banned-items";
import { softBtnPrimary, softInputNeutral, softPanel } from "@/lib/soft-ui";

type Props = {
  initialItems: string[];
};

export function MinecraftBannedItemsSection({ initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function persist(next: string[]) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/minecraft/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bannedItems: next }),
      });
      const data = (await res.json()) as {
        error?: string;
        config?: { bannedItems?: string[] };
      };
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo guardar");
        return;
      }
      if (Array.isArray(data.config?.bannedItems)) {
        setItems(data.config.bannedItems);
      } else {
        setItems(next);
      }
      setMessage(
        "Lista guardada. El addon la toma en el próximo sync (~5 min).",
      );
    } catch {
      setMessage("Error de red al guardar.");
    } finally {
      setSaving(false);
    }
  }

  function handleAdd(e: FormEvent) {
    e.preventDefault();
    const [id] = sanitizeBannedItemsList([draft]);
    if (!id) {
      setMessage("Id inválido. Ej: bedrock o minecraft:barrier");
      return;
    }
    if (items.includes(id)) {
      setMessage(`${id} ya está en la lista.`);
      setDraft("");
      return;
    }
    setDraft("");
    void persist([...items, id]);
  }

  function handleRemove(id: string) {
    void persist(items.filter((x) => x !== id));
  }

  return (
    <div className={`${softPanel} gap-4`}>
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Objetos baneados
        </h3>
        <p className="mt-1 text-xs text-zinc-500">
          El addon los quita del inventario, armadura y segunda mano de
          jugadores online (admins exentos), cada 0,1 s, sin aviso en el
          mundo.
        </p>
      </div>

      <form className="flex max-w-md flex-col gap-2 sm:flex-row" onSubmit={handleAdd}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={`${softInputNeutral} w-full`}
          placeholder="bedrock"
          aria-label="Id de objeto baneado"
        />
        <button type="submit" disabled={saving} className={softBtnPrimary}>
          {saving ? "Guardando…" : "Añadir"}
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">Ningún objeto baneado todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((id) => (
            <li
              key={id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900"
            >
              <code className="font-mono text-zinc-800 dark:text-zinc-200">
                {id}
              </code>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleRemove(id)}
                className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50 dark:text-red-400"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      {message ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
