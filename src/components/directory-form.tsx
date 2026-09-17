"use client";

import { useActionState } from "react";
import { createDirectoryMember } from "@/app/dashboard/actions";
import { DirectoryFormSituation } from "@/components/directory-form-situation";
import { FormSwitch } from "@/components/form-switch";
import { WhatsAppUsernameField } from "@/components/whatsapp-username-field";
import type { CallingCodeOption } from "@/lib/phone-calling-codes";
import {
  softBtnPrimary,
  softInputNeutral,
  softPanel,
  softSelectNeutral,
} from "@/lib/soft-ui";

type Props = { phoneCountryOptions: CallingCodeOption[] };

const fieldLabel =
  "flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200";

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
        Nick de Minecraft + celular o usuario de WhatsApp
      </p>
      <label className={fieldLabel}>
        Nick de Minecraft{" "}
        <span className="font-normal text-zinc-500 dark:text-zinc-400">
          (principal)
        </span>
        <input
          name="gamertag"
          required
          autoComplete="nickname"
          placeholder="Ej. CabraTNT, minero_feliz"
          className={`${softInputNeutral} w-full`}
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={fieldLabel}>
          Nombre en WhatsApp{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            (opcional)
          </span>
          <input
            name="displayName"
            type="text"
            autoComplete="name"
            placeholder="Ej. Toño papá"
            className={`${softInputNeutral} w-full`}
          />
        </label>
        <label className={fieldLabel} htmlFor="directory-whatsapp-username">
          Usuario de WhatsApp{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            (no es el nombre de perfil)
          </span>
          <WhatsAppUsernameField
            id="directory-whatsapp-username"
            name="whatsappUsername"
          />
        </label>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-end gap-3">
          <span className="min-w-0 flex-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Celular{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              (o el @)
            </span>
          </span>
          <span className="w-[8.5rem] shrink-0 text-xs font-semibold text-zinc-800 dark:text-zinc-200 sm:w-[9.5rem]">
            Edad
          </span>
        </div>
        <div className="flex min-w-0 items-stretch gap-2">
          <label className="sr-only" htmlFor="directory-phone-country">
            País y prefijo
          </label>
          <select
            id="directory-phone-country"
            name="phoneCountry"
            defaultValue="MX"
            className={`${softSelectNeutral} w-[min(100%,12.5rem)] shrink-0`}
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
            autoComplete="tel-national"
            placeholder="55 1234 5678"
            className={`${softInputNeutral} min-w-0 flex-1`}
          />
          <input
            name="age"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            placeholder="18"
            aria-label="Edad"
            className={`${softInputNeutral} w-[8.5rem] shrink-0 sm:w-[9.5rem]`}
          />
        </div>
      </div>
      <p className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
        Hace falta el celular o el @usuario. El usuario de WhatsApp es único y
        no se puede cambiar; no uses el nombre que aparece en el chat.
      </p>
      <label className={fieldLabel}>
        Nota (opcional)
        <textarea
          name="notes"
          rows={2}
          placeholder="Comentarios, plataforma, grupo…"
          className={`${softInputNeutral} w-full resize-y`}
        />
      </label>
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
        <FormSwitch
          name="permanentlyActive"
          label="Activo permanente (no baja a inactivo por Minecraft)"
          accent="violet"
        />
      </div>
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
