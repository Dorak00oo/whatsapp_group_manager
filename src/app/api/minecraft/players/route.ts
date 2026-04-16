import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncDirectoryActiveWithMinecraft } from "@/lib/minecraft-directory-sync";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * La blacklist / whitelist en el panel solo actualiza la base en Vercel.
 * El addon del servidor de Bedrock debe consultar con frecuencia
 * `GET /api/minecraft/status` (mismo Bearer que el POST) y aplicar listas
 * al unirse o en bucle; si solo confía en el POST de actividad, no verá
 * cambios del panel hasta el siguiente envío del servidor.
 */

// POST: Actualizar estado de un jugador
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    gamertag: string;
    action: "blacklist" | "whitelist" | "remove_blacklist" | "remove_whitelist";
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.gamertag || !body.action) {
    return NextResponse.json(
      { error: "gamertag y action son requeridos" },
      { status: 400 },
    );
  }

  try {
    const tag = body.gamertag.trim();
    const player = await prisma.minecraftPlayer.findFirst({
      where: { gamertag: { equals: tag, mode: "insensitive" } },
    });

    if (!player) {
      return NextResponse.json(
        { error: "Jugador no encontrado" },
        { status: 404 },
      );
    }

    const updateData: {
      isBlacklisted?: boolean;
      isWhitelisted?: boolean;
    } = {};

    switch (body.action) {
      case "blacklist":
        updateData.isBlacklisted = true;
        break;
      case "remove_blacklist":
        updateData.isBlacklisted = false;
        break;
      case "whitelist":
        updateData.isWhitelisted = true;
        break;
      case "remove_whitelist":
        updateData.isWhitelisted = false;
        break;
      default:
        return NextResponse.json(
          { error: "Acción inválida" },
          { status: 400 },
        );
    }

    const updated = await prisma.minecraftPlayer.update({
      where: { id: player.id },
      data: updateData,
    });

    if (body.action === "blacklist") {
      await syncDirectoryActiveWithMinecraft(updated.gamertag, false);
    } else if (body.action === "remove_blacklist") {
      await syncDirectoryActiveWithMinecraft(
        updated.gamertag,
        updated.active,
      );
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/minecraft");

    return NextResponse.json({
      ok: true,
      player: {
        gamertag: updated.gamertag,
        isBlacklisted: updated.isBlacklisted,
        isWhitelisted: updated.isWhitelisted,
      },
    });
  } catch (error) {
    console.error("[Minecraft Players API] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar jugador" },
      { status: 500 },
    );
  }
}
