import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { AuditActor } from "@/lib/audit-format";

export type PanelSession = {
  /** Dueño interno de los datos (User comunitario): filtra `DirectoryMember.userId`. */
  userId: string;
  /** Gamertag de quien entró (el actual del miembro, o el del dueño). */
  gamertag: string;
  isPanelOwner: boolean;
};

export type PanelAuditActor = Extract<AuditActor, { actorType: "panel" }>;

/**
 * Sesión del panel o `null`. `auth()` ya revalida la cuenta en cada request
 * (callback `jwt`): si quitaron la cuenta, aquí llega `null`.
 * Para rutas API: responde 401 cuando sea `null`.
 */
export const getPanelSession = cache(async (): Promise<PanelSession | null> => {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.gamertag) return null;
  return {
    userId: user.id,
    gamertag: user.gamertag,
    isPanelOwner: user.isPanelOwner === true,
  };
});

/** Páginas, layouts y server actions: sin sesión válida redirige a `/login`. */
export async function requirePanelSession(): Promise<PanelSession> {
  const session = await getPanelSession();
  if (!session) redirect("/login");
  return session;
}

export function panelActor(session: PanelSession): PanelAuditActor {
  return { actorType: "panel", actorGamertag: session.gamertag };
}

/** Actor del historial para la cuenta logueada; `null` sin sesión. */
export async function getPanelActor(): Promise<PanelAuditActor | null> {
  const session = await getPanelSession();
  return session ? panelActor(session) : null;
}
