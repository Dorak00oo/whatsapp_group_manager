import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveAddonIdentityFromRequest } from "@/lib/minecraft-installs-db";
import {
  heartbeatFromRequestAndBody,
  type MinecraftServerId,
} from "@/lib/minecraft-server";
import { touchMinecraftServerHeartbeat } from "@/lib/minecraft-servers-db";
import { selectedMinecraftServerId } from "@/lib/minecraft-world";

export function unauthorizedMinecraft() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function pendingMinecraftPairResponse(installId: string) {
  return NextResponse.json(
    {
      ok: true,
      pending: true,
      installId,
      error: "Asigná este dedicated en Ajustes (Vanilla o Mods).",
    },
    { status: 202 },
  );
}

export function getMinecraftBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (!h?.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim() || null;
}

type AddonBody = {
  serverId?: unknown;
  installId?: unknown;
  flavor?: unknown;
  version?: unknown;
  worldName?: unknown;
} | null;

export type MinecraftApiContext =
  | { ok: true; serverId: MinecraftServerId; via: "addon" | "panel" }
  | { ok: false; response: NextResponse };

async function authenticateAddon(
  request: Request,
  body?: AddonBody,
): Promise<MinecraftApiContext> {
  const secret = process.env.MINECRAFT_API_KEY?.trim();
  if (!secret) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "MINECRAFT_API_KEY no configurado" },
        { status: 503 },
      ),
    };
  }
  const token = getMinecraftBearerToken(request);
  if (!token || token !== secret) {
    return { ok: false, response: unauthorizedMinecraft() };
  }
  const identity = await resolveAddonIdentityFromRequest(request, body);
  if (identity.kind === "pending") {
    return {
      ok: false,
      response: pendingMinecraftPairResponse(identity.installId),
    };
  }
  const heartbeat = heartbeatFromRequestAndBody(request, body);
  await touchMinecraftServerHeartbeat(identity.serverId, {
    ...heartbeat,
    flavor: identity.kind === "mapped" ? null : heartbeat.flavor,
  });
  return { ok: true, serverId: identity.serverId, via: "addon" };
}

/** Addon: Bearer + install UUID o serverId legacy + heartbeat. */
export async function requireMinecraftAddon(
  request: Request,
  body?: AddonBody,
): Promise<MinecraftApiContext> {
  const token = getMinecraftBearerToken(request);
  if (!token) return { ok: false, response: unauthorizedMinecraft() };
  return authenticateAddon(request, body);
}

/** Panel: sesión + cookie `mc_world`. */
export async function requireMinecraftPanel(): Promise<MinecraftApiContext> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, response: unauthorizedMinecraft() };
  }
  return {
    ok: true,
    serverId: await selectedMinecraftServerId(),
    via: "panel",
  };
}

/**
 * Bearer válido → addon (UUID mapeado o header legacy). Sin Bearer → sesión + cookie.
 */
export async function requireMinecraftAddonOrPanel(
  request: Request,
  body?: AddonBody,
): Promise<MinecraftApiContext> {
  if (getMinecraftBearerToken(request)) {
    return authenticateAddon(request, body);
  }
  return requireMinecraftPanel();
}
