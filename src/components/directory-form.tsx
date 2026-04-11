"use client";

import { useActionState } from "react";
import { createDirectoryMember } from "@/app/dashboard/actions";
import { DirectoryFormSituation } from "@/components/directory-form-situation";
import { FormSwitch } from "@/components/form-switch";
import type { CallingCodeOption } from "@/lib/phone-calling-codes";
import {
  softBtnPrimary,
  softInputNeutral,
  softPanel,
  softSelectNeutral,
} from "@/lib/soft-ui";

type Props = { phoneCountryOptions: CallingCodeOption[] };

export function DirectoryForm({ phoneCountryOptions }: Props) {
  const [state, formAction, isPending] = useActionState(
    createDirectoryMember,
    null,
  );

  return (
    <form action={formAction} className={`${softPanel} gap-3`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-800 dark:text-zinc-200">
          Alta manual
        </h2>
      </div>
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Nick de Minecraft + celular
      </p>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
        Nick de Minecraft{" "}
        <span className="font-normal text-zinc-500 dark:text-zinc-400">
          (principal)
        </span>
        <input
          name="gamertag"
          required
          autoComplete="nickname"
          placeholder="Ej. CabraTNT, minero_feliz"
          className={softInputNeutral}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
        Nombre en WhatsApp{" "}
        <span className="font-normal text-zinc-500 dark:text-zinc-400">
          (opcional)
        </span>
        <input
          name="displayName"
          type="text"
          autoComplete="name"
          placeholder="Ej. Toño papá, María del salón 3B"
          className={softInputNeutral}
        />
      </label>
      <div className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
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
            className={`${softSelectNeutral} shrink-0 sm:max-w-[min(100%,14rem)]`}
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
            className={`${softInputNeutral} min-w-0 flex-1`}
          />
        </div>
        <p className="font-normal text-zinc-500 dark:text-zinc-400">
          El prefijo internacional va en el desplegable; aquí el número nacional.
          Puedes usar espacios, guiones o puntos.
        </p>
      </div>
      <DirectoryFormSituation />
      <div className="flex flex-col gap-3 rounded-2xl bg-violet-100 p-4 ring-1 ring-violet-200/90 dark:bg-violet-950/35 dark:ring-violet-800/50">
        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Rol y protección
        </p>
        <FormSwitch name="isAdmin" label="Admin" accent="violet" />
        <FormSwitch
          name="banExempt"
          label="Protegido (no se puede banear)"
          accent="cyan"
        />
      </div>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
        Nota (opcional)
        <textarea
          name="notes"
          rows={2}
          placeholder="Comentarios, plataforma, grupo…"
          className={`${softInputNeutral} resize-y`}
        />
      </label>
      {state?.error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className={softBtnPrimary}
      >
        {isPending ? "Guardando…" : "Guardar persona"}
      </button>
    </form>
  );
}
