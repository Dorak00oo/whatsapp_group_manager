export const PARCEL_DIMENSIONS = ["overworld", "nether", "the_end"] as const;
export type ParcelDimension = (typeof PARCEL_DIMENSIONS)[number];

export type ParcelConfigPayload = {
  enabled: boolean;
  name: string;
  dimension: ParcelDimension;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

export const PARCEL_CONFIG_DEFAULTS: ParcelConfigPayload = {
  enabled: false,
  name: "Parcela",
  dimension: "overworld",
  minX: 0,
  minY: 64,
  minZ: 0,
  maxX: 15,
  maxY: 79,
  maxZ: 15,
};

/** Id estable de la parcela original (migración + fallback del addon). */
export const PRIMARY_PARCEL_ID = "primary";

/** Parcelas extra además de la original. */
export const MAX_EXTRA_PARCELS = 5;

export type ParcelRecordPayload = ParcelConfigPayload & {
  id: string;
  isPrimary: boolean;
};

export function canDeleteParcel(isPrimary: boolean): boolean {
  return !isPrimary;
}

export function canAddExtraParcel(extraCount: number): boolean {
  return extraCount < MAX_EXTRA_PARCELS;
}

export function resolveEventParcelId(
  raw: unknown,
  knownIds: Set<string>,
): string {
  const id = typeof raw === "string" ? raw.trim() : "";
  if (id && knownIds.has(id)) return id;
  if (knownIds.has(PRIMARY_PARCEL_ID)) return PRIMARY_PARCEL_ID;
  const first = knownIds.values().next().value;
  return typeof first === "string" ? first : PRIMARY_PARCEL_ID;
}

/** Extra nueva: apagada, caja por defecto. `extraIndex` 1 → "Parcela 2". */
export function extraParcelCreatePayload(extraIndex: number): ParcelRecordPayload {
  const n = Math.max(1, Math.floor(extraIndex));
  return {
    id: crypto.randomUUID(),
    isPrimary: false,
    enabled: false,
    name: `Parcela ${n + 1}`,
    dimension: PARCEL_CONFIG_DEFAULTS.dimension,
    minX: PARCEL_CONFIG_DEFAULTS.minX,
    minY: PARCEL_CONFIG_DEFAULTS.minY,
    minZ: PARCEL_CONFIG_DEFAULTS.minZ,
    maxX: PARCEL_CONFIG_DEFAULTS.maxX,
    maxY: PARCEL_CONFIG_DEFAULTS.maxY,
    maxZ: PARCEL_CONFIG_DEFAULTS.maxZ,
  };
}

export type ParcelRow = {
  id: string;
  name: string;
  enabled: boolean;
  dimension: string;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  isPrimary: boolean;
};

export function parcelRecordFromRow(row: ParcelRow): ParcelRecordPayload {
  const corners = normalizeParcelCorners({
    enabled: row.enabled,
    name: row.name.trim() || PARCEL_CONFIG_DEFAULTS.name,
    dimension: isParcelDimension(row.dimension)
      ? row.dimension
      : PARCEL_CONFIG_DEFAULTS.dimension,
    minX: row.minX,
    minY: row.minY,
    minZ: row.minZ,
    maxX: row.maxX,
    maxY: row.maxY,
    maxZ: row.maxZ,
  });
  return {
    ...corners,
    id: row.id,
    isPrimary: row.isPrimary,
  };
}

export function parcelRowUpdateFromPayload(
  parcel: Partial<ParcelConfigPayload>,
): Partial<
  Pick<
    ParcelRow,
    | "name"
    | "enabled"
    | "dimension"
    | "minX"
    | "minY"
    | "minZ"
    | "maxX"
    | "maxY"
    | "maxZ"
  >
> {
  const merged = normalizeParcelCorners({
    ...PARCEL_CONFIG_DEFAULTS,
    ...parcel,
    enabled: parcel.enabled ?? PARCEL_CONFIG_DEFAULTS.enabled,
    name: parcel.name?.trim() || PARCEL_CONFIG_DEFAULTS.name,
    dimension:
      parcel.dimension && isParcelDimension(parcel.dimension)
        ? parcel.dimension
        : PARCEL_CONFIG_DEFAULTS.dimension,
  });
  const out: ReturnType<typeof parcelRowUpdateFromPayload> = {};
  if (typeof parcel.enabled === "boolean") out.enabled = parcel.enabled;
  if (typeof parcel.name === "string") {
    const n = parcel.name.trim();
    if (n) out.name = n.slice(0, 80);
  }
  if (parcel.dimension && isParcelDimension(parcel.dimension)) {
    out.dimension = parcel.dimension;
  }
  if (
    parcel.minX !== undefined ||
    parcel.minY !== undefined ||
    parcel.minZ !== undefined ||
    parcel.maxX !== undefined ||
    parcel.maxY !== undefined ||
    parcel.maxZ !== undefined
  ) {
    out.minX = merged.minX;
    out.minY = merged.minY;
    out.minZ = merged.minZ;
    out.maxX = merged.maxX;
    out.maxY = merged.maxY;
    out.maxZ = merged.maxZ;
  }
  return out;
}

export type ParcelEventType = "enter" | "exit" | "chest_open";

export const PARCEL_EVENT_TYPES: ParcelEventType[] = [
  "enter",
  "exit",
  "chest_open",
];

export const PARCEL_EVENT_FILTER_OPTIONS: {
  value: ParcelEventType;
  label: string;
}[] = [
  { value: "enter", label: "Entrada" },
  { value: "exit", label: "Salida" },
  { value: "chest_open", label: "Cofre" },
];

export function isParcelEventType(value: string): value is ParcelEventType {
  return (PARCEL_EVENT_TYPES as readonly string[]).includes(value);
}

/** Eventos por página en el historial del panel. */
export const PARCEL_PAGE_SIZE = 100;

/** Ventana rodante: se purga lo más viejo en cada POST/GET. ~6 meses. */
export const PARCEL_RETENTION_DAYS = 180;

export function isParcelDimension(value: string): value is ParcelDimension {
  return (PARCEL_DIMENSIONS as readonly string[]).includes(value);
}

/** Ordena esquinas para que min ≤ max en cada eje. */
export function normalizeParcelCorners(parcel: ParcelConfigPayload): ParcelConfigPayload {
  return {
    ...parcel,
    minX: Math.min(parcel.minX, parcel.maxX),
    minY: Math.min(parcel.minY, parcel.maxY),
    minZ: Math.min(parcel.minZ, parcel.maxZ),
    maxX: Math.max(parcel.minX, parcel.maxX),
    maxY: Math.max(parcel.minY, parcel.maxY),
    maxZ: Math.max(parcel.minZ, parcel.maxZ),
  };
}

export function parcelConfigFromRow(row: {
  parcelEnabled: boolean;
  parcelName: string;
  parcelDimension: string;
  parcelMinX: number;
  parcelMinY: number;
  parcelMinZ: number;
  parcelMaxX: number;
  parcelMaxY: number;
  parcelMaxZ: number;
}): ParcelConfigPayload {
  return normalizeParcelCorners({
    enabled: row.parcelEnabled,
    name: row.parcelName.trim() || PARCEL_CONFIG_DEFAULTS.name,
    dimension: isParcelDimension(row.parcelDimension)
      ? row.parcelDimension
      : PARCEL_CONFIG_DEFAULTS.dimension,
    minX: row.parcelMinX,
    minY: row.parcelMinY,
    minZ: row.parcelMinZ,
    maxX: row.parcelMaxX,
    maxY: row.parcelMaxY,
    maxZ: row.parcelMaxZ,
  });
}

export function parcelPrismaUpdateFromPayload(
  parcel: Partial<ParcelConfigPayload>,
): Record<string, unknown> {
  const merged: ParcelConfigPayload = normalizeParcelCorners({
    ...PARCEL_CONFIG_DEFAULTS,
    ...parcel,
    enabled: parcel.enabled ?? PARCEL_CONFIG_DEFAULTS.enabled,
    name: parcel.name?.trim() || PARCEL_CONFIG_DEFAULTS.name,
    dimension:
      parcel.dimension && isParcelDimension(parcel.dimension)
        ? parcel.dimension
        : PARCEL_CONFIG_DEFAULTS.dimension,
    minX:
      typeof parcel.minX === "number" && Number.isFinite(parcel.minX)
        ? Math.floor(parcel.minX)
        : PARCEL_CONFIG_DEFAULTS.minX,
    minY:
      typeof parcel.minY === "number" && Number.isFinite(parcel.minY)
        ? Math.floor(parcel.minY)
        : PARCEL_CONFIG_DEFAULTS.minY,
    minZ:
      typeof parcel.minZ === "number" && Number.isFinite(parcel.minZ)
        ? Math.floor(parcel.minZ)
        : PARCEL_CONFIG_DEFAULTS.minZ,
    maxX:
      typeof parcel.maxX === "number" && Number.isFinite(parcel.maxX)
        ? Math.floor(parcel.maxX)
        : PARCEL_CONFIG_DEFAULTS.maxX,
    maxY:
      typeof parcel.maxY === "number" && Number.isFinite(parcel.maxY)
        ? Math.floor(parcel.maxY)
        : PARCEL_CONFIG_DEFAULTS.maxY,
    maxZ:
      typeof parcel.maxZ === "number" && Number.isFinite(parcel.maxZ)
        ? Math.floor(parcel.maxZ)
        : PARCEL_CONFIG_DEFAULTS.maxZ,
  });

  const out: Record<string, unknown> = {};
  if (typeof parcel.enabled === "boolean") out.parcelEnabled = parcel.enabled;
  if (typeof parcel.name === "string") {
    const n = parcel.name.trim();
    if (n) out.parcelName = n.slice(0, 80);
  }
  if (parcel.dimension && isParcelDimension(parcel.dimension)) {
    out.parcelDimension = parcel.dimension;
  }
  if (
    parcel.minX !== undefined ||
    parcel.minY !== undefined ||
    parcel.minZ !== undefined ||
    parcel.maxX !== undefined ||
    parcel.maxY !== undefined ||
    parcel.maxZ !== undefined
  ) {
    out.parcelMinX = merged.minX;
    out.parcelMinY = merged.minY;
    out.parcelMinZ = merged.minZ;
    out.parcelMaxX = merged.maxX;
    out.parcelMaxY = merged.maxY;
    out.parcelMaxZ = merged.maxZ;
  }
  return out;
}

export function isInsideParcelBox(
  x: number,
  y: number,
  z: number,
  parcel: ParcelConfigPayload,
): boolean {
  const p = normalizeParcelCorners(parcel);
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const fz = Math.floor(z);
  return (
    fx >= p.minX &&
    fx <= p.maxX &&
    fy >= p.minY &&
    fy <= p.maxY &&
    fz >= p.minZ &&
    fz <= p.maxZ
  );
}

export function formatParcelBounds(parcel: ParcelConfigPayload): string {
  const p = normalizeParcelCorners(parcel);
  return `(${p.minX}, ${p.minY}, ${p.minZ}) → (${p.maxX}, ${p.maxY}, ${p.maxZ})`;
}

export function parcelBlockSpan(parcel: ParcelConfigPayload): {
  spanX: number;
  spanY: number;
  spanZ: number;
} {
  const p = normalizeParcelCorners(parcel);
  return {
    spanX: p.maxX - p.minX + 1,
    spanY: p.maxY - p.minY + 1,
    spanZ: p.maxZ - p.minZ + 1,
  };
}
