import { prisma } from "@/lib/prisma";
import { requirePanelSession } from "@/lib/panel-session";
import {
  memberToDirectoryCsvRecord,
  serializeDirectoryCsv,
} from "@/lib/spreadsheet-members";

export const runtime = "nodejs";

/** CSV de todo el directorio de la cuenta. UTF-8 con BOM. */
export async function GET() {
  const session = await requirePanelSession();
  const members = await prisma.directoryMember.findMany({
    where: { userId: session.userId },
    orderBy: { gamertag: "asc" },
  });
  const csv = serializeDirectoryCsv(members.map(memberToDirectoryCsvRecord));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="directorio.csv"',
      "Cache-Control": "no-store",
    },
  });
}
