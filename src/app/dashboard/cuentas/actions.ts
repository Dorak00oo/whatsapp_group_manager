"use server";

import { revalidatePath } from "next/cache";
import { recordAuditEvent } from "@/lib/audit-log";
import { getPanelAuthEnv } from "@/lib/community-env";
import {
  createPanelAccount,
  deletePanelAccount,
  searchPanelAccountCandidates,
  type PanelAccountCandidate,
} from "@/lib/panel-accounts";
import { getPanelSession, panelActor, type PanelSession } from "@/lib/panel-session";

type Result = { ok: true; message: string } | { ok: false; error: string };

async function ownerSession(): Promise<PanelSession | { error: string }> {
  const session = await getPanelSession();
  if (!session) return { error: "Tu sesión terminó. Vuelve a entrar." };
  if (!session.isPanelOwner) {
    return { error: `Solo ${getPanelAuthEnv().ownerGamertag} puede gestionar cuentas.` };
  }
  return session;
}

export async function searchAccountCandidatesAction(
  query: string,
): Promise<{ candidates: PanelAccountCandidate[] } | { error: string }> {
  const session = await ownerSession();
  if ("error" in session) return session;
  try {
    const candidates = await searchPanelAccountCandidates(
      session.userId,
      String(query ?? "").slice(0, 80),
      getPanelAuthEnv().ownerGamertag,
    );
    return { candidates };
  } catch (e) {
    console.error("[cuentas] búsqueda falló", e);
    return { error: "No se pudo buscar en el directorio. Intenta de nuevo." };
  }
}

export async function addPanelAccountAction(memberId: string): Promise<Result> {
  const session = await ownerSession();
  if ("error" in session) return { ok: false, error: session.error };

  let result: Awaited<ReturnType<typeof createPanelAccount>>;
  try {
    result = await createPanelAccount({
      userId: session.userId,
      memberId: String(memberId ?? ""),
      createdBy: session.gamertag,
      ownerGamertag: getPanelAuthEnv().ownerGamertag,
    });
  } catch (e) {
    console.error("[cuentas] alta falló", e);
    return { ok: false, error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }
  if (!result.ok) return result;

  await recordAuditEvent({
    userId: session.userId,
    actor: panelActor(session),
    action: "account.add",
    memberId: result.memberId,
    memberGamertag: result.gamertag,
  });
  revalidatePath("/dashboard/cuentas");
  return {
    ok: true,
    message: `${result.gamertag} ya puede entrar con su gamertag y la contraseña grupal.`,
  };
}

export async function removePanelAccountAction(accountId: string): Promise<Result> {
  const session = await ownerSession();
  if ("error" in session) return { ok: false, error: session.error };

  let result: Awaited<ReturnType<typeof deletePanelAccount>>;
  try {
    result = await deletePanelAccount({
      userId: session.userId,
      accountId: String(accountId ?? ""),
    });
  } catch (e) {
    console.error("[cuentas] baja falló", e);
    return { ok: false, error: "No se pudo quitar la cuenta. Intenta de nuevo." };
  }
  if (!result.ok) return result;

  await recordAuditEvent({
    userId: session.userId,
    actor: panelActor(session),
    action: "account.remove",
    memberId: result.memberId,
    memberGamertag: result.gamertag,
  });
  revalidatePath("/dashboard/cuentas");
  return {
    ok: true,
    message: `${result.gamertag} ya no puede entrar. Si tenía el panel abierto, se le cierra en su próximo clic.`,
  };
}
