import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clientIpFromHeaders,
  createLoginRateLimiter,
  describeLoginWait,
  LOGIN_BLOCK_MS,
  LOGIN_WINDOW_MS,
} from "../src/lib/login-rate-limit.ts";

const MIN = 60_000;

function headers(values: Record<string, string>) {
  const h = new Headers(values);
  return { get: (name: string) => h.get(name) };
}

test("IP: cf-connecting-ip → x-forwarded-for (primera) → x-real-ip", () => {
  assert.equal(
    clientIpFromHeaders(
      headers({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2", "x-real-ip": "3.3.3.3" }),
    ),
    "1.1.1.1",
  );
  assert.equal(
    clientIpFromHeaders(headers({ "x-forwarded-for": " 2.2.2.2 , 10.0.0.1", "x-real-ip": "3.3.3.3" })),
    "2.2.2.2",
  );
  assert.equal(clientIpFromHeaders(headers({ "x-real-ip": "3.3.3.3" })), "3.3.3.3");
  assert.equal(clientIpFromHeaders(headers({})), null);
});

test("5 fallos desde la misma IP bloquean 15 minutos", () => {
  const rl = createLoginRateLimiter();
  const t0 = 1_000_000;
  for (let i = 0; i < 4; i++) {
    assert.equal(rl.recordFailure("9.9.9.9", `gt${i}`, t0 + i).blocked, false);
  }
  const fifth = rl.recordFailure("9.9.9.9", "gt4", t0 + 4);
  assert.equal(fifth.blocked, true);
  assert.equal(rl.check("9.9.9.9", "otro", t0 + 5).blocked, true);
  assert.equal(rl.check("8.8.8.8", "otro", t0 + 5).blocked, false);

  const wait = rl.check("9.9.9.9", null, t0 + 4 + 10 * MIN);
  assert.ok(wait.blocked && wait.retryAfterMs === LOGIN_BLOCK_MS - 10 * MIN);
  assert.equal(rl.check("9.9.9.9", null, t0 + 4 + LOGIN_BLOCK_MS).blocked, false);
});

test("los fallos fuera de la ventana de 15 min no cuentan", () => {
  const rl = createLoginRateLimiter();
  for (let i = 0; i < 4; i++) rl.recordFailure("9.9.9.9", "a", i * MIN);
  const later = 4 * MIN + LOGIN_WINDOW_MS;
  assert.equal(rl.recordFailure("9.9.9.9", "a", later).blocked, false);
});

test("10 fallos del mismo gamertag (sin importar la IP ni mayúsculas) lo bloquean", () => {
  const rl = createLoginRateLimiter();
  for (let i = 0; i < 9; i++) {
    assert.equal(rl.recordFailure(`10.0.0.${i}`, i % 2 ? "Drako274" : "drako274 ", i).blocked, false);
  }
  assert.equal(rl.recordFailure("10.0.0.99", "DRAKO274", 9).blocked, true);
  assert.equal(rl.check("10.0.0.200", "drako274", 10).blocked, true);
  assert.equal(rl.check("10.0.0.200", "otro", 10).blocked, false);
});

test("intentos durante el bloqueo no lo alargan", () => {
  const rl = createLoginRateLimiter({ maxPerIp: 2 });
  rl.recordFailure("1.1.1.1", null, 0);
  rl.recordFailure("1.1.1.1", null, 1);
  rl.recordFailure("1.1.1.1", null, 5 * MIN);
  const s = rl.check("1.1.1.1", null, 5 * MIN);
  assert.ok(s.blocked && s.retryAfterMs === LOGIN_BLOCK_MS - 5 * MIN + 1);
});

test("un login correcto limpia los fallos, pero no un bloqueo vigente", () => {
  const rl = createLoginRateLimiter();
  for (let i = 0; i < 4; i++) rl.recordFailure("1.1.1.1", "juan", i);
  rl.recordSuccess("1.1.1.1", "juan", 10);
  assert.equal(rl.recordFailure("1.1.1.1", "juan", 11).blocked, false);

  for (let i = 0; i < 5; i++) rl.recordFailure("2.2.2.2", "pepe", 100 + i);
  rl.recordSuccess("2.2.2.2", "pepe", 200);
  assert.equal(rl.check("2.2.2.2", "pepe", 201).blocked, true);
});

test("sin IP todos comparten la cubeta «unknown»", () => {
  const rl = createLoginRateLimiter({ maxPerIp: 2 });
  rl.recordFailure(null, "a", 0);
  rl.recordFailure("", "b", 1);
  assert.equal(rl.check(null, "c", 2).blocked, true);
});

test("memoria acotada: no pasa de maxEntries por mapa", () => {
  const rl = createLoginRateLimiter({ maxEntries: 50 });
  for (let i = 0; i < 500; i++) rl.recordFailure(`ip-${i}`, `gt-${i}`, i);
  const size = rl.size();
  assert.ok(size.ip <= 50, `ip=${size.ip}`);
  assert.ok(size.gamertag <= 50, `gamertag=${size.gamertag}`);
});

test("mensaje de espera en minutos, redondeado hacia arriba", () => {
  assert.equal(describeLoginWait(1), "1 minuto");
  assert.equal(describeLoginWait(60_000), "1 minuto");
  assert.equal(describeLoginWait(60_001), "2 minutos");
  assert.equal(describeLoginWait(LOGIN_BLOCK_MS), "15 minutos");
});
