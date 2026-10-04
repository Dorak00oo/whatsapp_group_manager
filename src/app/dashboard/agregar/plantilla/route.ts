import { requirePanelSession } from "@/lib/panel-session";
import { directoryCsvTemplate } from "@/lib/spreadsheet-members";

export const runtime = "nodejs";

/** Plantilla vacía: mismas columnas que la exportación, sin filas de ejemplo. */
export async function GET() {
  await requirePanelSession();
  return new Response(directoryCsvTemplate(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-directorio.csv"',
      "Cache-Control": "no-store",
    },
  });
}
