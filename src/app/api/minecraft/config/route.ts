import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

// GET: Obtener configuración actual
export async function GET(request: Request) {
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MINECRAFT_API_KEY no configurado" },
      { status: 503 },
    );
  }

  const token = getBearerToken(request);
  if (token !== secret) {
    return unauthorized();
  }

  try {
    let config = await prisma.minecraftConfig.findUnique({
      where: { id: "default" },
    });

    // Si no existe, crear con valores por defecto
    if (!config) {
      config = await prisma.minecraftConfig.create({
        data: {
          id: "default",
          daysInactive: 7,
          daysBlacklist: 14,
          daysPurge: 21,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      config: {
        daysInactive: config.daysInactive,
        daysBlacklist: config.daysBlacklist,
        daysPurge: config.daysPurge,
      },
    });
  } catch (error) {
    console.error("[Minecraft Config API] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 },
    );
  }
}

// POST: Actualizar configuración
export async function POST(request: Request) {
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MINECRAFT_API_KEY no configurado" },
      { status: 503 },
    );
  }

  const token = getBearerToken(request);
  if (token !== secret) {
    return unauthorized();
  }

  let body: {
    daysInactive?: number;
    daysBlacklist?: number;
    daysPurge?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const updateData: {
      daysInactive?: number;
      daysBlacklist?: number;
      daysPurge?: number;
    } = {};

    if (typeof body.daysInactive === "number" && body.daysInactive > 0) {
      updateData.daysInactive = body.daysInactive;
    }
    if (typeof body.daysBlacklist === "number" && body.daysBlacklist > 0) {
      updateData.daysBlacklist = body.daysBlacklist;
    }
    if (typeof body.daysPurge === "number" && body.daysPurge > 0) {
      updateData.daysPurge = body.daysPurge;
    }

    const config = await prisma.minecraftConfig.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        daysInactive: body.daysInactive ?? 7,
        daysBlacklist: body.daysBlacklist ?? 14,
        daysPurge: body.daysPurge ?? 21,
      },
    });

    return NextResponse.json({
      ok: true,
      config: {
        daysInactive: config.daysInactive,
        daysBlacklist: config.daysBlacklist,
        daysPurge: config.daysPurge,
      },
    });
  } catch (error) {
    console.error("[Minecraft Config API] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 },
    );
  }
}
