import { parseDirectoryAge } from "@/lib/directory-age";
import { normalizePhoneFreeform } from "@/lib/phone-normalize";
import { normalizeWhatsAppUsername } from "@/lib/whatsapp-username";
import {
  findMemberByPhone,
  findMemberByUsername,
} from "@/lib/wsp-bot-directory";

/** Tope de filas de datos por archivo (el directorio cabe y puede crecer). */
export const CSV_MAX_ROWS = 5000;

/**
 * Mismas columnas al exportar y en la plantilla.
 * Si se agrega un dato de la ficha, hay que sumarlo aquí. Ver docs/directorio-csv.md.
 * `protegido` = exento de ban (como el import histórico).
 * `activo_permanente` = el flag manual, distinto de la protección de 5 días.
 * `situacion`: se_salio | ausente | permanente | activo | inactivo.
 * `activo` distingue ausente en la columna de activos o de inactivos.
 * `cuenta_2` y `cuenta_3` son la segunda y tercera cuenta de Minecraft.
 */
export const DIRECTORY_CSV_HEADERS = [
  "gamertag",
  "cuenta_2",
  "cuenta_3",
  "nombre",
  "telefono",
  "pais",
  "usuario_whatsapp",
  "edad",
  "situacion",
  "activo",
  "causa_ausencia",
  "admin",
  "protegido",
  "activo_permanente",
  "baneado",
  "motivo_ban",
  "notas",
] as const;

export type DirectoryCsvSituation =
  | "se_salio"
  | "ausente"
  | "permanente"
  | "activo"
  | "inactivo";

export type DirectoryCsvRecord = {
  gamertag: string;
  mcAccount2: string | null;
  mcAccount3: string | null;
  displayName: string | null;
  phone: string | null;
  phoneCountry: string | null;
  whatsappUsername: string | null;
  age: number | null;
  situation: DirectoryCsvSituation;
  active: boolean;
  absentReason: string | null;
  isAdmin: boolean;
  banExempt: boolean;
  permanentlyActive: boolean;
  banned: boolean;
  bannedReason: string | null;
  notes: string | null;
};

export type CsvMemberInput = {
  rowNumber: number;
  gamertag: string;
  mcAccount2: string | null;
  mcAccount3: string | null;
  displayName: string | null;
  telefono: string;
  pais: string;
  whatsappUsername: string | null;
  usernameError: string | null;
  age: number | null;
  ageError: string | null;
  left: boolean;
  absent: boolean;
  active: boolean;
  absentReason: string | null;
  isAdmin: boolean;
  banExempt: boolean;
  permanentlyActive: boolean;
  banned: boolean;
  bannedReason: string | null;
  notes: string | null;
};

export type CsvExistingIdentity = {
  gamertag: string;
  phone: string | null;
  whatsappUsername: string | null;
  mcAccount2?: string | null;
  mcAccount3?: string | null;
};

export type CsvCreateRow = {
  rowNumber: number;
  gamertag: string;
  mcAccount2: string | null;
  mcAccount3: string | null;
  displayName: string | null;
  phone: string | null;
  phoneCountry: string | null;
  whatsappUsername: string | null;
  age: number | null;
  active: boolean;
  left: boolean;
  absent: boolean;
  absentReason: string | null;
  isAdmin: boolean;
  banExempt: boolean;
  permanentlyActive: boolean;
  banned: boolean;
  bannedReason: string | null;
  notes: string | null;
};

export type CsvImportPlan = {
  create: CsvCreateRow[];
  skipped: { rowNumber: number; gamertag: string; reason: string }[];
  errors: { rowNumber: number; message: string }[];
};

type MemberColumn =
  | "nombre"
  | "gamertag"
  | "cuenta2"
  | "cuenta3"
  | "telefono"
  | "pais"
  | "usuario"
  | "edad"
  | "situacion"
  | "activo"
  | "causaAusencia"
  | "admin"
  | "protegido"
  | "activoPermanente"
  | "seSalio"
  | "baneado"
  | "motivoBan"
  | "notas";

const EXACT_HEADERS: Record<string, MemberColumn> = {
  gamertag: "gamertag",
  gamertags: "gamertag",
  cuenta_2: "cuenta2",
  cuenta2: "cuenta2",
  segunda_cuenta: "cuenta2",
  mc_account_2: "cuenta2",
  gamertag_2: "cuenta2",
  cuenta_3: "cuenta3",
  cuenta3: "cuenta3",
  tercera_cuenta: "cuenta3",
  mc_account_3: "cuenta3",
  gamertag_3: "cuenta3",
  nombre: "nombre",
  nombres: "nombre",
  telefono: "telefono",
  pais: "pais",
  usuario_whatsapp: "usuario",
  usuario: "usuario",
  edad: "edad",
  situacion: "situacion",
  activo: "activo",
  causa_ausencia: "causaAusencia",
  admin: "admin",
  protegido: "protegido",
  activo_permanente: "activoPermanente",
  se_salio: "seSalio",
  baneado: "baneado",
  motivo_ban: "motivoBan",
  notas: "notas",
};

const KEYWORDS: Record<MemberColumn, readonly string[]> = {
  nombre: ["nombres", "nombre", "nombre completo", "real name", "contact name"],
  gamertag: [
    "gamertag",
    "gamertags",
    "gamer tag",
    "nick",
    "apodo",
    "alias",
    "ign",
  ],
  cuenta2: [
    "cuenta 2",
    "segunda cuenta",
    "segunda cuenta de minecraft",
    "gamertag 2",
  ],
  cuenta3: [
    "cuenta 3",
    "tercera cuenta",
    "tercera cuenta de minecraft",
    "gamertag 3",
  ],
  telefono: [
    "telefono",
    "tel",
    "celular",
    "movil",
    "phone",
    "mobile",
    "whatsapp",
    "numero",
  ],
  pais: ["pais", "country", "iso", "nacionalidad"],
  usuario: [
    "usuario de whatsapp",
    "usuario whatsapp",
    "whatsapp username",
    "usuario",
    "@usuario",
  ],
  edad: ["edad", "age", "anos", "años"],
  situacion: ["situacion", "situation", "estado en la comunidad"],
  activo: ["activo", "active", "roster", "en roster", "miembro activo"],
  causaAusencia: [
    "causa de ausencia",
    "causa ausencia",
    "motivo ausencia",
    "absent reason",
  ],
  admin: ["admin", "administrador", "es admin", "is admin", "moderador", "staff"],
  protegido: [
    "protegido",
    "protegidos",
    "sin ban",
    "protected",
    "exento de ban",
    "ban exempt",
  ],
  activoPermanente: [
    "activo permanente",
    "activa permanente",
    "permanent",
    "permanently active",
  ],
  seSalio: [
    "se salio",
    "se salió",
    "salio",
    "left",
    "se fue",
    "baja",
    "los que se salieron",
  ],
  baneado: ["baneado", "banned", "ban"],
  motivoBan: ["motivo del ban", "motivo ban", "razon del ban", "banned reason"],
  notas: ["notas", "notes", "nota", "comentario", "observaciones"],
};

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

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = new Uint16Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[b.length]!;
}

function similarityRatio(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);
}

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
    if (hWords === kWords) return 1;
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
    const sim = similarityRatio(hCompact, kCompact);
    if (sim >= 0.72) best = Math.max(best, sim);
  }
  return best;
}

function assignHeaderIndices(headerRow: string[]): Map<MemberColumn, number> {
  const used = new Set<number>();
  const out = new Map<MemberColumn, number>();
  for (let i = 0; i < headerRow.length; i++) {
    const h = normHeader(headerRow[i]).replace(/\s+/g, " ").trim();
    const col = EXACT_HEADERS[h];
    if (!col || out.has(col)) continue;
    out.set(col, i);
    used.add(i);
  }
  const order: { col: MemberColumn; minScore: number }[] = [
    { col: "cuenta2", minScore: 0.8 },
    { col: "cuenta3", minScore: 0.8 },
    { col: "gamertag", minScore: 0.72 },
    { col: "telefono", minScore: 0.72 },
    { col: "usuario", minScore: 0.8 },
    { col: "nombre", minScore: 0.78 },
    { col: "pais", minScore: 0.8 },
    { col: "edad", minScore: 0.8 },
    { col: "situacion", minScore: 0.8 },
    { col: "admin", minScore: 0.8 },
    { col: "protegido", minScore: 0.8 },
    { col: "activoPermanente", minScore: 0.8 },
    { col: "seSalio", minScore: 0.8 },
    { col: "baneado", minScore: 0.85 },
    { col: "motivoBan", minScore: 0.8 },
    { col: "causaAusencia", minScore: 0.8 },
    { col: "activo", minScore: 0.8 },
    { col: "notas", minScore: 0.78 },
  ];
  for (const { col, minScore } of order) {
    if (out.has(col)) continue;
    let bestI = -1;
    let bestScore = minScore;
    for (let i = 0; i < headerRow.length; i++) {
      if (used.has(i)) continue;
      const headerNorm = normHeader(headerRow[i]);
      if (col === "telefono" && headerNorm.includes("usuario")) continue;
      if (
        col === "usuario" &&
        !headerNorm.includes("usuario") &&
        !headerNorm.includes("username")
      ) {
        continue;
      }
      const s = scoreHeaderAgainstKeywords(headerRow[i], KEYWORDS[col]);
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
  if (v == null) return "";
  return String(v).trim();
}

function parseBool(v: unknown, defaultVal: boolean): boolean {
  const s = cellStr(v)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!s) return defaultVal;
  if (
    ["0", "no", "false", "f", "n", "falso", "off", "disabled"].includes(s)
  ) {
    return false;
  }
  if (
    ["1", "si", "yes", "true", "y", "t", "verdadero", "on", "x", "ok"].includes(
      s,
    )
  ) {
    return true;
  }
  return defaultVal;
}

function parseSituation(raw: string): DirectoryCsvSituation | null {
  const s = normHeader(raw).replace(/[_]+/g, " ").trim();
  const c = compactAlnum(s);
  if (!c) return null;
  if (
    c === "sesalio" ||
    c === "salio" ||
    c === "left" ||
    c === "baja" ||
    c === "sefue" ||
    s.includes("se salio")
  ) {
    return "se_salio";
  }
  if (c === "ausente" || c === "absent" || s.startsWith("ausente")) {
    return "ausente";
  }
  if (c.includes("permanente") || c === "permanent") return "permanente";
  if (c === "inactivo" || c === "inactive" || s.startsWith("inactivo")) {
    return "inactivo";
  }
  if (c === "activo" || c === "active" || c === "normal") return "activo";
  return null;
}

function yn(value: boolean): string {
  return value ? "si" : "no";
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function directorySituationForExport(m: {
  leftAt: Date | string | null;
  absentWithCause: boolean;
  permanentlyActive: boolean;
  active: boolean;
}): DirectoryCsvSituation {
  if (m.leftAt) return "se_salio";
  if (m.absentWithCause) return "ausente";
  if (m.permanentlyActive) return "permanente";
  if (m.active) return "activo";
  return "inactivo";
}

export function memberToDirectoryCsvRecord(m: {
  gamertag: string;
  mcAccount2?: string | null;
  mcAccount3?: string | null;
  displayName: string | null;
  phone: string | null;
  phoneCountry: string | null;
  whatsappUsername: string | null;
  age: number | null;
  active: boolean;
  permanentlyActive: boolean;
  absentWithCause: boolean;
  absentReason: string | null;
  leftAt: Date | string | null;
  isAdmin: boolean;
  banExempt: boolean;
  banned: boolean;
  bannedReason: string | null;
  notes: string | null;
}): DirectoryCsvRecord {
  const situation = directorySituationForExport(m);
  return {
    gamertag: m.gamertag,
    mcAccount2: m.mcAccount2?.trim() || null,
    mcAccount3: m.mcAccount3?.trim() || null,
    displayName: m.displayName,
    phone: m.phone,
    phoneCountry: m.phoneCountry,
    whatsappUsername: m.whatsappUsername,
    age: m.age,
    situation,
    active: situation === "se_salio" ? false : m.active,
    absentReason: situation === "ausente" ? m.absentReason : null,
    isAdmin: m.isAdmin,
    banExempt: m.banExempt,
    permanentlyActive: m.permanentlyActive,
    banned: m.banned,
    bannedReason: m.banned ? m.bannedReason : null,
    notes: m.notes,
  };
}

/** UTF-8 con BOM y separador coma, para que Excel en español no parta las columnas. */
export function serializeDirectoryCsv(records: DirectoryCsvRecord[]): string {
  const lines = [DIRECTORY_CSV_HEADERS.join(",")];
  for (const r of records) {
    const cells = [
      r.gamertag,
      r.mcAccount2 ?? "",
      r.mcAccount3 ?? "",
      r.displayName ?? "",
      r.phone ?? "",
      r.phoneCountry ?? "",
      r.whatsappUsername ?? "",
      r.age == null ? "" : String(r.age),
      r.situation,
      yn(r.active),
      r.absentReason ?? "",
      yn(r.isAdmin),
      yn(r.banExempt),
      yn(r.permanentlyActive),
      yn(r.banned),
      r.bannedReason ?? "",
      r.notes ?? "",
    ];
    lines.push(cells.map(csvEscape).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function directoryCsvTemplate(): string {
  return serializeDirectoryCsv([]);
}

function stripBom(s: string): string {
  if (s.charCodeAt(0) === 0xfeff) return s.slice(1);
  return s;
}

function stripSepHint(text: string): { text: string; forced: string | null } {
  const match = text.match(/^sep=(.)\r?\n/i);
  if (!match) return { text, forced: null };
  return { text: text.slice(match[0].length), forced: match[1] ?? null };
}

function guessDelimiter(text: string, forced: string | null): "," | ";" | "\t" {
  if (forced === "," || forced === ";" || forced === "\t") return forced;
  let line = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if ((c === "\n" || c === "\r") && !inQuotes) break;
    line += c;
  }
  const count = (d: string) => {
    let n = 0;
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i]!;
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          i++;
          continue;
        }
        q = !q;
        continue;
      }
      if (!q && c === d) n++;
    }
    return n;
  };
  const comma = count(",");
  const semi = count(";");
  const tab = count("\t");
  if (tab > 0 && tab >= semi && tab >= comma) return "\t";
  if (semi > comma) return ";";
  return ",";
}

export function parseCsvTable(text: string): string[][] {
  const stripped = stripSepHint(stripBom(text).replace(/^\uFEFF/, ""));
  const delimiter = guessDelimiter(stripped.text, stripped.forced);
  const src = stripped.text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (c === "\r") continue;
    if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += c;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function at(row: string[], idx: Map<MemberColumn, number>, col: MemberColumn): string {
  const i = idx.get(col);
  if (i == null) return "";
  return cellStr(row[i]);
}

export function parseDirectoryCsv(bufferOrText: Buffer | string): CsvMemberInput[] {
  const text =
    typeof bufferOrText === "string"
      ? bufferOrText
      : bufferOrText.toString("utf8");
  const matrix = parseCsvTable(text).filter((row) =>
    row.some((cell) => cell.trim() !== ""),
  );
  if (matrix.length === 0) {
    throw new Error("El archivo no tiene datos.");
  }
  const header = matrix[0] ?? [];
  const idx = assignHeaderIndices(header);
  if (!idx.has("gamertag") || (!idx.has("telefono") && !idx.has("usuario"))) {
    throw new Error(
      "El CSV no tiene columnas reconocibles: hace falta gamertag y teléfono o usuario de WhatsApp. Descarga la plantilla.",
    );
  }

  const out: CsvMemberInput[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const gamertag = at(row, idx, "gamertag");
    const telefono = at(row, idx, "telefono");
    const usuarioRaw = at(row, idx, "usuario");
    const displayNameRaw = at(row, idx, "nombre");
    if (!gamertag && !telefono && !usuarioRaw && !displayNameRaw) continue;

    const usernameParsed = usuarioRaw
      ? normalizeWhatsAppUsername(usuarioRaw)
      : null;
    const ageParsed = idx.has("edad")
      ? parseDirectoryAge(at(row, idx, "edad"))
      : { ok: true as const, age: null };

    const sit = idx.has("situacion")
      ? parseSituation(at(row, idx, "situacion"))
      : null;
    const activoCol = idx.has("activo")
      ? parseBool(row[idx.get("activo")!], true)
      : null;
    const seSalioCol = idx.has("seSalio")
      ? parseBool(row[idx.get("seSalio")!], false)
      : false;
    const permCol = idx.has("activoPermanente")
      ? parseBool(row[idx.get("activoPermanente")!], false)
      : false;

    let left = false;
    let absent = false;
    let active = true;
    let permanentlyActive = permCol;
    if (sit === "se_salio") {
      left = true;
      active = false;
    } else if (sit === "ausente") {
      absent = true;
      active = activoCol ?? true;
    } else if (sit === "permanente") {
      permanentlyActive = true;
      active = true;
    } else if (sit === "inactivo") {
      active = false;
    } else if (sit === "activo") {
      active = true;
    } else {
      left = seSalioCol;
      active = left ? false : (activoCol ?? true);
      if (permanentlyActive && !left) active = true;
    }
    if (permanentlyActive && !left && sit !== "ausente" && sit !== "inactivo") {
      active = true;
    }

    out.push({
      rowNumber: r + 1,
      gamertag,
      mcAccount2: at(row, idx, "cuenta2") || null,
      mcAccount3: at(row, idx, "cuenta3") || null,
      displayName: displayNameRaw || null,
      telefono,
      pais: at(row, idx, "pais"),
      whatsappUsername:
        usernameParsed && usernameParsed.ok ? usernameParsed.username : null,
      usernameError:
        usernameParsed && !usernameParsed.ok && !usernameParsed.empty
          ? usernameParsed.error
          : null,
      age: ageParsed.ok ? ageParsed.age : null,
      ageError: ageParsed.ok ? null : ageParsed.error,
      left,
      absent,
      active,
      absentReason: at(row, idx, "causaAusencia") || null,
      isAdmin: idx.has("admin")
        ? parseBool(row[idx.get("admin")!], false)
        : false,
      banExempt: idx.has("protegido")
        ? parseBool(row[idx.get("protegido")!], false)
        : false,
      permanentlyActive,
      banned: idx.has("baneado")
        ? parseBool(row[idx.get("baneado")!], false)
        : false,
      bannedReason: at(row, idx, "motivoBan") || null,
      notes: at(row, idx, "notas") || null,
    });
    if (out.length > CSV_MAX_ROWS) {
      throw new Error(`Máximo ${CSV_MAX_ROWS} filas de datos por archivo.`);
    }
  }
  return out;
}

function gamertagKey(value: string): string {
  return value.trim().toLowerCase();
}

function identityGamertagKeys(identity: CsvExistingIdentity): string[] {
  return [identity.gamertag, identity.mcAccount2, identity.mcAccount3]
    .map((tag) => gamertagKey(tag ?? ""))
    .filter(Boolean);
}

/**
 * Salta filas que ya existen (teléfono, @usuario o gamertag) y las repetidas
 * dentro del mismo archivo. No pisa datos.
 */
export function planCsvImport(
  rows: CsvMemberInput[],
  existing: CsvExistingIdentity[],
): CsvImportPlan {
  const known: CsvExistingIdentity[] = existing.map((e) => ({
    gamertag: e.gamertag,
    phone: e.phone,
    whatsappUsername: e.whatsappUsername,
    mcAccount2: e.mcAccount2,
    mcAccount3: e.mcAccount3,
  }));
  const create: CsvCreateRow[] = [];
  const skipped: CsvImportPlan["skipped"] = [];
  const errors: CsvImportPlan["errors"] = [];

  for (const row of rows) {
    const tag = row.gamertag.trim();
    let phone: { phone: string; phoneCountry: string | null } | null = null;
    let phoneError: string | null = null;
    if (row.telefono.trim()) {
      const parsed = normalizePhoneFreeform(row.telefono, row.pais);
      if (parsed.ok) {
        phone = { phone: parsed.phone, phoneCountry: parsed.phoneCountry };
      } else {
        phoneError = parsed.error;
      }
    }

    const byPhone = phone
      ? findMemberByPhone(known, phone.phone)
      : undefined;
    if (byPhone) {
      skipped.push({
        rowNumber: row.rowNumber,
        gamertag: tag || byPhone.gamertag,
        reason: "Mismo teléfono",
      });
      continue;
    }
    const byUser = row.whatsappUsername
      ? findMemberByUsername(known, row.whatsappUsername)
      : undefined;
    if (byUser) {
      skipped.push({
        rowNumber: row.rowNumber,
        gamertag: tag || byUser.gamertag,
        reason: "Mismo usuario de WhatsApp",
      });
      continue;
    }
    const rowTags = [tag, row.mcAccount2, row.mcAccount3]
      .map((value) => gamertagKey(value ?? ""))
      .filter(Boolean);
    if (new Set(rowTags).size !== rowTags.length) {
      errors.push({
        rowNumber: row.rowNumber,
        message: "Las cuentas de Minecraft no pueden repetirse en la misma fila",
      });
      continue;
    }
    const knownTags = new Set(known.flatMap(identityGamertagKeys));
    const repeated = rowTags.find((key) => knownTags.has(key));
    if (repeated) {
      skipped.push({
        rowNumber: row.rowNumber,
        gamertag: tag || repeated,
        reason: "Mismo gamertag",
      });
      continue;
    }

    if (!tag) {
      errors.push({ rowNumber: row.rowNumber, message: "Falta el gamertag" });
      continue;
    }
    if (phoneError) {
      errors.push({ rowNumber: row.rowNumber, message: phoneError });
      continue;
    }
    if (row.usernameError) {
      errors.push({ rowNumber: row.rowNumber, message: row.usernameError });
      continue;
    }
    if (row.ageError) {
      errors.push({ rowNumber: row.rowNumber, message: row.ageError });
      continue;
    }
    if (!phone && !row.whatsappUsername) {
      errors.push({
        rowNumber: row.rowNumber,
        message: "Falta el teléfono o el usuario de WhatsApp",
      });
      continue;
    }

    create.push({
      rowNumber: row.rowNumber,
      gamertag: tag,
      mcAccount2: row.mcAccount2,
      mcAccount3: row.mcAccount3,
      displayName: row.displayName,
      phone: phone?.phone ?? null,
      phoneCountry: phone?.phoneCountry ?? null,
      whatsappUsername: row.whatsappUsername,
      age: row.age,
      active: row.active,
      left: row.left,
      absent: row.absent,
      absentReason: row.absent ? row.absentReason : null,
      isAdmin: row.isAdmin,
      banExempt: row.banExempt,
      permanentlyActive: row.permanentlyActive,
      banned: row.banned && !row.banExempt,
      bannedReason: row.banned && !row.banExempt ? row.bannedReason : null,
      notes: row.notes,
    });
    known.push({
      gamertag: tag,
      phone: phone?.phone ?? null,
      whatsappUsername: row.whatsappUsername,
      mcAccount2: row.mcAccount2,
      mcAccount3: row.mcAccount3,
    });
  }

  return { create, skipped, errors };
}
