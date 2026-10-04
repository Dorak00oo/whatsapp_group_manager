import assert from "node:assert/strict";
import { test } from "node:test";
import {
  planHeartbeatDirectoryActive,
  planPanelDirectoryActive,
  type SyncMemberActive,
} from "../src/lib/directory-active-sync-plan.ts";

const now = new Date("2026-10-04T12:00:00Z");

function member(partial: Partial<SyncMemberActive> & Pick<SyncMemberActive, "id" | "gamertag">): SyncMemberActive {
  return {
    active: true,
    permanentlyActive: false,
    permanentlyActiveUntil: null,
    activeHoldFromMc: false,
    absentWithCause: false,
    leftAt: null,
    ...partial,
  };
}

test("el heartbeat no baja a quien tiene protección temporal vigente", () => {
  const plan = planHeartbeatDirectoryActive({
    now,
    minecraftActiveByGamertag: new Map([["steve", false]]),
    members: [
      member({
        id: "1",
        gamertag: "Steve",
        permanentlyActiveUntil: "2026-10-09T12:00:00Z",
      }),
    ],
  });
  assert.deepEqual(plan.changes, []);
});

test("vencida la protección, el heartbeat lo pasa a inactivo", () => {
  const plan = planHeartbeatDirectoryActive({
    now,
    minecraftActiveByGamertag: new Map([["steve", false]]),
    members: [
      member({
        id: "1",
        gamertag: "Steve",
        permanentlyActiveUntil: "2026-10-04T11:00:00Z",
      }),
    ],
  });
  assert.deepEqual(plan.deactivateIds, ["1"]);
  assert.equal(plan.changes[0]?.to, false);
});

test("el hold manual se respeta salvo ausente con causa", () => {
  const held = planHeartbeatDirectoryActive({
    now,
    minecraftActiveByGamertag: new Map([["steve", false]]),
    members: [member({ id: "1", gamertag: "Steve", activeHoldFromMc: true })],
  });
  assert.deepEqual(held.changes, []);

  const absent = planHeartbeatDirectoryActive({
    now,
    minecraftActiveByGamertag: new Map([["steve", false]]),
    members: [
      member({
        id: "1",
        gamertag: "Steve",
        activeHoldFromMc: true,
        absentWithCause: true,
      }),
    ],
  });
  assert.deepEqual(absent.deactivateIds, ["1"]);
});

test("el heartbeat sube a activo si Minecraft lo tiene activo", () => {
  const plan = planHeartbeatDirectoryActive({
    now,
    minecraftActiveByGamertag: new Map([["steve", true]]),
    members: [member({ id: "1", gamertag: "Steve", active: false })],
  });
  assert.deepEqual(plan.activateIds, ["1"]);
});

test("quien se salió no entra en el plan", () => {
  const plan = planHeartbeatDirectoryActive({
    now,
    minecraftActiveByGamertag: new Map([["steve", true]]),
    members: [member({ id: "1", gamertag: "Steve", active: false, leftAt: now })],
  });
  assert.deepEqual(plan.changes, []);
});

test("el botón sube al protegido temporal aunque no esté en Minecraft", () => {
  const plan = planPanelDirectoryActive({
    now,
    minecraftActiveByGamertag: new Map([["steve", false]]),
    members: [
      member({
        id: "1",
        gamertag: "Steve",
        active: false,
        permanentlyActiveUntil: "2026-10-09T12:00:00Z",
      }),
    ],
  });
  assert.deepEqual(plan.activateIds, ["1"]);
});

test("el botón ignora el hold y baja a quien no está protegido ni en Minecraft", () => {
  const plan = planPanelDirectoryActive({
    now,
    minecraftActiveByGamertag: new Map(),
    members: [member({ id: "1", gamertag: "Steve", activeHoldFromMc: true })],
  });
  assert.deepEqual(plan.deactivateIds, ["1"]);
});
