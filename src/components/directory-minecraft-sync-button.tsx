"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncDirectoryFromMinecraftPanel } from "@/app/dashboard/actions";

export function DirectoryMinecraftSyncButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="max-w-xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Alinear esta lista con{" "}
        <Link
          href="/dashboard/minecraft"
          className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
        >
          Minecraft
        </Link>{" "}
        (mismo gamertag: activo/inactivo y blacklist; no cambia a quienes se
        salieron del grupo).
      </p>
      <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const r = await syncDirectoryFromMinecraftPanel();
              if ("error" in r) {
                setMessage(r.error);
                return;
              }
              setMessage(
                `Listo: ${r.matchedGamertags} gamertag(s) con coincidencia, ${r.updatedRows} fila(s) actualizada(s). Jugadores en MC: ${r.minecraftCount}.`,
              );
              router.refresh();
            });
          }}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          {pending ? "Actualizando…" : "Actualizar desde Minecraft"}
        </button>
        {message ? (
          <p
            className="max-w-md text-right text-xs text-zinc-600 dark:text-zinc-400"
            role="status"
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
