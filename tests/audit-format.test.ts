import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AUDIT_ACTIONS,
  auditActionLabel,
  describeAuditEvent,
  diffAuditChanges,
  formatAuditValue,
  type AuditEventView,
} from "../src/lib/audit-format.ts";

function ev(partial: Partial<AuditEventView>): AuditEventView {
  return {
    action: "member.update",
    actorType: "panel",
    actorGamertag: "Drako274",
    actorPhone: null,
    actorName: null,
    memberGamertag: "Steve",
    changes: null,
    details: null,
    ...partial,
  };
}

const line = (partial: Partial<AuditEventView>) => describeAuditEvent(ev(partial)).text;

test("member.update con un cambio de situación", () => {
  assert.equal(
    line({ changes: { active: { from: true, to: false } } }),
    "Drako274 cambió la situación de Steve: activo → inactivo",
  );
});

test("member.update con varios cambios resume hasta 3", () => {
  assert.equal(
    line({
      changes: {
        gamertag: { from: "Stev", to: "Steve" },
        isAdmin: { from: false, to: true },
        age: { from: null, to: 18 },
        notes: { from: "", to: "hola" },
      },
    }),
    "Drako274 editó a Steve: el gamertag Stev → Steve · admin no → sí · la edad — → 18 · y 1 más",
  );
});

test("altas: panel, CSV y desde WhatsApp con actor del bot", () => {
  assert.equal(line({ action: "member.create" }), "Drako274 agregó a Steve");
  assert.equal(
    line({ action: "member.create", details: { source: "formulario" } }),
    "Drako274 agregó a Steve desde el formulario",
  );
  assert.equal(
    line({ action: "member.create", details: { source: "csv" } }),
    "Drako274 agregó a Steve desde un CSV",
  );
  assert.equal(
    line({ action: "bot.join", actorType: "bot", actorGamertag: "Juan123" }),
    "Juan123 agregó a Steve desde WhatsApp",
  );
  assert.equal(
    line({ action: "bot.join", actorType: "bot", actorGamertag: null, actorName: "Pedro" }),
    "Pedro agregó a Steve desde WhatsApp",
  );
  assert.equal(
    line({ action: "bot.join", actorType: "bot", actorGamertag: null, actorPhone: "573009998877" }),
    "+573009998877 agregó a Steve desde WhatsApp",
  );
});

test("eventos automáticos del bot (actor sistema)", () => {
  const sys = { actorType: "sistema", actorGamertag: null } as const;
  assert.equal(line({ ...sys, action: "bot.join" }), "Steve entró al grupo de WhatsApp");
  assert.equal(line({ ...sys, action: "bot.rejoin" }), "Steve volvió al grupo de WhatsApp");
  assert.equal(
    line({ ...sys, action: "bot.join", details: { restored: true } }),
    "Steve volvió al grupo de WhatsApp",
  );
  assert.equal(line({ ...sys, action: "bot.leave" }), "Steve salió del grupo de WhatsApp");
});

test("strikes, ban y desban", () => {
  assert.equal(
    line({ action: "strike.add", details: { reason: "griefing" } }),
    "Drako274 le puso un strike a Steve: griefing",
  );
  assert.equal(line({ action: "strike.remove" }), "Drako274 le quitó un strike a Steve");
  assert.equal(
    line({ action: "ban.set", details: { reason: "hack" } }),
    "Drako274 baneó a Steve: hack",
  );
  assert.equal(
    line({ action: "ban.set", changes: { banned: { from: true, to: false } } }),
    "Drako274 le quitó el ban a Steve",
  );
});

test("sincronizaciones, CSV y comandos remotos", () => {
  assert.equal(
    line({
      action: "mc.sync",
      actorType: "sistema",
      actorGamertag: null,
      changes: { active: { from: true, to: false } },
    }),
    "La sync con Minecraft cambió la situación de Steve: activo → inactivo",
  );
  assert.equal(
    line({ action: "bot.sync", memberGamertag: null, details: { created: 2, left: 1 } }),
    "Drako274 sincronizó el grupo de WhatsApp: 2 altas, 1 salida",
  );
  assert.equal(
    line({ action: "csv.import", memberGamertag: null, details: { created: 12, skipped: 3 } }),
    "Drako274 importó un CSV: 12 altas, 3 saltadas",
  );
  assert.equal(
    line({
      action: "remote.cmd",
      memberGamertag: "Juan123",
      details: { label: "TP", destination: "Drako274", world: "Vanilla" },
    }),
    "Drako274 envió «TP» a Juan123 → Drako274 en Vanilla",
  );
});

test("cuentas del panel y miembro borrado", () => {
  assert.equal(line({ action: "account.add" }), "Drako274 le dio cuenta del panel a Steve");
  assert.equal(
    line({ action: "account.remove" }),
    "Drako274 le quitó la cuenta del panel a Steve",
  );
  assert.equal(line({ action: "member.delete", memberGamertag: null }), "Drako274 eliminó a un miembro");
});

test("acción desconocida: texto genérico, sin romper", () => {
  assert.equal(line({ action: "parcel.move" }), "Drako274 hizo «parcel.move» sobre Steve");
  assert.equal(
    line({ action: "x.y", actorType: "sistema", actorGamertag: null, memberGamertag: null, changes: "basura" }),
    "El sistema hizo «x.y»",
  );
  assert.equal(auditActionLabel("x.y"), "x.y");
});

test("las partes marcan actor y miembro para resaltarlos", () => {
  const { parts } = describeAuditEvent(ev({ action: "account.add" }));
  assert.deepEqual(
    parts.filter((p) => p.kind !== "text"),
    [
      { kind: "actor", value: "Drako274" },
      { kind: "member", value: "Steve" },
    ],
  );
});

test("toda acción conocida tiene etiqueta y línea propia (no la genérica)", () => {
  for (const action of AUDIT_ACTIONS) {
    assert.notEqual(auditActionLabel(action), action);
    assert.ok(!line({ action }).includes("hizo «"), action);
  }
});

test("formatAuditValue y diffAuditChanges", () => {
  assert.equal(formatAuditValue("notes", "x".repeat(60)).length, 48);
  assert.equal(formatAuditValue("leftAt", "2026-10-04T12:00:00.000Z"), "2026-10-04");
  assert.equal(formatAuditValue("banned", true), "sí");
  assert.deepEqual(
    diffAuditChanges(
      { gamertag: "a", age: null as number | null, notes: "" },
      { gamertag: "b", age: null, notes: undefined },
      ["gamertag", "age", "notes"],
    ),
    { gamertag: { from: "a", to: "b" } },
  );
  assert.equal(diffAuditChanges({ a: 1 }, { a: 1 }, ["a"]), null);
});
