import { AuditHistoryPanel } from "@/components/audit-history-panel";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import {
  PanelAccountsManager,
  type PanelAccountItem,
} from "@/components/panel-accounts-manager";
import { listAuditEvents, parseAuditFilters } from "@/lib/audit-log";
import { getPanelAuthEnv } from "@/lib/community-env";
import { listPanelAccounts } from "@/lib/panel-accounts";
import { requirePanelSession } from "@/lib/panel-session";
import { prisma } from "@/lib/prisma";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";

type Search = Record<string, string | string[] | undefined>;

const sinceFormat = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Mexico_City",
});

async function memberLabelFor(userId: string, memberId: string): Promise<string | null> {
  const member = await prisma.directoryMember.findFirst({
    where: { id: memberId, userId },
    select: { gamertag: true },
  });
  if (member) return member.gamertag;
  const last = await prisma.auditEvent.findFirst({
    where: { userId, memberId, memberGamertag: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { memberGamertag: true },
  });
  return last?.memberGamertag ?? null;
}

export default async function CuentasPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await requirePanelSession();
  const filters = parseAuditFilters(await searchParams);
  const ownerGamertag = getPanelAuthEnv().ownerGamertag;

  let history: Awaited<ReturnType<typeof listAuditEvents>>;
  let memberLabel: string | null = null;
  let accounts: PanelAccountItem[] | null = null;
  try {
    [history, memberLabel, accounts] = await Promise.all([
      listAuditEvents(session.userId, filters),
      filters.memberId ? memberLabelFor(session.userId, filters.memberId) : null,
      session.isPanelOwner
        ? listPanelAccounts(session.userId).then((rows) =>
            rows.map((r) => ({
              id: r.id,
              memberId: r.memberId,
              gamertag: r.gamertag,
              displayName: r.displayName,
              isAdmin: r.isAdmin,
              hasLeft: r.leftAt !== null,
              sinceLabel: sinceFormat.format(r.createdAt),
              createdBy: r.createdBy,
            })),
          )
        : null,
    ]);
  } catch (e) {
    if (isDatabaseUnreachableError(e)) return <DatabaseUnavailable />;
    throw e;
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Cuentas e historial
        </h2>
        <p className="mt-1 max-w-prose text-sm text-zinc-500 dark:text-zinc-400">
          Quién cambió qué y cuándo, desde el panel, el bot de WhatsApp o las
          sincronizaciones.
          {session.isPanelOwner
            ? " Aquí también decides quién puede entrar al panel."
            : ` Las cuentas del panel las administra ${ownerGamertag}.`}
        </p>
      </div>

      {accounts ? (
        <PanelAccountsManager ownerGamertag={ownerGamertag} accounts={accounts} />
      ) : null}

      <AuditHistoryPanel
        rows={history.rows}
        total={history.total}
        page={history.page}
        totalPages={history.totalPages}
        filters={{ ...filters, page: history.page }}
        memberLabel={memberLabel}
      />
    </section>
  );
}
