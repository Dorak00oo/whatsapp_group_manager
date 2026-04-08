"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Diálogo de confirmación acorde al panel (oscuro / bordes redondeados), sin `window.confirm`.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "neutral",
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "border-red-400/80 bg-red-600 text-white hover:bg-red-700 dark:border-red-700 dark:bg-red-700 dark:hover:bg-red-600"
      : "border-emerald-500/80 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] dark:bg-black/70"
        aria-label="Cerrar"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.28)] dark:border-zinc-700/90 dark:bg-zinc-950 dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)]"
      >
        <h2
          id="confirm-dialog-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-desc"
          className="mt-2 text-sm text-zinc-600 dark:text-zinc-300"
        >
          {message}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
