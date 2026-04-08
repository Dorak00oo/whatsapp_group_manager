"use client";

import { useTransition } from "react";
import {
  addDirectoryStrike,
  deleteDirectoryMember,
  setDirectoryMemberActive,
  setDirectoryMemberBan,
  setDirectoryMemberLeft,
  toggleDirectoryMemberBanExempt,
  toggleDirectoryMemberIsAdmin,
  updateDirectoryMemberNotes,
} from "@/app/dashboard/actions";
import { DirectoryMemberRoleChips } from "@/components/directory-member-role-chips";
import type { DirectoryMemberDTO } from "@/types/directory";

function regionLabel(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["es"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function DirectoryMemberCard({ m }: { m: DirectoryMemberDTO }) {
  const [pending, startTransition] = useTransition();
  const country = regionLabel(m.phoneCountry);

  function onDelete() {
    if (!confirm("¿Eliminar esta persona de la lista?")) return;
    startTransition(async () => {
      await deleteDirectoryMember(m.id);
    });
  }

  function onToggleActive() {
    startTransition(async () => {
      await setDirectoryMemberActive(m.id, !m.active);
    });
  }

  return (
    <li
      className={`flex flex-col gap-3 rounded-xl border bg-white p-4 dark:bg-zinc-950 sm:flex-row sm:items-start sm:justify-between ${
        m.leftAt
          ? "border-slate-400 dark:border-slate-600"
          : m.banned
            ? "border-red-300 dark:border-red-900"
            : m.active
              ? "border-zinc-200 dark:border-zinc-800"
              : "border-zinc-300 opacity-80 dark:border-zinc-600"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-950 dark:text-sky-200">
            {m.gamertag}
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {m.strikes.length} strike{m.strikes.length === 1 ? "" : "s"}
          </span>
          {country ? (
            <span className="text-xs text-zinc-500">{country}</span>
          ) : null}
          <a
            href={`tel:${m.phone.replace(/\s/g, "")}`}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            {m.phone}
          </a>
          <time
            className="text-xs text-zinc-500"
            dateTime={m.createdAt}
            suppressHydrationWarning
          >
            {new Date(m.createdAt).toLocaleString("es")}
          </time>
        </div>

        <DirectoryMemberRoleChips m={m} />

        {m.leftAt ? (
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            Salida registrada:{" "}
            <time dateTime={m.leftAt} suppressHydrationWarning>
              {new Date(m.leftAt).toLocaleString("es")}
            </time>
          </p>
        ) : null}

        {m.banned && m.bannedReason ? (
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            <span className="font-medium">Motivo del ban:</span> {m.bannedReason}
          </p>
        ) : null}

        {m.banExempt ? (
          <p className="mt-2 text-xs text-cyan-800 dark:text-cyan-200">
            Persona protegida: el ban no aplica (puedes quitar protección para
            banear si corresponde).
          </p>
        ) : null}

        {m.strikes.length > 0 ? (
          <ul className="mt-2 space-y-1 border-l-2 border-amber-200 pl-3 dark:border-amber-900">
            {m.strikes.map((s) => (
              <li key={s.id} className="text-xs text-zinc-600 dark:text-zinc-400">
                <span className="text-zinc-400">
                  {new Date(s.createdAt).toLocaleString("es")} —{" "}
                </span>
                {s.reason}
              </li>
            ))}
          </ul>
        ) : null}

        <form action={addDirectoryStrike} className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="memberId" value={m.id} />
          <input
            name="reason"
            required
            placeholder="Motivo del nuevo strike"
            className="min-w-[12rem] flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
          >
            Añadir strike
          </button>
        </form>

        <form
          action={updateDirectoryMemberNotes}
          className="mt-3 flex flex-col gap-1"
        >
          <input type="hidden" name="memberId" value={m.id} />
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Nota
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={m.notes ?? ""}
            placeholder="Sin nota…"
            className="resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Guardar nota
          </button>
        </form>

        {m.banExempt ? null : m.banned ? (
          <form action={setDirectoryMemberBan} className="mt-2">
            <input type="hidden" name="memberId" value={m.id} />
            <input type="hidden" name="banAction" value="unban" />
            <button
              type="submit"
              disabled={pending}
              className="text-sm text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400"
            >
              Desbanear
            </button>
          </form>
        ) : (
          <form action={setDirectoryMemberBan} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="memberId" value={m.id} />
            <input type="hidden" name="banAction" value="ban" />
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Motivo del ban
              <input
                name="bannedReason"
                required
                placeholder="Obligatorio para banear"
                className="rounded-lg border border-red-200 bg-white px-2 py-1 text-sm dark:border-red-900 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-200 dark:hover:bg-red-950"
            >
              Banear
            </button>
          </form>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await toggleDirectoryMemberIsAdmin(m.id);
            })
          }
          className="text-left text-sm text-violet-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-violet-300"
        >
          {m.isAdmin ? "Quitar admin" : "Marcar admin"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await toggleDirectoryMemberBanExempt(m.id);
            })
          }
          className="text-left text-sm text-cyan-800 underline-offset-2 hover:underline disabled:opacity-50 dark:text-cyan-200"
        >
          {m.banExempt ? "Quitar protección" : "Proteger (sin ban)"}
        </button>
        {m.leftAt ? (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setDirectoryMemberLeft(m.id, false);
              })
            }
            className="text-left text-sm text-emerald-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-emerald-300"
          >
            Volvió a la comunidad
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("¿Marcar que esta persona se salió de la comunidad?"))
                return;
              startTransition(async () => {
                await setDirectoryMemberLeft(m.id, true);
              });
            }}
            className="text-left text-sm text-slate-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-slate-400"
          >
            Se salió
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={onToggleActive}
          className="text-sm text-zinc-600 underline-offset-2 hover:underline disabled:opacity-50 dark:text-zinc-400"
        >
          {m.active ? "Marcar inactivo" : "Marcar activo"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDelete}
          className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
        >
          Eliminar
        </button>
      </div>
    </li>
  );
}
