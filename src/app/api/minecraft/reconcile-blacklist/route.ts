import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  blacklistReconcileCandidates,
  buildActiveCompareData,
} from "@/lib/directory-minecraft-compare";
import {
  buildRosterFromSnapshot,
  snapshotStatusByGamertag,
} from "@/lib/minecraft-active";
import { MINECRAFT_CONFIG_DEFAULTS } from "@/lib/minecraft-config-defaults";
import { syncDirectoryActiveWithMinecraft } from "@/lib/minecraft-directory-sync";
import { enqueueMinecraftPanelCommand } from "@/lib/minecraft-sync-request";
import { prisma } from "@/lib/prisma";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "No autenticado" }, { status: 401 });
}

function tagKey(gamertag: string): string {
  return gamertag.trim().toLowerCase();
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return unauthorized();

  const userId = await resolveDirectoryUserId(session);
  if (!userId) return unauthorized();

  let body: { gamertags?: unknown };
  try {
    body = (await request.json()) as { gamertags?: unknown };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!Array.isArray(body.gamertags)) {
    return NextResponse.json(
      { error: "gamertags debe ser un array" },
      { status: 400 },
    );
  }

  const requested = [
    ...new Set(
      body.gamertags
        .filter((g): g is string => typeof g === "string")
        .map((g) => g.trim())
        .filter(Boolean),
    ),
  ];

  if (requested.length === 0) {
    return NextResponse.json(
      { error: "Selecciona al menos un jugador." },
      { status: 400 },
    );
  }

  try {
    const [waMembers, mcPlayers, lastSnapshot, config] = await Promise.all([
      prisma.directoryMember.findMany({
        where: { userId },
        select: {
          id: true,
          gamertag: true,
          displayName: true,
          active: true,
          leftAt: true,
        },
      }),
      prisma.minecraftPlayer.findMany(),
      prisma.minecraftSnapshot.findFirst({
        orderBy: { timestamp: "desc" },
      }),
      prisma.minecraftConfig.findUnique({
        where: { id: "default" },
      }),
    ]);

    const daysInactiveThreshold =
      config?.daysInactive ?? MINECRAFT_CONFIG_DEFAULTS.daysInactive;
    const displayPlayers = buildRosterFromSnapshot(
      mcPlayers,
      snapshotStatusByGamertag(lastSnapshot?.data),
      daysInactiveThreshold,
    );
    const compare = buildActiveCompareData(waMembers, displayPlayers);
    const allowed = new Map(
      blacklistReconcileCandidates(
        compare.summary.mcActiveNotInWhatsappActive,
      ).map((row) => [tagKey(row.gamertag), row.gamertag] as const),
    );

    const rejected = requested.filter((tag) => !allowed.has(tagKey(tag)));
    const toApply = requested.filter((tag) => allowed.has(tagKey(tag)));

    if (toApply.length === 0) {
      return NextResponse.json(
        {
          error:
            "Ningún gamertag marcado es candidato (no está en el directorio o ya salió del grupo).",
          rejected,
        },
        { status: 400 },
      );
    }

    const blacklisted: string[] = [];
    const already: string[] = [];

    for (const tag of toApply) {
      const player = await prisma.minecraftPlayer.findFirst({
        where: { gamertag: { equals: tag, mode: "insensitive" } },
      });

      if (!player) {
        const canonical = allowed.get(tagKey(tag)) ?? tag;
        await prisma.minecraftPlayer.create({
          data: {
            gamertag: canonical,
            lastSeen: new Date(),
            active: true,
            daysInactive: 0,
            isBlacklisted: true,
          },
        });
        await syncDirectoryActiveWithMinecraft(canonical, false);
        blacklisted.push(canonical);
        continue;
      }

      if (player.isBlacklisted) {
        already.push(player.gamertag);
        continue;
      }

      await prisma.minecraftPlayer.update({
        where: { id: player.id },
        data: { isBlacklisted: true },
      });
      await syncDirectoryActiveWithMinecraft(player.gamertag, false);
      blacklisted.push(player.gamertag);
    }

    const sync = await enqueueMinecraftPanelCommand("syncall");

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/minecraft");
    revalidatePath("/dashboard/importar");

    return NextResponse.json({
      ok: true,
      blacklisted,
      already,
      rejected,
      syncRequestedAt: sync.requestedAt,
    });
  } catch (error) {
    console.error("[Reconcile blacklist] Error:", error);
    return NextResponse.json(
      { error: "No se pudo conciliar la blacklist." },
      { status: 500 },
    );
  }
}
