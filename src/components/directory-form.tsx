"use client";

import { useActionState } from "react";
import { createDirectoryMember } from "@/app/dashboard/actions";
import { DirectoryFormSituation } from "@/components/directory-form-situation";
import { FormSwitch } from "@/components/form-switch";
import type { CallingCodeOption } from "@/lib/phone-calling-codes";

const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

type Props = { phoneCountryOptions: CallingCodeOption[] };

export function DirectoryForm({ phoneCountryOptions }: Props) {
  const [state, formAction, isPending] = useActionState(
    createDirectoryMember,
    null,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
        Agregar persona (gamertag + celular)
      </h2>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Gamertag
        <input
          name="gamertag"
          required
          autoComplete="nickname"
          placeholder="Ej. PlayerPro123"
          className={inputClass}
        />
      </label>
      <div className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        <span>Celular</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <label className="sr-only" htmlFor="directory-phone-country">
            País y prefijo
          </label>
          <select
            id="directory-phone-country"
            name="phoneCountry"
            required
            defaultValue="MX"
            className={`${inputClass} shrink-0 sm:max-w-[min(100%,14rem)]`}
          >
            {phoneCountryOptions.map(({ iso, label }) => (
              <option key={iso} value={iso}>
                {label}
              </option>
            ))}
          </select>
          <input
            name="phoneNational"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel-national"
            placeholder="Ej. 55 1234 5678 o 55-1234-5678"
            className={`${inputClass} min-w-0 flex-1`}
          />
        </div>
        <p className="font-normal text-zinc-500 dark:text-zinc-500">
          El prefijo internacional va en el desplegable; aquí el número nacional.
          Puedes usar espacios, guiones o puntos.
        </p>
      </div>
      <DirectoryFormSituation />
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white/80 px-3 py-3 dark:border-zinc-700 dark:bg-zinc-950/50">
        <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Rol y protección
        </p>
        <FormSwitch name="isAdmin" label="Admin" accent="violet" />
        <FormSwitch
          name="banExempt"
          label="Protegido (no se puede banear)"
          accent="cyan"
        />
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Nota (opcional)
        <textarea
          name="notes"
          rows={2}
          placeholder="Comentarios, plataforma, grupo…"
          className={`resize-y ${inputClass}`}
        />
      </label>
      {state?.error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {isPending ? "Guardando…" : "Guardar persona"}
      </button>
    </form>
  );
}
