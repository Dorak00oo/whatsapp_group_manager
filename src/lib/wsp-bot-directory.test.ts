import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatWhatsAppUsername,
  normalizeWhatsAppUsername,
} from "./whatsapp-username.ts";
import {
  displayNameForRestore,
  findMemberByPhone,
  findMemberByUsername,
  findMemberByWhatsAppIdentity,
  gamertagForJoin,
  explicitJoinGamertag,
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

test("no empareja teléfonos vacíos", () => {
  assert.equal(
    findMemberByPhone([{ id: "1", phone: null }], "573001112233"),
    undefined,
  );
});

test("gamertag placeholder no usa un nombre que es solo el número", () => {
  assert.equal(placeholderGamertag("573001112233", ""), "wa-573001112233");
  assert.equal(placeholderGamertag("573001112233", "573001112233"), "wa-573001112233");
  assert.equal(placeholderGamertag("573001112233", "Drako"), "Drako");
});

test("join solo usa gamertag explícito; sin comando no hay placeholder", () => {
  assert.equal(
    gamertagForJoin("573001112233", "Carlos", "Steve123"),
    "Steve123",
  );
  assert.equal(gamertagForJoin("573001112233", "Carlos"), null);
  assert.equal(gamertagForJoin("573001112233", ""), null);
  assert.equal(explicitJoinGamertag("  Steve123  "), "Steve123");
  assert.equal(explicitJoinGamertag(""), null);
});

test("restore rellena displayName vacío y no pisa uno existente", () => {
  assert.equal(displayNameForRestore(null, "Carlos"), "Carlos");
  assert.equal(displayNameForRestore("", "Carlos"), "Carlos");
  assert.equal(displayNameForRestore("Ana", "Carlos"), undefined);
  assert.equal(displayNameForRestore(null, ""), undefined);
});

test("usuario de WhatsApp normaliza @ y mayúsculas; no es el nombre de perfil", () => {
  assert.deepEqual(normalizeWhatsAppUsername("@Drak00_oo"), {
    ok: true,
    username: "drak00_oo",
  });
  assert.equal(formatWhatsAppUsername("drak00_oo"), "@drak00_oo");
  const empty = normalizeWhatsAppUsername("");
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.empty, true);
  assert.equal(normalizeWhatsAppUsername("Ana Perez").ok, false);
});

test("busca por usuario aunque no haya teléfono", () => {
  const members = [
    { id: "1", phone: null, whatsappUsername: "drak00_oo" },
    { id: "2", phone: "+57 300 111 2233", whatsappUsername: null },
  ];
  assert.equal(findMemberByUsername(members, "@Drak00_oo")?.id, "1");
  assert.equal(
    findMemberByWhatsAppIdentity(members, {
      phone: null,
      username: "drak00_oo",
    })?.id,
    "1",
  );
  assert.equal(
    findMemberByWhatsAppIdentity(members, {
      phone: "573001112233",
      username: null,
    })?.id,
    "2",
  );
});
