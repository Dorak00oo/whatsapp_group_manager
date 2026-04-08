import * as XLSX from "xlsx";

export type SheetMemberInput = {
  /** Nombre de la hoja en el libro (vacío en casos de un solo bloque sin nombre útil). */
  sheetName: string;
  /** Número de fila en esa hoja (1 = cabecera). */
  rowNumber: number;
  gamertag: string;
  telefono: string;
  pais: string;
  activo: boolean;
  admin: boolean;
  protegido: boolean;
  seSalio: boolean;
  notas: string | null;
};

type MemberColumn =
  | "gamertag"
  | "telefono"
  | "pais"
  | "activo"
  | "admin"
  | "protegido"
  | "seSalio"
  | "notas";

function normHeader(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function compactAlnum(s: string): string {
  return s.replace(/[^a-z0-9]+/g, "");
}

/**
 * Palabras clave por columna: nombres técnicos, sinónimos y textos parecidos a la UI
 * (filtros «Grupo», situación en formulario, etc.). La cabecera puede ser parecida
 * (typo, sin acentos, frase larga) y aun así encajar.
 */
const KEYWORDS: Record<MemberColumn, readonly string[]> = {
  gamertag: [
    "gamertag",
    "gamer tag",
    "gamer_tag",
    "jugador",
    "nombre",
    "nombre jugador",
    "nick",
    "apodo",
    "alias",
    "usuario",
    "miembro",
    "player",
    "member",
    "display name",
    "tag",
    "id jugador",
    "psn",
    "xbox",
    "steam",
  ],
  telefono: [
    "telefono",
    "teléfono",
    "tel",
    "celular",
    "cel",
    "movil",
    "móvil",
    "phone",
    "mobile",
    "whatsapp",
    "wa",
    "numero",
    "número",
    "numero telefonico",
    "número telefónico",
    "contacto",
    "tfn",
    "telefono movil",
    "whatsapp number",
  ],
  pais: [
    "pais",
    "país",
    "country",
    "codigo pais",
    "código país",
    "codigo_pais",
    "iso",
    "iso country",
    "region",
    "región",
    "nacionalidad",
    "prefijo",
    "prefix",
    "country code",
  ],
  activo: [
    "activo",
    "active",
    "roster",
    "en roster",
    "participa",
    "participacion",
    "participación",
    "alta",
    "enabled",
    "on",
    "los que estuvieron activos",
    "estuvo activo",
    "sigue activo",
    "miembro activo",
    "lista activa",
  ],
  admin: [
    "admin",
    "admins",
    "administrador",
    "administradores",
    "es admin",
    "is admin",
    "es_admin",
    "is_admin",
    "rol admin",
    "moderador",
    "moderator",
    "mod",
    "staff",
    "superuser",
  ],
  protegido: [
    "protegido",
    "protegidos",
    "sin ban",
    "sin_ban",
    "ban exempt",
    "banexempt",
    "exempt",
    "protected",
    "inmunidad",
    "no ban",
    "exento ban",
    "exento de ban",
    "grupo protegidos",
    "protegidos sin ban",
  ],
  seSalio: [
    "se_salio",
    "se salio",
    "se salió",
    "salio",
    "salió",
    "left",
    "se fue",
    "abandono",
    "abandonó",
    "baja",
    "se retiro",
    "se retiró",
    "los que se salieron",
    "salida comunidad",
    "salida de la comunidad",
    "ya no esta",
    "ya no está",
    "marcado left",
    "marked left",
    "de baja",
    "se marcho",
    "se marchó",
  ],
  notas: [
    "notas",
    "notes",
    "nota",
    "comentario",
    "comentarios",
    "observaciones",
    "observacion",
    "observación",
    "memo",
    "description",
    "descripcion",
    "descripción",
    "detalles",
    "info extra",
  ],
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = a.length;
  const n = b.length;
  const row = new Uint16Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

function similarityRatio(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length, 1);
}

/**
 * Mejor puntuación de una celda de cabecera frente a un conjunto de palabras clave.
 */
function scoreHeaderAgainstKeywords(
  headerCell: unknown,
  keywords: readonly string[],
): number {
  const raw = normHeader(headerCell);
  if (!raw) return 0;

  const hWords = raw.replace(/[_]+/g, " ").trim();
  const hCompact = compactAlnum(hWords);

  let best = 0;

  for (const phrase of keywords) {
    const kNorm = normHeader(phrase);
    if (!kNorm) continue;
    const kWords = kNorm.replace(/[_]+/g, " ").trim();
    const kCompact = compactAlnum(kWords);

    if (hWords === kWords) {
      best = 1;
      break;
    }
    if (hCompact === kCompact && kCompact.length >= 2) {
      best = Math.max(best, 0.99);
      continue;
    }

    if (kCompact.length >= 3 && hCompact.includes(kCompact)) {
      best = Math.max(best, 0.94);
      continue;
    }
    if (hCompact.length >= 3 && kCompact.includes(hCompact)) {
      best = Math.max(best, 0.92);
      continue;
    }

    const toks = kWords.split(/\s+/).filter((t) => t.length >= 3);
    if (toks.length >= 2) {
      const allIn = toks.every((t) => hWords.includes(t));
      if (allIn) {
        best = Math.max(best, 0.93);
        continue;
      }
    }

    const sim = similarityRatio(hCompact, kCompact);
    if (sim >= 0.72) {
      best = Math.max(best, sim);
    }

    const simWords = similarityRatio(hWords, kWords);
    if (simWords >= 0.72) {
      best = Math.max(best, simWords * 0.98);
    }
  }

  return best;
}

function assignHeaderIndices(headerRow: unknown[]): Map<MemberColumn, number> {
  const n = headerRow.length;
  const used = new Set<number>();
  const out = new Map<MemberColumn, number>();

  const order: { col: MemberColumn; required: boolean; minScore: number }[] = [
    { col: "gamertag", required: true, minScore: 0.72 },
    { col: "telefono", required: true, minScore: 0.72 },
    { col: "pais", required: false, minScore: 0.8 },
    { col: "admin", required: false, minScore: 0.8 },
    { col: "protegido", required: false, minScore: 0.8 },
    { col: "seSalio", required: false, minScore: 0.8 },
    { col: "activo", required: false, minScore: 0.8 },
    { col: "notas", required: false, minScore: 0.78 },
  ];

  for (const { col, minScore } of order) {
    let bestI = -1;
    let bestScore = minScore;
    const kws = KEYWORDS[col];
    for (let i = 0; i < n; i++) {
      if (used.has(i)) continue;
      const s = scoreHeaderAgainstKeywords(headerRow[i], kws);
      if (s >= bestScore) {
        bestScore = s;
        bestI = i;
      }
    }
    if (bestI >= 0) {
      used.add(bestI);
      out.set(col, bestI);
    }
  }

  return out;
}

function cellStr(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    if (Number.isInteger(v)) return String(v);
    return String(v);
  }
  return String(v).trim();
}

function parseBool(v: unknown, defaultVal: boolean): boolean {
  if (typeof v === "boolean") return v;
  const s = cellStr(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!s) return defaultVal;
  if (
    [
      "0",
      "no",
      "false",
      "f",
      "n",
      "falso",
      "off",
      "deshabilitado",
      "deshabilitada",
      "apagado",
      "apagada",
      "disabled",
    ].includes(s)
  ) {
    return false;
  }
  if (
    [
      "1",
      "si",
      "yes",
      "true",
      "y",
      "t",
      "verdadero",
      "on",
      "x",
      "✓",
      "ok",
      "habilitado",
      "habilitada",
      "encendido",
      "encendida",
      "enabled",
    ].includes(s)
  ) {
    return true;
  }
  return defaultVal;
}

const MAX_ROWS = 400;

function stripBom(s: string): string {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

function firstNonEmptyLine(text: string): string {
  const lines = text.split("\n");
  for (const line of lines) {
    const t = line.trimEnd();
    if (t.length > 0) return t;
  }
  return "";
}

/** Heurística para CSV de Google Sheets / Excel según región (coma vs punto y coma). */
function guessCsvDelimiter(firstLine: string): string {
  const tab = (firstLine.match(/\t/g) ?? []).length;
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  if (tab > 0 && tab >= semi && tab >= comma) return "\t";
  if (semi > comma) return ";";
  return ",";
}

function readWorkbookFromUpload(buffer: Buffer, fileName: string): XLSX.WorkBook {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".tsv")) {
    const str = stripBom(buffer.toString("utf8"))
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
    return XLSX.read(str, { type: "string", FS: "\t", cellDates: false });
  }

  if (lower.endsWith(".csv")) {
    const str = stripBom(buffer.toString("utf8"))
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
    const fs = guessCsvDelimiter(firstNonEmptyLine(str));
    return XLSX.read(str, { type: "string", FS: fs, cellDates: false });
  }

  return XLSX.read(buffer, { type: "buffer", cellDates: false });
}

type ParseSheetResult =
  | "skip"
  | "bad-headers"
  | SheetMemberInput[];

function parseMemberRowsForSheet(
  matrix: unknown[][],
  sheetName: string,
): ParseSheetResult {
  if (matrix.length < 2) return "skip";

  const headerRow = matrix[0] ?? [];
  const idx = assignHeaderIndices(headerRow);
  const ig = idx.get("gamertag") ?? -1;
  const it = idx.get("telefono") ?? -1;
  const ip = idx.get("pais") ?? -1;
  const ia = idx.get("activo") ?? -1;
  const iad = idx.get("admin") ?? -1;
  const ipr = idx.get("protegido") ?? -1;
  const il = idx.get("seSalio") ?? -1;
  const ino = idx.get("notas") ?? -1;

  if (ig < 0 || it < 0) return "bad-headers";

  const out: SheetMemberInput[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const gamertag = cellStr(row[ig]);
    const telefono = cellStr(row[it]);
    if (!gamertag && !telefono) continue;

    const pais = ip >= 0 ? cellStr(row[ip]) : "";
    const activo = ia >= 0 ? parseBool(row[ia], true) : true;
    const admin = iad >= 0 ? parseBool(row[iad], false) : false;
    const protegido = ipr >= 0 ? parseBool(row[ipr], false) : false;
    const seSalio = il >= 0 ? parseBool(row[il], false) : false;
    const notas = ino >= 0 ? cellStr(row[ino]) || null : null;

    out.push({
      sheetName,
      rowNumber: r + 1,
      gamertag,
      telefono,
      pais,
      activo,
      admin,
      protegido,
      seSalio,
      notas,
    });
  }

  return out;
}

/**
 * Lee todas las hojas del libro (Excel) o la única tabla de un CSV/TSV.
 * Cada hoja con cabeceras válidas (gamertag + teléfono) aporta filas; las demás se omiten.
 * `fileName` fija el formato: `.csv`, `.tsv`, `.xlsx`, `.xls`.
 */
export function parseMemberSpreadsheet(buffer: Buffer, fileName: string): SheetMemberInput[] {
  const wb = readWorkbookFromUpload(buffer, fileName);
  const names = wb.SheetNames;
  if (!names.length) {
    throw new Error("El archivo no tiene ninguna hoja ni datos.");
  }

  const combined: SheetMemberInput[] = [];
  let sawBadHeaders = false;
  let sawOkSheet = false;

  for (const sheetName of names) {
    if (/^sin[_\s-]*telefono$/i.test(sheetName.trim())) continue;
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | undefined)[]>(
      sheet,
      { header: 1, defval: "", raw: false },
    ) as unknown[][];

    const parsed = parseMemberRowsForSheet(matrix, sheetName);
    if (parsed === "skip") continue;
    if (parsed === "bad-headers") {
      sawBadHeaders = true;
      continue;
    }
    sawOkSheet = true;
    for (const row of parsed) {
      if (combined.length >= MAX_ROWS) {
        throw new Error(
          `Máximo ${MAX_ROWS} filas de datos en total por archivo (sumando todas las hojas).`,
        );
      }
      combined.push(row);
    }
  }

  if (combined.length === 0 && sawBadHeaders && !sawOkSheet) {
    throw new Error(
      "Ninguna hoja tiene columnas reconocibles para gamertag y teléfono. Revisa el título de cada hoja o descarga la plantilla.",
    );
  }

  return combined;
}
