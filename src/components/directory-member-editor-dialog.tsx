"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
import { ConfirmDialog } from "@/components/confirm-dialog";
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

type Props = {
  m: DirectoryMemberDTO;
  open: boolean;
  onClose: () => void;
};

export function DirectoryMemberEditorDialog({ m, open, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"delete" | "left" | null>(null);
  const confirmRef = useRef(confirm);
  const country = regionLabel(m.phoneCountry);

  useEffect(() => {
    confirmRef.current = confirm;
  }, [confirm]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmRef.current) {
        setConfirm(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function runDelete() {
    setConfirm(null);
    startTransition(async () => {
      await deleteDirectoryMember(m.id);
      onClose();
    });
  }

  function runMarkLeft() {
    setConfirm(null);
    startTransition(async () => {
      await setDirectoryMemberLeft(m.id, true);
    });
  }

  function onToggleActive() {
    startTransition(async () => {
      await setDirectoryMemberActive(m.id, !m.active);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/55 backdrop-blur-[2px] transition-opacity dark:bg-black/65"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={`member-edit-title-${m.id}`}
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25)] dark:border-zinc-700/80 dark:bg-zinc-950 dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2
              id={`member-edit-title-${m.id}`}
              className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              Editar — {m.gamertag}
            </h2>
            {m.displayName ? (
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">
                Nombre: {m.displayName}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {country ? `${country} · ` : null}
              <a
                href={`tel:${m.phone.replace(/\s/g, "")}`}
                className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {m.phone}
              </a>
              <span className="text-zinc-400"> · </span>
              <time dateTime={m.createdAt} suppressHydrationWarning>
                Alta {new Date(m.createdAt).toLocaleString("es")}
              </time>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Cerrar
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          <DirectoryMemberRoleChips m={m} />

          {m.leftAt ? (
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
              Salida registrada:{" "}
              <time dateTime={m.leftAt} suppressHydrationWarning>
                {new Date(m.leftAt).toLocaleString("es")}
              </time>
            </p>
          ) : null}

          {m.banned && m.bannedReason ? (
            <p className="mt-3 text-sm text-red-700 dark:text-red-300">
              <span className="font-medium">Motivo del ban:</span> {m.bannedReason}
            </p>
          ) : null}

          {m.banExempt ? (
            <p className="mt-3 text-xs text-cyan-800 dark:text-cyan-200">
              Persona protegida: el ban no aplica (puedes quitar protección para
              banear si corresponde).
            </p>
          ) : null}

          {m.strikes.length > 0 ? (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Historial de strikes
              </p>
              <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-amber-200/80 bg-amber-50/40 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/20">
                {m.strikes.map((s) => (
                  <li
                    key={s.id}
                    className="text-xs text-zinc-700 dark:text-zinc-300"
                  >
                    <span className="text-zinc-400 dark:text-zinc-500">
                      {new Date(s.createdAt).toLocaleString("es")} —{" "}
                    </span>
                    {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <form action={addDirectoryStrike} className="mt-4 flex flex-wrap gap-2">
            <input type="hidden" name="memberId" value={m.id} />
            <input
              name="reason"
              required
              placeholder="Motivo del nuevo strike"
              className="min-w-[12rem] flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg border border-amber-400/80 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
            >
              Añadir strike
            </button>
          </form>

          <form
            action={updateDirectoryMemberNotes}
            className="mt-5 flex flex-col gap-3"
          >
            <input type="hidden" name="memberId" value={m.id} />
            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Nombre (opcional, distinto del gamertag)
              <input
                name="displayName"
                type="text"
                defaultValue={m.displayName ?? ""}
                placeholder="Ej. cómo se presenta en la comunidad"
                className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Nota
            </label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={m.notes ?? ""}
              placeholder="Sin nota…"
              className="resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={pending}
              className="self-start rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Guardar nombre y nota
            </button>
          </form>

          <div className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Ban
            </p>
            {m.banExempt ? null : m.banned ? (
              <form action={setDirectoryMemberBan}>
                <input type="hidden" name="memberId" value={m.id} />
                <input type="hidden" name="banAction" value="unban" />
                <button
                  type="submit"
                  disabled={pending}
                  className="text-sm font-medium text-emerald-600 hover:underline disabled:opacity-50 dark:text-emerald-400"
                >
                  Desbanear
                </button>
              </form>
            ) : (
              <form
                action={setDirectoryMemberBan}
                className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <input type="hidden" name="memberId" value={m.id} />
                <input type="hidden" name="banAction" value="ban" />
                <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Motivo del ban
                  <input
                    name="bannedReason"
                    required
                    placeholder="Obligatorio para banear"
                    className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm dark:border-red-900 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg border border-red-400/80 bg-red-50 px-4 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                >
                  Banear
                </button>
              </form>
            )}
          </div>

          <div className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Acciones rápidas
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await toggleDirectoryMemberIsAdmin(m.id);
                  })
                }
                className="w-full rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-left text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:bg-violet-950/50 sm:w-auto sm:min-w-[12rem]"
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
                className="w-full rounded-lg border border-cyan-200 bg-cyan-50/80 px-3 py-2 text-left text-sm font-medium text-cyan-900 hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200 dark:hover:bg-cyan-950/50 sm:w-auto sm:min-w-[12rem]"
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
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-left text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50 sm:w-auto sm:min-w-[12rem]"
                >
                  Volvió a la comunidad
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirm("left")}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900/60 sm:w-auto sm:min-w-[12rem]"
                >
                  Se salió
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={onToggleActive}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:bg-zinc-800 sm:w-auto sm:min-w-[12rem]"
              >
                {m.active ? "Marcar inactivo" : "Marcar activo"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirm("delete")}
                className="w-full rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-left text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50 sm:w-auto sm:min-w-[12rem]"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirm === "delete"}
        title="Eliminar persona"
        message="¿Eliminar esta persona de la lista? No se puede deshacer."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={runDelete}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "left"}
        title="Salida de la comunidad"
        message="¿Marcar que esta persona se salió de la comunidad?"
        confirmLabel="Sí, marcar salida"
        cancelLabel="Cancelar"
        variant="neutral"
        onConfirm={runMarkLeft}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
