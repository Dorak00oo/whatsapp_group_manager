import assert from "node:assert/strict";
import { test } from "node:test";
import { presentHomeBot } from "../src/lib/home-bot-status.ts";
import type { WspBotConsoleView } from "../src/lib/wsp-bot-console.ts";

const connected = {
  ok: true,
  offline: false,
  connected: true,
  registered: true,
  userName: "Comunidad",
  userJid: null,
  pairingCode: null,
  qrUpdatedAt: null,
  pairingUpdatedAt: null,
  hasQr: false,
  logs: [],
} satisfies WspBotConsoleView;

test("sin respuesta del bot es sin datos, no desconectado", () => {
  assert.deepEqual(presentHomeBot(null), {
    tone: "unknown",
    label: "Sin datos",
    detail: null,
  });
});

test("conectado, esperando y caído tienen etiqueta propia", () => {
  assert.equal(presentHomeBot(connected).label, "Conectado");
  assert.equal(presentHomeBot(connected).detail, "Comunidad");
  assert.equal(
    presentHomeBot({ ...connected, connected: false, userName: null }).label,
    "Esperando vínculo",
  );
  assert.equal(
    presentHomeBot({
      ok: false,
      offline: true,
      error: "no responde",
    }).label,
    "Desconectado",
  );
});
