import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIRECTORY_ABSENT_ACTIVE_DAYS,
  absentActiveSinceForSituation,
  fieldsForExpiredAbsentToNormal,
  memberRosterSituation,
  rosterFieldsForSituation,
  shouldPromoteAbsentToNormal,
} from "../src/lib/directory-situation.ts";

test("ausente conserva la columna activa", () => {
  const next = rosterFieldsForSituation("absent", true, "viaje");
  assert.equal(next.active, true);
  assert.equal(next.absentWithCause, true);
  assert.equal(next.absentReason, "viaje");
  assert.equal(next.reactivated, false);
  assert.equal(next.deactivated, false);
  assert.equal(next.activeHoldFromMc, true);
});

test("ausente conserva la columna inactiva", () => {
  const next = rosterFieldsForSituation("absent", false, "enfermedad");
  assert.equal(next.active, false);
  assert.equal(next.absentWithCause, true);
  assert.equal(next.reactivated, false);
  assert.equal(next.deactivated, false);
});

test("pasar a inactivo baja de roster y quita ausencia", () => {
  const next = rosterFieldsForSituation("inactive", true, "viaje");
  assert.equal(next.active, false);
  assert.equal(next.absentWithCause, false);
  assert.equal(next.absentReason, null);
  assert.equal(next.deactivated, true);
});

test("activo normal sube a roster y quita ausencia", () => {
  const next = rosterFieldsForSituation("normal", false, "viaje");
  assert.equal(next.active, true);
  assert.equal(next.absentWithCause, false);
  assert.equal(next.reactivated, true);
});

test("ausente en activos arranca el reloj ahora", () => {
  const now = new Date("2026-09-29T20:00:00Z");
  assert.equal(
    absentActiveSinceForSituation("absent", true, now)?.toISOString(),
    now.toISOString(),
  );
});

test("ausente inactivo no arranca el reloj", () => {
  const now = new Date("2026-09-29T20:00:00Z");
  assert.equal(absentActiveSinceForSituation("absent", false, now), null);
});

test("activo normal borra el reloj de ausencia", () => {
  const now = new Date("2026-09-29T20:00:00Z");
  assert.equal(absentActiveSinceForSituation("normal", true, now), null);
});

test("no promociona ausente activo antes de 7 días", () => {
  const now = new Date("2026-09-29T20:00:00Z");
  const since = new Date("2026-09-23T20:00:00Z");
  assert.equal(
    shouldPromoteAbsentToNormal(
      {
        absentWithCause: true,
        active: true,
        leftAt: null,
        absentActiveSince: since,
      },
      now,
    ),
    false,
  );
});

test("promociona ausente activo a los 7 días exactos", () => {
  const now = new Date("2026-09-29T20:00:00Z");
  const since = new Date("2026-09-22T20:00:00Z");
  assert.equal(DIRECTORY_ABSENT_ACTIVE_DAYS, 7);
  assert.equal(
    shouldPromoteAbsentToNormal(
      {
        absentWithCause: true,
        active: true,
        leftAt: null,
        absentActiveSince: since,
      },
      now,
    ),
    true,
  );
});

test("no promociona si el reloj aún no arrancó", () => {
  const now = new Date("2026-09-29T20:00:00Z");
  assert.equal(
    shouldPromoteAbsentToNormal(
      {
        absentWithCause: true,
        active: true,
        leftAt: null,
        absentActiveSince: null,
      },
      now,
    ),
    false,
  );
});

test("no promociona ausente que sigue inactivo", () => {
  const now = new Date("2026-09-29T20:00:00Z");
  const since = new Date("2026-09-01T20:00:00Z");
  assert.equal(
    shouldPromoteAbsentToNormal(
      {
        absentWithCause: true,
        active: false,
        leftAt: null,
        absentActiveSince: since,
      },
      now,
    ),
    false,
  );
});

test("la protección temporal no se guarda como activo permanente manual", () => {
  const situation = memberRosterSituation({
    active: true,
    permanentlyActive: false,
    absentWithCause: false,
    leftAt: null,
  });
  assert.equal(situation, "normal");
  assert.equal(
    rosterFieldsForSituation(situation, true, "").permanentlyActive,
    false,
  );
});

test("promoción deja activo normal y quita ausencia", () => {
  const next = fieldsForExpiredAbsentToNormal();
  assert.equal(next.active, true);
  assert.equal(next.permanentlyActive, false);
  assert.equal(next.absentWithCause, false);
  assert.equal(next.absentReason, null);
  assert.equal(next.absentActiveSince, null);
});
