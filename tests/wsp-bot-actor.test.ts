import assert from "node:assert/strict";
import { test } from "node:test";
import {
  WHATSAPP_BOT_SYSTEM_ACTOR,
  botAuditActorFromDirectory,
  parseWspBotActor,
} from "../src/lib/wsp-bot-actor.ts";

const members = [
  {
    gamertag: "Pedro",
    phone: "+52 55 1234 5678",
    whatsappUsername: "pedro_mc",
  },
];

test("sin actor o mal formado queda el bot de sistema", () => {
  assert.equal(parseWspBotActor(undefined), null);
  assert.equal(parseWspBotActor("no"), null);
  assert.equal(parseWspBotActor({ jid: 521 }), null);
  assert.deepEqual(
    botAuditActorFromDirectory(null, members),
    WHATSAPP_BOT_SYSTEM_ACTOR,
  );
  assert.equal(WHATSAPP_BOT_SYSTEM_ACTOR.actorType, "sistema");
  if (WHATSAPP_BOT_SYSTEM_ACTOR.actorType === "sistema") {
    assert.equal(WHATSAPP_BOT_SYSTEM_ACTOR.actorName, "Bot de WhatsApp");
  }
});

test("el 521 de México resuelve el gamertag del directorio", () => {
  const actor = parseWspBotActor({
    jid: "5215512345678@s.whatsapp.net",
    username: "otro",
    name: "Pedro Admin",
  });
  const resolved = botAuditActorFromDirectory(actor, members);
  assert.equal(resolved.actorType, "bot");
  if (resolved.actorType !== "bot") return;
  assert.equal(resolved.actorGamertag, "Pedro");
  assert.equal(resolved.actorName, "Pedro Admin");
});

test("si el teléfono no está, busca por @usuario", () => {
  const resolved = botAuditActorFromDirectory(
    { username: "@Pedro_MC", name: "Pedro" },
    members,
  );
  assert.equal(resolved.actorType, "bot");
  if (resolved.actorType !== "bot") return;
  assert.equal(resolved.actorGamertag, "Pedro");
});

test("si no está en el directorio guarda teléfono y nombre", () => {
  const resolved = botAuditActorFromDirectory(
    { jid: "573009998877@s.whatsapp.net", name: "Ana" },
    members,
  );
  assert.equal(resolved.actorType, "bot");
  if (resolved.actorType !== "bot") return;
  assert.equal(resolved.actorGamertag, undefined);
  assert.ok(resolved.actorPhone?.includes("573009998877") || resolved.actorPhone?.includes("300"));
  assert.equal(resolved.actorName, "Ana");
});
