export const LOGIN_WINDOW_MS = 15 * 60_000;
export const LOGIN_BLOCK_MS = 15 * 60_000;
export const LOGIN_MAX_FAILURES_PER_IP = 5;
export const LOGIN_MAX_FAILURES_PER_GAMERTAG = 10;
const MAX_ENTRIES_PER_MAP = 5_000;

export type LoginRateLimitOptions = {
  windowMs: number;
  blockMs: number;
  maxPerIp: number;
  maxPerGamertag: number;
  maxEntries: number;
};

export type LoginBlockState =
  | { blocked: false }
  | { blocked: true; retryAfterMs: number };

type Bucket = { failures: number[]; blockedUntil: number };

type HeaderSource = { get(name: string): string | null };

/** IP del cliente detrás de Cloudflare / Traefik: `cf-connecting-ip` → `x-forwarded-for` → `x-real-ip`. */
export function clientIpFromHeaders(headers: HeaderSource): string | null {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  return real || null;
}

export function createLoginRateLimiter(
  overrides: Partial<LoginRateLimitOptions> = {},
) {
  const opts: LoginRateLimitOptions = {
    windowMs: LOGIN_WINDOW_MS,
    blockMs: LOGIN_BLOCK_MS,
    maxPerIp: LOGIN_MAX_FAILURES_PER_IP,
    maxPerGamertag: LOGIN_MAX_FAILURES_PER_GAMERTAG,
    maxEntries: MAX_ENTRIES_PER_MAP,
    ...overrides,
  };
  const byIp = new Map<string, Bucket>();
  const byGamertag = new Map<string, Bucket>();

  const ipKey = (ip: string | null) => ip?.trim() || "unknown";
  const gtKey = (gamertag: string | null) => gamertag?.trim().toLowerCase() || null;

  function remainingBlock(map: Map<string, Bucket>, key: string | null, now: number): number {
    if (!key) return 0;
    const b = map.get(key);
    if (!b) return 0;
    return b.blockedUntil > now ? b.blockedUntil - now : 0;
  }

  function isStale(b: Bucket, now: number): boolean {
    return (
      b.blockedUntil <= now &&
      b.failures.every((t) => t <= now - opts.windowMs)
    );
  }

  function enforceCap(map: Map<string, Bucket>, now: number) {
    if (map.size <= opts.maxEntries) return;
    for (const [k, b] of map) {
      if (isStale(b, now)) map.delete(k);
    }
    for (const k of map.keys()) {
      if (map.size <= opts.maxEntries) break;
      map.delete(k);
    }
  }

  function fail(map: Map<string, Bucket>, key: string | null, max: number, now: number) {
    if (!key) return;
    const prev = map.get(key);
    if (prev && prev.blockedUntil > now) return;
    const failures = (prev?.failures ?? []).filter((t) => t > now - opts.windowMs);
    failures.push(now);
    map.delete(key);
    map.set(
      key,
      failures.length >= max
        ? { failures: [], blockedUntil: now + opts.blockMs }
        : { failures, blockedUntil: 0 },
    );
    enforceCap(map, now);
  }

  function check(ip: string | null, gamertag: string | null, now = Date.now()): LoginBlockState {
    const wait = Math.max(
      remainingBlock(byIp, ipKey(ip), now),
      remainingBlock(byGamertag, gtKey(gamertag), now),
    );
    return wait > 0 ? { blocked: true, retryAfterMs: wait } : { blocked: false };
  }

  function recordFailure(ip: string | null, gamertag: string | null, now = Date.now()): LoginBlockState {
    fail(byIp, ipKey(ip), opts.maxPerIp, now);
    fail(byGamertag, gtKey(gamertag), opts.maxPerGamertag, now);
    return check(ip, gamertag, now);
  }

  /** Un login correcto limpia los fallos de esa IP y de ese gamertag (no un bloqueo vigente). */
  function recordSuccess(ip: string | null, gamertag: string | null, now = Date.now()) {
    for (const [map, key] of [
      [byIp, ipKey(ip)],
      [byGamertag, gtKey(gamertag)],
    ] as const) {
      if (!key) continue;
      const b = map.get(key);
      if (b && b.blockedUntil <= now) map.delete(key);
    }
  }

  return {
    check,
    recordFailure,
    recordSuccess,
    size: () => ({ ip: byIp.size, gamertag: byGamertag.size }),
  };
}

export type LoginRateLimiter = ReturnType<typeof createLoginRateLimiter>;

const GLOBAL_KEY = Symbol.for("wsp.panel.loginRateLimiter");

/** Una instancia por proceso, compartida entre la server action y `authorize`. */
export function getLoginRateLimiter(): LoginRateLimiter {
  const g = globalThis as { [GLOBAL_KEY]?: LoginRateLimiter };
  g[GLOBAL_KEY] ??= createLoginRateLimiter();
  return g[GLOBAL_KEY];
}

export function describeLoginWait(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
}
