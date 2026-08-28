import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findMemberByPhone,
  phonesLikelySame,
  placeholderGamertag,
  planWhatsAppRosterChange,
} from "./wsp-bot-directory.ts";

test("plan: alta nueva crea, reingreso restaura, duplicado no toca", () => {
  assert.deepEqual(planWhatsAppRosterChange(null, "join"), { type: "create" });
  assert.deepEqual(
    planWhatsAppRosterChange(
      { id: "m1", leftAt: new Date("2026-01-01") },
      "join",
    ),
    { type: "restore", memberId: "m1" },
  );
  assert.deepEqual(
    planWhatsAppRosterChange({ id: "m1", leftAt: null }, "join"),
    { type: "noop" },
  );
});

test("plan: salida marca leftAt; desconocido o ya salido no toca", () => {
  assert.deepEqual(planWhatsAppRosterChange(null, "leave"), { type: "noop" });
  assert.deepEqual(
    planWhatsAppRosterChange(
      { id: "m1", leftAt: new Date("2026-01-01") },
      "leave",
    ),
    { type: "noop" },
  );
  assert.deepEqual(
    planWhatsAppRosterChange({ id: "m1", leftAt: null }, "leave"),
    { type: "mark_left", memberId: "m1" },
  );
});

test("México 521 y 52 se consideran el mismo número", () => {
  assert.equal(phonesLikelySame("+52 55 1234 5678", "5215512345678"), true);
  assert.equal(phonesLikelySame("5491112345678", "541112345678"), true);
  assert.equal(phonesLikelySame("573001112233", "5215512345678"), false);
});

test("busca miembro por dígitos aunque el formato del panel tenga espacios", () => {
  const hit = findMemberByPhone(
    [{ id: "1", phone: "+57 300 111 2233" }],
    "573001112233@s.whatsapp.net",
  );
  assert.equal(hit?.id, "1");
});

test("gamertag placeholder no usa un nombre que es solo el número", () => {
  assert.equal(placeholderGamertag("573001112233", ""), "wa-573001112233");
  assert.equal(placeholderGamertag("573001112233", "573001112233"), "wa-573001112233");
  assert.equal(placeholderGamertag("573001112233", "Drako"), "Drako");
});
