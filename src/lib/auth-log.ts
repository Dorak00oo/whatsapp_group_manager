/** Activo en desarrollo o si pones AUTH_DEBUG=1 en .env (útil para diagnosticar en local). */
export function authDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.AUTH_DEBUG === "1"
  );
}

export function authLog(phase: string, detail?: Record<string, unknown>): void {
  if (!authDebugEnabled()) return;
  if (detail && Object.keys(detail).length > 0) {
    console.log(`[login-auth] ${phase}`, detail);
  } else {
    console.log(`[login-auth] ${phase}`);
  }
}
