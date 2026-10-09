"use client";

import Link from "next/link";
import { useActionState, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import {
  deleteDirectoryMember,
  setDirectoryMemberBan,
  setDirectoryMemberLeft,
  toggleDirectoryMemberBanExempt,
  toggleDirectoryMemberIsAdmin,
  updateDirectoryMemberNotes,
} from "@/app/dashboard/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useFormatInstant } from "@/components/viewer-clock";
import { DirectoryMemberRoleChips } from "@/components/directory-member-role-chips";
import { DirectoryMemberSituationPicker } from "@/components/directory-member-situation-picker";
import { DirectoryPhoneAgeFields } from "@/components/directory-phone-age-fields";
import { WhatsAppUsernameField } from "@/components/whatsapp-username-field";
import { getCallingCodeOptions } from "@/lib/phone-calling-codes";
import { splitPhoneForDirectoryForm } from "@/lib/phone-normalize";
import { formatWhatsAppUsername } from "@/lib/whatsapp-username";
import { DASHBOARD_MOBILE_EDITOR_ROOT_ID } from "@/lib/dashboard-mobile-top-nav";
import { softBtnMint } from "@/lib/soft-ui";
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

function useMdUp() {
  const [md, setMd] = useState(false);
  useLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setMd(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return md;
}

export function DirectoryMemberEditorDialog({ m, open, onClose }: Props) {
  const formatTime = useFormatInstant();
  const mdUp = useMdUp();
  const [pending, startTransition] = useTransition();
  const [profileState, profileAction, profilePending] = useActionState(
    updateDirectoryMemberNotes,
    null,
  );
  const [confirm, setConfirm] = useState<"delete" | "left" | null>(null);
  const confirmRef = useRef(confirm);
  const country = regionLabel(m.phoneCountry);
  const phoneCountryOptions = useMemo(() => getCallingCodeOptions("es"), []);
  const phoneDefaults = useMemo(
    () => splitPhoneForDirectoryForm(m.phone, m.phoneCountry),
    [m.phone, m.phoneCountry],
  );

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

  if (!open) return null;

  const shell = (
    <div
      className={
        mdUp
          ? "fixed inset-0 z-50 flex items-center justify-center p-8 lg:p-10"
          : "pointer-events-auto flex h-full min-h-0 w-full flex-col"
      }
    >
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
        className="relative z-10 flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-none bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-none ring-0 md:h-auto md:max-h-[min(94vh,1100px)] md:min-h-[min(82vh,760px)] md:rounded-[1.75rem] md:pb-0 md:shadow-lg md:shadow-zinc-900/10 md:ring-1 md:ring-zinc-200/90 dark:bg-zinc-900 md:dark:ring-zinc-700/60"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:gap-6 sm:px-10 sm:py-7">
          <div className="min-w-0 flex-1">
            <h2
              id={`member-edit-title-${m.id}`}
              className="break-words text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-2xl"
            >
              Editar — {m.gamertag}
            </h2>
            {m.displayName ? (
              <p className="mt-1 break-words text-sm text-zinc-600 dark:text-zinc-300">
                Nombre: {m.displayName}
              </p>
            ) : null}
            <p className="mt-1.5 break-words text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {country ? `${country} · ` : null}
              {m.phone ? (
                <a
                  href={`tel:${m.phone.replace(/\s/g, "")}`}
                  className="font-medium text-zinc-800 hover:underline dark:text-zinc-200"
                >
                  {m.phone}
                </a>
              ) : null}
              {m.whatsappUsername ? (
                <>
                  {m.phone ? <span className="text-zinc-400"> · </span> : null}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {formatWhatsAppUsername(m.whatsappUsername)}
                  </span>
                </>
              ) : null}
              <span className="text-zinc-400"> · </span>
              <time dateTime={m.createdAt} suppressHydrationWarning>
                Alta {formatTime(new Date(m.createdAt))}
              </time>
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Link
              href={`/dashboard/cuentas?member=${encodeURIComponent(m.id)}`}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Ver historial
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cerrar
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-10 sm:py-10">
          <DirectoryMemberRoleChips m={m} />
          <DirectoryMemberSituationPicker
            m={m}
            pending={pending}
            startTransition={startTransition}
          />

          {m.leftAt ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Salida registrada:{" "}
              <time dateTime={m.leftAt} suppressHydrationWarning>
                {formatTime(new Date(m.leftAt))}
              </time>
            </p>
          ) : null}

          {m.banned && m.bannedReason && !m.banExempt ? (
            <p className="mt-4 text-sm text-red-700 dark:text-red-300">
              <span className="font-medium">Motivo del ban:</span> {m.bannedReason}
            </p>
          ) : null}

          {m.banExempt ? (
            <p className="mt-4 text-sm text-cyan-800 dark:text-cyan-200">
              Persona protegida: el ban no aplica (puedes quitar protección para
              banear si corresponde).
            </p>
          ) : null}

          <form
            action={profileAction}
            className="mt-10 flex flex-col gap-6"
          >
            <input type="hidden" name="memberId" value={m.id} />
            <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Gamertag{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                (principal)
              </span>
              <input
                name="gamertag"
                required
                autoComplete="nickname"
                defaultValue={m.gamertag}
                placeholder="Ej. CabraTNT, minero_feliz"
                className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Segunda cuenta de Minecraft{" "}
                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                  (opcional)
                </span>
                <input
                  name="mcAccount2"
                  autoComplete="off"
                  defaultValue={m.mcAccount2 ?? ""}
                  placeholder="Otro gamertag"
                  className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </label>
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Tercera cuenta de Minecraft{" "}
                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                  (opcional)
                </span>
                <input
                  name="mcAccount3"
                  autoComplete="off"
                  defaultValue={m.mcAccount3 ?? ""}
                  placeholder="Otro gamertag"
                  className="rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Nombre{" "}
                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                  (opcional, WhatsApp)
                </span>
                <input
                  name="displayName"
                  type="text"
                  defaultValue={m.displayName ?? ""}
                  placeholder="Ej. cómo se presenta en WhatsApp"
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </label>
              <label
                className="flex min-w-0 flex-col gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400"
                htmlFor={`edit-whatsapp-username-${m.id}`}
              >
                Usuario de WhatsApp{" "}
                <span className="font-normal text-zinc-500 dark:text-zinc-400">
                  (no el nombre de perfil)
                </span>
                <WhatsAppUsernameField
                  id={`edit-whatsapp-username-${m.id}`}
                  name="whatsappUsername"
                  defaultValue={m.whatsappUsername ?? ""}
                  inputClassName="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </label>
            </div>
            <DirectoryPhoneAgeFields
              countrySelectId={`edit-phone-country-${m.id}`}
              phoneCountryOptions={phoneCountryOptions}
              defaultIso={phoneDefaults.iso}
              defaultNational={phoneDefaults.national}
              defaultAge={m.age}
            />
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Nota
            </label>
            <textarea
              name="notes"
              rows={5}
              defaultValue={m.notes ?? ""}
              placeholder="Sin nota…"
              className="resize-y rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-emerald-500/30 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
            {profileState?.error ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {profileState.error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending || profilePending}
              className={`${softBtnMint} self-start`}
            >
              {profilePending ? "Guardando…" : "Guardar"}
            </button>
          </form>

          {m.banExempt ? null : (
            <div className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Ban
              </p>
              {m.banned ? (
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
          )}

          <div className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Acciones rápidas
            </p>
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await toggleDirectoryMemberIsAdmin(m.id);
                  })
                }
                className="w-full rounded-lg border border-violet-200 bg-violet-50/80 px-4 py-3 text-left text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:bg-violet-950/50"
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
                className="w-full rounded-lg border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-left text-sm font-medium text-cyan-900 hover:bg-cyan-100 disabled:opacity-50 dark:border-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200 dark:hover:bg-cyan-950/50"
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
                  className="w-full rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-left text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
                >
                  Volvió a la comunidad
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirm("left")}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-900/60"
                >
                  Se salió
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirm("delete")}
                className="w-full rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-left text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
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

  if (!mdUp) {
    const root = document.getElementById(DASHBOARD_MOBILE_EDITOR_ROOT_ID);
    if (root) return createPortal(shell, root);
  }
  return shell;
}
