import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveDirectoryUserId } from "@/lib/resolve-directory-user";

/**
 * Exporta el roster activo de WhatsApp (activos, sin salida del grupo) en el
 * formato de allowlist del servidor de Minecraft Bedrock.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = await resolveDirectoryUserId(session);
  if (!userId) {
    redirect("/login");
  }

  const members = await prisma.directoryMember.findMany({
    where: { userId, active: true, leftAt: null },
    select: { gamertag: true, isAdmin: true },
    orderBy: { gamertag: "asc" },
  });

  const allowlist = members
    .map((m) => ({ gamertag: m.gamertag.trim(), isAdmin: m.isAdmin }))
    .filter((m) => m.gamertag.length > 0)
    .map((m) => ({
      ignoresPlayerLimit: m.isAdmin,
      name: m.gamertag,
    }));

  return new Response(JSON.stringify(allowlist, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="allowlist.json"',
    },
  });
}
