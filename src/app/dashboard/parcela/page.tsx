import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { MinecraftParcelHub } from "@/components/minecraft-parcel-hub";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { ensurePrimaryParcel } from "@/lib/minecraft-parcels-db";
import { prisma } from "@/lib/prisma";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";
import type { ParcelEventType } from "@/lib/minecraft-parcel";

export default async function DashboardParcelaPage() {
  const session = await auth();
  if (!session?.user) return null;

  try {
    const userId = await resolveDirectoryUserId(session);
    if (!userId) return null;
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }

  try {
    const parcels = await ensurePrimaryParcel();
    const latestRows = await Promise.all(
      parcels.map((p) =>
        prisma.minecraftParcelEvent.findFirst({
          where: { parcelId: p.id },
          orderBy: { occurredAt: "desc" },
          select: {
            parcelId: true,
            occurredAt: true,
            eventType: true,
            gamertag: true,
          },
        }),
      ),
    );
    const latestById = new Map(
      latestRows
        .filter((e): e is NonNullable<typeof e> => e != null)
        .map((e) => [e.parcelId, e]),
    );

    return (
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Parcelas
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Elegí una zona o añadí otra para monitorear. El addon acumula
            eventos y guarda un lote cada 5 minutos.
          </p>
        </div>
        <MinecraftParcelHub
          parcels={parcels.map((p) => {
            const last = latestById.get(p.id);
            return {
              ...p,
              lastEventAt: last?.occurredAt.toISOString() ?? null,
              lastEventType: (last?.eventType as ParcelEventType | undefined) ?? null,
              lastEventGamertag: last?.gamertag ?? null,
            };
          })}
        />
      </section>
    );
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }
}
