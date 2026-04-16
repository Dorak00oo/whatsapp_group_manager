import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const runtime = "nodejs";

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
    const player = await prisma.minecraftPlayer.findUnique({
      where: { gamertag: body.gamertag },
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
      where: { gamertag: body.gamertag },
      data: updateData,
    });

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
