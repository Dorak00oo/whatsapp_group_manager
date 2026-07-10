/**
 * Neon usa scale-to-zero: si la base estuvo inactiva, la primera query tras
 * el período de reposo puede fallar con P1001 ("Can't reach database
 * server") mientras el compute despierta, aunque la conexión sea válida.
 * Reintentamos un par de veces con una espera corta antes de rendirnos.
 */
function isTransientConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  return code === "P1001" || code === "P1002" || code === "P1017";
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, delayMs = 400 }: { retries?: number; delayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !isTransientConnectionError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
