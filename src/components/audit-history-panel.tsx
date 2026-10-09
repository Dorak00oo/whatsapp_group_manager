import Form from "next/form";
import Link from "next/link";
import {
  AUDIT_ACTION_OPTIONS,
  auditActionLabel,
  auditActorTypeLabel,
  describeAuditEvent,
  type AuditLinePart,
} from "@/lib/audit-format";
import {
  auditFiltersToSearchParams,
  type AuditEventRow,
  type AuditFilters,
} from "@/lib/audit-log";
import { formatInstant } from "@/lib/format-instant";
import {
  MobileListItem,
  ResponsiveDataList,
} from "@/components/responsive-data-list";
import {
  softBtnPrimary,
  softInputNeutral,
  softPanel,
  softSelectNeutral,
} from "@/lib/soft-ui";

const BASE_PATH = "/dashboard/cuentas";

type AuditActionTone = "add" | "leave" | "danger" | "neutral";

const ACTION_TONE: Record<string, AuditActionTone> = {
  "member.create": "add",
  "bot.join": "add",
  "bot.rejoin": "add",
  "account.add": "add",
  "bot.leave": "leave",
  "account.remove": "leave",
  "member.delete": "danger",
  "strike.add": "danger",
  "ban.set": "danger",
};

type AuditHistoryItem = {
  id: string;
  iso: string;
  timeLabel: string;
  actionLabel: string;
  tone: AuditActionTone;
  originLabel: string;
  memberId: string | null;
  parts: AuditLinePart[];
};

function toHistoryItem(row: AuditEventRow, timeZone: string): AuditHistoryItem {
  return {
    id: row.id,
    iso: row.createdAt.toISOString(),
    timeLabel: formatInstant(row.createdAt, timeZone),
    actionLabel: auditActionLabel(row.action),
    tone: ACTION_TONE[row.action] ?? "neutral",
    originLabel: auditActorTypeLabel(row.actorType),
    memberId: row.memberId,
    parts: describeAuditEvent(row).parts,
  };
}

const chipBase =
  "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1";

const chipTone: Record<AuditActionTone, string> = {
  add: "bg-emerald-100 text-emerald-950 ring-emerald-400/60 dark:bg-emerald-950/60 dark:text-emerald-100 dark:ring-emerald-700/60",
  leave:
    "bg-amber-100 text-amber-950 ring-amber-400/70 dark:bg-amber-950/60 dark:text-amber-100 dark:ring-amber-700/60",
  danger:
    "bg-red-100 text-red-950 ring-red-300/80 dark:bg-red-950/60 dark:text-red-100 dark:ring-red-800/70",
  neutral:
    "bg-zinc-100 text-zinc-800 ring-zinc-300/70 dark:bg-zinc-800/70 dark:text-zinc-200 dark:ring-zinc-700/70",
};

const fieldLabel =
  "flex min-w-0 flex-col gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200";

const quietLink =
  "font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition-colors hover:decoration-zinc-900 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:decoration-zinc-100";

const pageLinkClass =
  "inline-flex min-h-11 items-center px-2 text-sky-700 hover:underline dark:text-sky-400";

function hrefWith(filters: AuditFilters, patch: Partial<AuditFilters>): string {
  const qs = auditFiltersToSearchParams({ ...filters, ...patch }).toString();
  return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
}

function EventSentence({ item }: { item: AuditHistoryItem }) {
  return (
    <p className="text-pretty text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
      {item.parts.map((part, i) => {
        if (part.kind === "actor") {
          return (
            <span key={i} className="font-semibold text-zinc-900 dark:text-zinc-50">
              {part.value}
            </span>
          );
        }
        if (part.kind === "member" && item.memberId) {
          return (
            <Link
              key={i}
              href={`${BASE_PATH}?member=${encodeURIComponent(item.memberId)}`}
              className={quietLink}
              title={`Ver solo el historial de ${part.value}`}
            >
              {part.value}
            </Link>
          );
        }
        if (part.kind === "member") {
          return (
            <span key={i} className="font-medium text-zinc-900 dark:text-zinc-100">
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </p>
  );
}

function EventTime({ item, align = "left" }: { item: AuditHistoryItem; align?: "left" | "right" }) {
  return (
    <time
      dateTime={item.iso}
      className={`block tabular-nums text-xs text-zinc-600 dark:text-zinc-400 ${align === "right" ? "text-right" : ""}`}
    >
      {item.timeLabel}
    </time>
  );
}

type Props = {
  rows: AuditEventRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: AuditFilters;
  /** Gamertag del miembro cuando se filtra por `?member=<id>`. */
  memberLabel: string | null;
  timeZone: string;
};

export function AuditHistoryPanel({
  rows,
  total,
  page,
  totalPages,
  filters,
  memberLabel,
  timeZone,
}: Props) {
  const items = rows.map((row) => toHistoryItem(row, timeZone));
  const hasFilters = Boolean(
    filters.memberId || filters.memberQuery || filters.actorQuery || filters.action,
  );
  const totalLabel = new Intl.NumberFormat("es-MX").format(total);

  return (
    <section className={`${softPanel} gap-5`} aria-labelledby="audit-history-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3
          id="audit-history-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Historial
        </h3>
        <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {total === 1 ? "1 evento" : `${totalLabel} eventos`}
          {" · "}100 por página · se guardan todos
          {hasFilters ? " con estos filtros" : ""}
        </p>
      </div>

      {filters.memberId ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm text-zinc-700 ring-1 ring-zinc-200/90 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800/80">
          <span>
            Solo eventos de{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {memberLabel ?? "un miembro borrado"}
            </span>
          </span>
          <Link href={hrefWith(filters, { memberId: null, page: 1 })} className={quietLink}>
            Ver todos
          </Link>
        </p>
      ) : null}

      <Form
        action={BASE_PATH}
        className="grid w-full min-w-0 grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(12rem,15rem)_auto]"
      >
        {filters.memberId ? (
          <input type="hidden" name="member" value={filters.memberId} />
        ) : (
          <label className={fieldLabel}>
            Miembro
            <input
              type="search"
              name="mq"
              defaultValue={filters.memberQuery}
              placeholder="Gamertag del miembro"
              className={`${softInputNeutral} w-full`}
            />
          </label>
        )}
        <label className={fieldLabel}>
          Quién lo hizo
          <input
            type="search"
            name="actor"
            defaultValue={filters.actorQuery}
            placeholder="Gamertag, nombre o teléfono"
            className={`${softInputNeutral} w-full`}
          />
        </label>
        <label className={fieldLabel}>
          Acción
          <select
            name="action"
            defaultValue={filters.action ?? ""}
            className={`${softSelectNeutral} w-full`}
          >
            <option value="">Todas</option>
            {AUDIT_ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className={softBtnPrimary}>
            Filtrar
          </button>
          {hasFilters ? (
            <Link href={BASE_PATH} className={`${quietLink} text-sm`}>
              Quitar filtros
            </Link>
          ) : null}
        </div>
      </Form>

      <div className="overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
        <ResponsiveDataList
          isEmpty={items.length === 0}
          empty={
            hasFilters ? (
              <>
                Ningún evento con estos filtros.{" "}
                <Link href={BASE_PATH} className={quietLink}>
                  Quitar filtros
                </Link>
              </>
            ) : (
              "Todavía no hay eventos. Cada alta, cambio o baja del directorio, de las cuentas y del bot va a quedar aquí con quién lo hizo."
            )
          }
          table={
            <table className="w-full min-w-[44rem] text-left text-sm">
              <caption className="sr-only">
                Historial de cambios, del más reciente al más antiguo
              </caption>
              <thead className="bg-zinc-100/80 text-[11px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="w-48 px-4 py-2.5 font-semibold">
                    Cuándo
                  </th>
                  <th scope="col" className="w-44 px-4 py-2.5 font-semibold">
                    Acción
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">
                    Qué pasó
                  </th>
                  <th scope="col" className="w-28 px-4 py-2.5 font-semibold">
                    Origen
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-zinc-200/70 align-top transition-colors hover:bg-zinc-50/80 dark:border-zinc-800/70 dark:hover:bg-zinc-900/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <EventTime item={item} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`${chipBase} ${chipTone[item.tone]}`}>
                        {item.actionLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <EventSentence item={item} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {item.originLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          cards={items.map((item) => (
            <MobileListItem key={item.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <span className={`${chipBase} ${chipTone[item.tone]}`}>
                  {item.actionLabel}
                </span>
                <EventTime item={item} align="right" />
              </div>
              <EventSentence item={item} />
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Origen: {item.originLabel}
              </p>
            </MobileListItem>
          ))}
        />
      </div>

      {totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm"
          aria-label="Paginación del historial"
        >
          {page > 1 ? (
            <Link href={hrefWith(filters, { page: page - 1 })} className={pageLinkClass}>
              Anterior
            </Link>
          ) : (
            <span className={`${pageLinkClass} pointer-events-none opacity-40`} aria-disabled>
              Anterior
            </span>
          )}
          <span className="tabular-nums text-zinc-600 dark:text-zinc-400" aria-current="page">
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={hrefWith(filters, { page: page + 1 })} className={pageLinkClass}>
              Siguiente
            </Link>
          ) : (
            <span className={`${pageLinkClass} pointer-events-none opacity-40`} aria-disabled>
              Siguiente
            </span>
          )}
        </nav>
      ) : null}
    </section>
  );
}
