import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIRECTORY_NEW_MEMBER_DAYS,
  memberIsNew,
} from "../src/lib/directory-cohort.ts";
import { formatInstantDate } from "../src/lib/format-instant.ts";
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

test("la insignia temporal dice el día, sin la hora, en la zona del visitante", () => {
  const copy = temporaryProtectionCopy(
    new Date("2026-10-09T18:00:00Z"),
    "America/Bogota",
  );
  assert.match(copy.chip, /^Activo permanente · temporal · hasta /);
  assert.equal(copy.date, formatInstantDate(new Date("2026-10-09T18:00:00Z"), "America/Bogota"));
  assert.doesNotMatch(copy.chip, /\d:\d{2}|[ap]\.\s*m/i);
});
