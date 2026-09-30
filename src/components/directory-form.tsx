"use client";

import { useActionState } from "react";
import { createDirectoryMember } from "@/app/dashboard/actions";
import { DirectoryFormSituation } from "@/components/directory-form-situation";
import { DirectoryPhoneAgeFields } from "@/components/directory-phone-age-fields";
import { FormSwitch } from "@/components/form-switch";
import { WhatsAppUsernameField } from "@/components/whatsapp-username-field";
import type { CallingCodeOption } from "@/lib/phone-calling-codes";
import { softBtnPrimary, softInputNeutral, softPanel } from "@/lib/soft-ui";

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
      <DirectoryPhoneAgeFields
        countrySelectId="directory-phone-country"
        phoneCountryOptions={phoneCountryOptions}
      />
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
