"use client";

import { useState } from "react";
import { FormSwitch } from "@/components/form-switch";
import { DIRECTORY_NEW_MEMBER_DAYS } from "@/lib/directory-cohort";

/**
 * Situación visible al dar de alta: mismos roles que en la ficha (nuevos, roster, inactivos, se salieron).
 */
export function DirectoryFormSituation() {
  const [active, setActive] = useState(true);
  const [left, setLeft] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-cyan-100 p-4 ring-1 ring-cyan-200/90 dark:bg-cyan-950/30 dark:ring-cyan-800/45">
      <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
        Situación en la comunidad
      </p>

      <div className="flex flex-col gap-2 rounded-2xl bg-lime-100 px-3 py-2.5 ring-1 ring-lime-200/90 dark:bg-lime-950/35 dark:ring-lime-800/40">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Los nuevos
          </span>
          <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-zinc-100 dark:text-zinc-900">
            Sí, automático
          </span>
        </div>
        <p className="text-[11px] leading-snug text-zinc-600 dark:text-zinc-400">
          Los primeros {DIRECTORY_NEW_MEMBER_DAYS} días tras guardar contará en el
          filtro y en la ficha como «Los nuevos».
        </p>
      </div>

      <FormSwitch
        name="markedLeft"
        label="Los que se salieron (dar de alta ya fuera de la comunidad)"
        checked={left}
        onCheckedChange={(next) => {
          setLeft(next);
          if (next) setActive(false);
        }}
        accent="slate"
      />

      <FormSwitch
        name="active"
        label="Los que estuvieron activos (sigue en roster y participa)"
        checked={left ? false : active}
        onCheckedChange={(next) => {
          if (!left) setActive(next);
        }}
        disabled={left}
        accent="emerald"
      />

      {!left ? (
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
          Si lo apagas, la persona queda en «Los inactivos» (sigue en la lista,
          sin participar).
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
          Con «Los que se salieron» activo no aplica roster ni inactivos: queda
          registrada la salida.
        </p>
      )}
    </div>
  );
}
