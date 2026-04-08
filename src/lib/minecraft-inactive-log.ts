/**
 * Extrae gamertags del log de Bedrock Dedicated Server (PlayerStatus / [INACTIVO]).
 * Formato esperado: `… [INACTIVO] <gamertag> - última conexión: YYYY-MM-DD HH:MM`
 */
const LINE_RE =
  /\[INACTIVO\]\s+(.+?)\s+-\s+[uú]ltima\s+conexi[oó]n:\s*/giu;

export function parseGamertagsFromInactiveLog(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  LINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINE_RE.exec(text)) !== null) {
    const g = m[1].trim();
    if (!g || seen.has(g)) continue;
    seen.add(g);
    out.push(g);
  }
  return out;
}
