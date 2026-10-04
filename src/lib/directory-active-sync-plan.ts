import { isMemberProtected } from "@/lib/directory-protection";

export type SyncMemberActive = {
  id: string;
  gamertag: string;
  active: boolean;
  permanentlyActive: boolean;
  permanentlyActiveUntil: Date | string | null;
  activeHoldFromMc: boolean;
  absentWithCause: boolean;
  leftAt: Date | string | null;
};

export type ActiveSyncChange = {
  id: string;
  gamertag: string;
  from: boolean;
  to: boolean;
};

export type ActiveSyncPlan = {
  activateIds: string[];
  deactivateIds: string[];
  changes: ActiveSyncChange[];
};

function tagKey(gamertag: string): string {
  return gamertag.trim().toLowerCase();
}

/**
 * Heartbeat: si Minecraft lo tiene activo, sube a activo.
 * Si no, no baja a quien es protegido (manual o temporal vigente) ni a quien
 * tiene `activeHoldFromMc`, salvo ausente con causa (ese sí baja).
 * No sube a un protegido que ya está inactivo: igual que el permanente hoy.
 */
export function planHeartbeatDirectoryActive(input: {
  members: SyncMemberActive[];
  minecraftActiveByGamertag: ReadonlyMap<string, boolean>;
  now: Date;
}): ActiveSyncPlan {
  const activateIds: string[] = [];
  const deactivateIds: string[] = [];
  const changes: ActiveSyncChange[] = [];

  for (const m of input.members) {
    if (m.leftAt) continue;
    const mc = input.minecraftActiveByGamertag.get(tagKey(m.gamertag)) ?? false;
    if (mc) {
      if (!m.active) {
        activateIds.push(m.id);
        changes.push({ id: m.id, gamertag: m.gamertag, from: false, to: true });
      }
      continue;
    }
    if (isMemberProtected(m, input.now)) continue;
    if (m.activeHoldFromMc && !m.absentWithCause) continue;
    if (m.active) {
      deactivateIds.push(m.id);
      changes.push({ id: m.id, gamertag: m.gamertag, from: true, to: false });
    }
  }

  return { activateIds, deactivateIds, changes };
}

/**
 * Botón del panel: ignora `activeHoldFromMc`.
 * Protegido (manual o temporal vigente) queda activo, esté o no en Minecraft.
 */
export function planPanelDirectoryActive(input: {
  members: SyncMemberActive[];
  minecraftActiveByGamertag: ReadonlyMap<string, boolean>;
  now: Date;
}): ActiveSyncPlan {
  const activateIds: string[] = [];
  const deactivateIds: string[] = [];
  const changes: ActiveSyncChange[] = [];

  for (const m of input.members) {
    if (m.leftAt) continue;
    const mc = input.minecraftActiveByGamertag.get(tagKey(m.gamertag)) ?? false;
    const should = isMemberProtected(m, input.now) || mc;
    if (m.active === should) continue;
    if (should) activateIds.push(m.id);
    else deactivateIds.push(m.id);
    changes.push({
      id: m.id,
      gamertag: m.gamertag,
      from: m.active,
      to: should,
    });
  }

  return { activateIds, deactivateIds, changes };
}
