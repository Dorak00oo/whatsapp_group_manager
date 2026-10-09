"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requirePanelSession } from "@/lib/panel-session";
import { findViewerMember, VIEWER_TIME_ZONE_COOKIE } from "@/lib/resolve-viewer-clock";
import { isValidTimeZoneId } from "@/lib/viewer-time-zone";

export async function saveViewerTimeZone(
  timeZone: string,
): Promise<{ ok: true } | { error: string }> {
  const session = await requirePanelSession();

  if (!isValidTimeZoneId(timeZone)) return { error: "Zona horaria no válida" };

  const member = await findViewerMember(session);
  const store = await cookies();

  if (member) {
    await prisma.directoryMember.update({
      where: { id: member.id },
      data: { timeZone },
    });
    store.delete(VIEWER_TIME_ZONE_COOKIE);
  } else {
    store.set(VIEWER_TIME_ZONE_COOKIE, timeZone, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
