import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DatabaseUnavailable } from "@/components/database-unavailable";
import { MinecraftParcelSection } from "@/components/minecraft-parcel-section";
import { formatInstantMexicoColombia } from "@/lib/format-time-mx-co";
import { PARCEL_PAGE_SIZE, isParcelDimension } from "@/lib/minecraft-parcel";
import { isDatabaseUnreachableError } from "@/lib/prisma-errors";
import { prisma } from "@/lib/prisma";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";

type Ctx = { params: Promise<{ id: string }> };

export default async function DashboardParcelaDetailPage({ params }: Ctx) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const parcelId = id?.trim();
  if (!parcelId) notFound();

  let userId: string | null;
  try {
    userId = await resolveDirectoryUserId(session);
  } catch (e) {
    if (isDatabaseUnreachableError(e)) {
      return <DatabaseUnavailable />;
    }
    throw e;
  }
  if (!userId) return null;

  try {
    const [parcel, events, eventTotal, members] = await Promise.all([
      prisma.minecraftParcel.findUnique({ where: { id: parcelId } }),
      prisma.minecraftParcelEvent.findMany({
        where: { parcelId },
        orderBy: { occurredAt: "desc" },
        take: PARCEL_PAGE_SIZE,
      }),
      prisma.minecraftParcelEvent.count({ where: { parcelId } }),
      prisma.directoryMember.findMany({
        where: { userId },
        select: {
          gamertag: true,
          displayName: true,
          active: true,
          leftAt: true,
        },
      }),
    ]);

    if (!parcel) notFound();

    const directoryByTag: Record<
      string,
      {
        gamertag: string;
        displayName: string | null;
        active: boolean;
        leftAt: string | null;
      }
    > = {};
    for (const m of members) {
      directoryByTag[m.gamertag.trim().toLowerCase()] = {
        gamertag: m.gamertag,
        displayName: m.displayName,
        active: m.active,
        leftAt: m.leftAt?.toISOString() ?? null,
      };
    }

    return (
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {parcel.name}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            El addon acumula eventos en el mundo y guarda un lote cada 5
            minutos (o cuando lo pedís). Esta página se refresca sola cada 5
            minutos y también cuando llega un lote pedido.
          </p>
        </div>
        <MinecraftParcelSection
          parcelId={parcel.id}
          isPrimary={parcel.isPrimary}
          parcel={{
            enabled: parcel.enabled,
            name: parcel.name,
            dimension: isParcelDimension(parcel.dimension)
              ? parcel.dimension
              : "overworld",
            minX: parcel.minX,
            minY: parcel.minY,
            minZ: parcel.minZ,
            maxX: parcel.maxX,
            maxY: parcel.maxY,
            maxZ: parcel.maxZ,
          }}
          totalEvents={eventTotal}
          events={events.map((e) => {
            const zones = formatInstantMexicoColombia(e.occurredAt);
            return {
              id: e.id,
              gamertag: e.gamertag,
              event: e.eventType as "enter" | "exit" | "chest_open",
              occurredAt: e.occurredAt.toISOString(),
              timeMexico: zones.mexico,
              timeColombia: zones.colombia,
              x: e.posX,
              y: e.posY,
              z: e.posZ,
              dimension: e.dimension,
              blockType: e.blockType ?? null,
            };
          })}
          directoryByTag={directoryByTag}
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
