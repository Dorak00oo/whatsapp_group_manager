"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";
import { softBtnPrimary, softInputNeutral } from "@/lib/soft-ui";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form
      action={formAction}
      className="flex w-full max-w-sm flex-col gap-4 rounded-[1.75rem] bg-white p-5 shadow-sm shadow-zinc-900/[0.04] ring-1 ring-zinc-200/90 sm:p-8 dark:bg-zinc-900/50 dark:ring-zinc-700/60"
    >
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Usá la cuenta de la comunidad para entrar al panel.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className={softInputNeutral}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          Contraseña
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={softInputNeutral}
        />
      </label>

      {state?.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={softBtnPrimary}
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
