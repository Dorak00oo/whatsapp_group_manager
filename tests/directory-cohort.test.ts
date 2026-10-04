import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIRECTORY_NEW_MEMBER_DAYS,
  memberIsNew,
} from "../src/lib/directory-cohort.ts";
import { temporaryProtectionCopy } from "../src/lib/directory-protection-label.ts";

test("los nuevos duran 5 días, igual que la protección", () => {
  assert.equal(DIRECTORY_NEW_MEMBER_DAYS, 5);
  const created = "2026-10-01T12:00:00.000Z";
  const still = Date.parse("2026-10-06T12:00:00.000Z");
  const after = Date.parse("2026-10-06T12:00:01.000Z");
  assert.equal(memberIsNew(created, null, still), true);
  assert.equal(memberIsNew(created, null, after), false);
  assert.equal(memberIsNew(created, "2026-10-02T00:00:00.000Z", still), false);
});

test("la insignia temporal dice hasta la hora de México", () => {
  const copy = temporaryProtectionCopy(new Date("2026-10-09T18:00:00Z"));
  assert.match(copy.chip, /^Activo permanente · temporal · hasta /);
  assert.ok(copy.mexico.length > 0);
  assert.ok(copy.colombia.length > 0);
  assert.notEqual(copy.chip, copy.colombia);
});
