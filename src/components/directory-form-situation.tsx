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
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white/80 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-950/50">
      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Situación en la comunidad
      </p>

      <div className="flex flex-col gap-2 rounded-lg border border-lime-200/80 bg-lime-50/50 px-3 py-2 dark:border-lime-900/50 dark:bg-lime-950/20">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-lime-950 dark:text-lime-100">
            Los nuevos
          </span>
          <span className="rounded-full bg-lime-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Sí, automático
          </span>
        </div>
        <p className="text-[11px] leading-snug text-lime-900/90 dark:text-lime-200/90">
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
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
          Si lo apagas, la persona queda en «Los inactivos» (sigue en la lista,
          sin participar).
        </p>
      ) : (
        <p className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
          Con «Los que se salieron» activo no aplica roster ni inactivos: queda
          registrada la salida.
        </p>
      )}
    </div>
  );
}
