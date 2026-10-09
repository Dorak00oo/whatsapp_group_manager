import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { PanelSession } from "@/lib/panel-session";
import { phoneToCountryCode } from "@/lib/phone-country";
import {
  decideViewerTimeZone,
  isValidTimeZoneId,
  PROVISIONAL_TIME_ZONE,
  type ViewerTimeZoneDecision,
} from "@/lib/viewer-time-zone";

export const VIEWER_TIME_ZONE_COOKIE = "panel_time_zone";

export type ViewerClockState = {
  timeZone: string;
  decision: ViewerTimeZoneDecision;
  memberId: string | null;
};

export function findViewerMember(session: PanelSession) {
  return prisma.directoryMember.findFirst({
    where: {
      userId: session.userId,
      gamertag: { equals: session.gamertag, mode: "insensitive" },
    },
    select: { id: true, timeZone: true, phoneCountry: true, phone: true },
  });
}

export const resolveViewerClock = cache(
  async (session: PanelSession): Promise<ViewerClockState> => {
    const member = await findViewerMember(session);

    const phoneCountry =
      member?.phoneCountry ?? (member?.phone ? phoneToCountryCode(member.phone) : null);

    const cookieZone = member
      ? null
      : ((await cookies()).get(VIEWER_TIME_ZONE_COOKIE)?.value ?? null);

    const decision = decideViewerTimeZone({
      timeZone: member?.timeZone ?? cookieZone,
      phoneCountry,
    });

    if (
      decision.status === "ready" &&
      member &&
      !(member.timeZone && isValidTimeZoneId(member.timeZone))
    ) {
      await prisma.directoryMember.update({
        where: { id: member.id },
        data: { timeZone: decision.timeZone },
      });
    }

    return {
      timeZone: decision.status === "ready" ? decision.timeZone : PROVISIONAL_TIME_ZONE,
      decision,
      memberId: member?.id ?? null,
    };
  },
);
