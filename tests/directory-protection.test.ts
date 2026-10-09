import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hasTemporaryProtection,
  isMemberProtected,
  newMemberProtectionUntil,
  shouldShowTemporaryProtectionChip,
  NEW_MEMBER_PROTECTION_DAYS,
} from "../src/lib/directory-protection.ts";

const now = new Date("2026-10-04T12:00:00Z");

test("la protección de nuevo dura 5 días desde el alta", () => {
  assert.equal(NEW_MEMBER_PROTECTION_DAYS, 5);
  const until = newMemberProtectionUntil(new Date("2026-10-01T08:30:00Z"));
  assert.equal(until.toISOString(), "2026-10-06T08:30:00.000Z");
});

test("protección vigente cuenta como protegido; vencida no", () => {
  const vigente = { permanentlyActive: false, permanentlyActiveUntil: "2026-10-05T00:00:00Z" };
  const vencida = { permanentlyActive: false, permanentlyActiveUntil: "2026-10-04T11:59:59Z" };
  assert.equal(hasTemporaryProtection(vigente, now), true);
  assert.equal(isMemberProtected(vigente, now), true);
  assert.equal(hasTemporaryProtection(vencida, now), false);
  assert.equal(isMemberProtected(vencida, now), false);
});

test("el activo permanente manual sigue protegido sin fecha", () => {
  assert.equal(isMemberProtected({ permanentlyActive: true, permanentlyActiveUntil: null }, now), true);
  assert.equal(isMemberProtected({ permanentlyActive: false, permanentlyActiveUntil: null }, now), false);
});

test("un nuevo que se salió no muestra el letrero de permanente temporal", () => {
  assert.equal(
    shouldShowTemporaryProtectionChip(
      {
        leftAt: "2026-10-04T12:00:00Z",
        permanentlyActive: false,
        permanentlyActiveUntil: "2026-10-09T12:00:00Z",
      },
      now,
    ),
    false,
  );
  assert.equal(
    shouldShowTemporaryProtectionChip(
      {
        leftAt: null,
        permanentlyActive: false,
        permanentlyActiveUntil: "2026-10-09T12:00:00Z",
      },
      now,
    ),
    true,
  );
});
