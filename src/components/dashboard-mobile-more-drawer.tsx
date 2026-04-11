"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MOBILE_TOP_NAV_TOP_CSS } from "@/lib/dashboard-mobile-top-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

type Props = {
  defaultThemeDark: boolean;
};

const panelClass =
  "w-[min(18.5rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] rounded-2xl border border-zinc-200/90 bg-background p-4 shadow-xl ring-1 ring-zinc-900/[0.04] dark:border-zinc-700/90 dark:bg-zinc-950 dark:ring-zinc-100/[0.06]";

/**
 * Menú «Más»: overlay en un nodo propio de `document.body`.
 * Evita que el `backdrop-filter` del nav bar lo adopte como containing block.
 * `touch-manipulation` en el botón elimina el retraso de 300 ms del click en Android.
 */
export function DashboardMobileMoreDrawer({ defaultThemeDark }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const portalRoot = useRef<HTMLDivElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const menuId = useId();

  /* Nodo dedicado en body para que el backdrop-filter del nav bar no lo afecte */
  useLayoutEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-more-menu", "1");
    document.body.appendChild(el);
    portalRoot.current = el;
    setPortalReady(true);
    return () => { document.body.removeChild(el); };
  }, []);

  const closeMenu = useCallback(() => { setMenuOpen(false); }, []);

  /* Escape cierra */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  /* Bloquea scroll de fondo */
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  /* Overlay: siempre montado, visible/oculto por display */
  const overlay = (
    <div
      id={menuId}
      role="dialog"
      aria-modal="true"
      aria-label="Más: tema y cerrar sesión"
      style={{
        display: menuOpen ? "flex" : "none",
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        justifyContent: "flex-end",
        alignItems: "flex-start",
        paddingTop: `calc(${MOBILE_TOP_NAV_TOP_CSS} + 0.375rem)`,
        paddingRight: "max(0.5rem, env(safe-area-inset-right, 0px))",
        paddingLeft: "max(0.5rem, env(safe-area-inset-left, 0px))",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
        backgroundColor: "rgba(0,0,0,0.45)",
      }}
      onClick={closeMenu}
    >
      <div
        className={panelClass}
        style={{ maxHeight: "min(100dvh, 32rem)", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Claro u oscuro
        </p>
        <div className="mt-2">
          <ThemeToggle
            defaultDark={defaultThemeDark}
            layout="segmented"
            wrapperClassName="flex w-full rounded-full bg-zinc-200/90 p-1 ring-1 ring-zinc-300/55 dark:bg-zinc-800/90 dark:ring-zinc-600/55"
          />
        </div>
        <div className="mt-4 border-t border-zinc-200/80 pt-4 dark:border-zinc-700/70">
          <SignOutButton
            compact
            className="w-full max-w-full justify-center py-2.5 text-sm font-medium"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full min-h-12 w-full flex-col items-center justify-center overflow-visible">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((o) => !o);
        }}
        className={`touch-manipulation flex min-h-12 w-full min-w-[2.75rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-colors active:bg-zinc-200/60 dark:active:bg-zinc-800/60 ${
          menuOpen
            ? "bg-zinc-200/90 text-zinc-900 dark:bg-zinc-800/85 dark:text-zinc-50"
            : "text-zinc-500 dark:text-zinc-400"
        }`}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        aria-controls={menuId}
        aria-label="Más: tema y cerrar sesión"
      >
        <MenuIcon className="size-[1.125rem] shrink-0 pointer-events-none" />
        <span className="pointer-events-none text-[10px] font-medium leading-none">
          Más
        </span>
      </button>

      {portalReady && portalRoot.current
        ? createPortal(overlay, portalRoot.current)
        : null}
    </div>
  );
}
