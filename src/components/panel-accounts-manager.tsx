"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import {
  addPanelAccountAction,
  removePanelAccountAction,
  searchAccountCandidatesAction,
} from "@/app/dashboard/cuentas/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { PanelAccountCandidate } from "@/lib/panel-accounts";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { softInputNeutral, softPanel } from "@/lib/soft-ui";

export type PanelAccountItem = {
  id: string;
  memberId: string;
  gamertag: string;
  displayName: string | null;
  isAdmin: boolean;
  hasLeft: boolean;
  sinceLabel: string;
  createdBy: string;
};

type Props = {
  ownerGamertag: string;
  accounts: PanelAccountItem[];
};

const chip =
  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1";
const chipOwner = `${chip} bg-zinc-900 text-white ring-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100`;
const chipAdmin = `${chip} bg-fuchsia-100 text-fuchsia-950 ring-fuchsia-300/80 dark:bg-fuchsia-950/60 dark:text-fuchsia-100 dark:ring-fuchsia-800/60`;
const chipLeft = `${chip} bg-amber-100 text-amber-950 ring-amber-400/70 dark:bg-amber-950/60 dark:text-amber-100 dark:ring-amber-700/60`;

const rowClass =
  "flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3.5 py-3 ring-1 ring-zinc-200/80 dark:bg-zinc-900/50 dark:ring-zinc-800/80";

const removeBtn =
  "shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-medium text-red-700 max-sm:min-h-11 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/50";

const addBtn =
  "shrink-0 rounded-xl bg-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-950 max-sm:min-h-11 transition-colors hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:opacity-60 dark:bg-emerald-800/80 dark:text-emerald-50 dark:hover:bg-emerald-700/80";

type Feedback = { kind: "ok" | "error"; text: string } | null;

export function PanelAccountsManager({ ownerGamertag, accounts }: Props) {
  const router = useRouter();
  const searchId = useId();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [toRemove, setToRemove] = useState<PanelAccountItem | null>(null);

  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim());
  const [results, setResults] = useState<{
    query: string;
    candidates: PanelAccountCandidate[];
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!debounced) return;
    let cancelled = false;
    void searchAccountCandidatesAction(debounced)
      .then((r) => {
        if (cancelled) return;
        setResults(
          "error" in r
            ? { query: debounced, candidates: [], error: r.error }
            : { query: debounced, candidates: r.candidates, error: null },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setResults({
          query: debounced,
          candidates: [],
          error: "No se pudo buscar. Revisa tu conexión e intenta de nuevo.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const trimmed = query.trim();
  const shownResults = trimmed && results?.query === trimmed ? results : null;
  const searching = trimmed !== "" && !shownResults;

  function add(candidate: PanelAccountCandidate) {
    setFeedback(null);
    startTransition(async () => {
      const r = await addPanelAccountAction(candidate.id);
      if (!r.ok) {
        setFeedback({ kind: "error", text: r.error });
        return;
      }
      setFeedback({ kind: "ok", text: r.message });
      setQuery("");
      setResults(null);
      router.refresh();
    });
  }

  function confirmRemove() {
    const account = toRemove;
    setToRemove(null);
    if (!account) return;
    setFeedback(null);
    startTransition(async () => {
      const r = await removePanelAccountAction(account.id);
      setFeedback(r.ok ? { kind: "ok", text: r.message } : { kind: "error", text: r.error });
      if (r.ok) router.refresh();
    });
  }

  return (
    <section className={`${softPanel} gap-5`} aria-labelledby="panel-accounts-title">
      <div>
        <h3
          id="panel-accounts-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Cuentas del panel
        </h3>
        <p className="mt-1 max-w-prose text-sm text-zinc-600 dark:text-zinc-400">
          Entran con su gamertag y la contraseña de la comunidad, la misma para
          todas estas cuentas. El correo no sirve para entrar. {ownerGamertag}{" "}
          usa su contraseña propia y es el único que ve esta sección.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <ul className="grid content-start gap-2 sm:grid-cols-2" aria-label="Cuentas con acceso">
          <li className={rowClass}>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                <span className="truncate">{ownerGamertag}</span>
                <span className={chipOwner}>Dueño</span>
              </p>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Contraseña propia · cuenta fija
              </p>
            </div>
          </li>
          {accounts.map((a) => (
            <li key={a.id} className={rowClass}>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  <span className="truncate">{a.gamertag}</span>
                  {a.isAdmin ? <span className={chipAdmin}>Admin</span> : null}
                  {a.hasLeft ? <span className={chipLeft}>Se salió</span> : null}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {a.displayName ? `${a.displayName} · ` : ""}desde {a.sinceLabel} · por{" "}
                  {a.createdBy}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setToRemove(a)}
                className={removeBtn}
                aria-label={`Quitar la cuenta de ${a.gamertag}`}
              >
                Quitar
              </button>
            </li>
          ))}
          {accounts.length === 0 ? (
            <li className="flex items-center rounded-2xl border border-dashed border-zinc-300/90 px-3.5 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Nadie más tiene cuenta todavía.
            </li>
          ) : null}
        </ul>

        <div className="flex min-w-0 flex-col gap-2">
          <label
            htmlFor={searchId}
            className="text-xs font-semibold text-zinc-800 dark:text-zinc-200"
          >
            Agregar cuenta
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar gamertag en el directorio…"
            autoComplete="off"
            className={`${softInputNeutral} w-full`}
            aria-describedby={`${searchId}-hint`}
          />
          <p id={`${searchId}-hint`} className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Solo aparecen miembros que siguen en la comunidad y todavía no tienen
            cuenta.
          </p>

          <div aria-live="polite" className="min-h-0">
            {searching ? (
              <p className="px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400">Buscando…</p>
            ) : shownResults?.error ? (
              <p className="px-1 py-2 text-xs text-red-700 dark:text-red-300" role="alert">
                {shownResults.error}
              </p>
            ) : shownResults && shownResults.candidates.length === 0 ? (
              <p className="px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                Nadie sin cuenta con «{shownResults.query}».
              </p>
            ) : shownResults ? (
              <ul className="flex flex-col gap-1.5">
                {shownResults.candidates.map((c) => (
                  <li key={c.id} className={rowClass}>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        <span className="truncate">{c.gamertag}</span>
                        {c.isAdmin ? <span className={chipAdmin}>Admin</span> : null}
                      </p>
                      {c.displayName ? (
                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {c.displayName}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => add(c)}
                      className={addBtn}
                    >
                      Dar cuenta
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      {feedback ? (
        <p
          role={feedback.kind === "error" ? "alert" : "status"}
          className={
            feedback.kind === "error"
              ? "text-sm text-red-700 dark:text-red-300"
              : "text-sm text-emerald-800 dark:text-emerald-200"
          }
        >
          {feedback.text}
        </p>
      ) : null}

      <ConfirmDialog
        open={toRemove !== null}
        title={toRemove ? `Quitar la cuenta de ${toRemove.gamertag}` : "Quitar cuenta"}
        message="Ya no podrá entrar al panel. Si lo tiene abierto, se le cierra en su próximo clic. Su ficha del directorio no cambia."
        confirmLabel="Quitar cuenta"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmRemove}
        onCancel={() => setToRemove(null)}
      />
    </section>
  );
}
