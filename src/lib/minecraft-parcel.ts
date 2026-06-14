export const PARCEL_DIMENSIONS = ["overworld", "nether", "the_end"] as const;
export type ParcelDimension = (typeof PARCEL_DIMENSIONS)[number];

export type ParcelConfigPayload = {
  enabled: boolean;
  name: string;
  dimension: ParcelDimension;
  minX: number;
  minY: number;
  minZ: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
};

export const PARCEL_CONFIG_DEFAULTS: ParcelConfigPayload = {
  enabled: false,
  name: "Parcela",
  dimension: "overworld",
  minX: 0,
  minY: 64,
  minZ: 0,
  sizeX: 16,
  sizeY: 16,
  sizeZ: 16,
};

export type ParcelEventType = "enter" | "exit";

export function isParcelDimension(value: string): value is ParcelDimension {
  return (PARCEL_DIMENSIONS as readonly string[]).includes(value);
}

export function parcelConfigFromRow(row: {
  parcelEnabled: boolean;
  parcelName: string;
  parcelDimension: string;
  parcelMinX: number;
  parcelMinY: number;
  parcelMinZ: number;
  parcelSizeX: number;
  parcelSizeY: number;
  parcelSizeZ: number;
}): ParcelConfigPayload {
  return {
    enabled: row.parcelEnabled,
    name: row.parcelName.trim() || PARCEL_CONFIG_DEFAULTS.name,
    dimension: isParcelDimension(row.parcelDimension)
      ? row.parcelDimension
      : PARCEL_CONFIG_DEFAULTS.dimension,
    minX: row.parcelMinX,
    minY: row.parcelMinY,
    minZ: row.parcelMinZ,
    sizeX: row.parcelSizeX,
    sizeY: row.parcelSizeY,
    sizeZ: row.parcelSizeZ,
  };
}

export function parcelPrismaUpdateFromPayload(
  parcel: Partial<ParcelConfigPayload>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof parcel.enabled === "boolean") out.parcelEnabled = parcel.enabled;
  if (typeof parcel.name === "string") {
    const n = parcel.name.trim();
    if (n) out.parcelName = n.slice(0, 80);
  }
  if (parcel.dimension && isParcelDimension(parcel.dimension)) {
    out.parcelDimension = parcel.dimension;
  }
  if (typeof parcel.minX === "number" && Number.isFinite(parcel.minX)) {
    out.parcelMinX = Math.floor(parcel.minX);
  }
  if (typeof parcel.minY === "number" && Number.isFinite(parcel.minY)) {
    out.parcelMinY = Math.floor(parcel.minY);
  }
  if (typeof parcel.minZ === "number" && Number.isFinite(parcel.minZ)) {
    out.parcelMinZ = Math.floor(parcel.minZ);
  }
  if (typeof parcel.sizeX === "number" && Number.isFinite(parcel.sizeX)) {
    out.parcelSizeX = Math.max(1, Math.min(512, Math.floor(parcel.sizeX)));
  }
  if (typeof parcel.sizeY === "number" && Number.isFinite(parcel.sizeY)) {
    out.parcelSizeY = Math.max(1, Math.min(512, Math.floor(parcel.sizeY)));
  }
  if (typeof parcel.sizeZ === "number" && Number.isFinite(parcel.sizeZ)) {
    out.parcelSizeZ = Math.max(1, Math.min(512, Math.floor(parcel.sizeZ)));
  }
  return out;
}

export function isInsideParcelBox(
  x: number,
  y: number,
  z: number,
  parcel: ParcelConfigPayload,
): boolean {
  const fx = Math.floor(x);
  const fy = Math.floor(y);
  const fz = Math.floor(z);
  return (
    fx >= parcel.minX &&
    fx < parcel.minX + parcel.sizeX &&
    fy >= parcel.minY &&
    fy < parcel.minY + parcel.sizeY &&
    fz >= parcel.minZ &&
    fz < parcel.minZ + parcel.sizeZ
  );
}

export function formatParcelBounds(parcel: ParcelConfigPayload): string {
  const maxX = parcel.minX + parcel.sizeX - 1;
  const maxY = parcel.minY + parcel.sizeY - 1;
  const maxZ = parcel.minZ + parcel.sizeZ - 1;
  return `(${parcel.minX}, ${parcel.minY}, ${parcel.minZ}) → (${maxX}, ${maxY}, ${maxZ})`;
}
