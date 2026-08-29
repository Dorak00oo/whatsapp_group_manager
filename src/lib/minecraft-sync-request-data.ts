export type SyncRequestData = {
  command?: string;
  requestedAt?: string;
  handledAt?: string | null;
};

export function asSyncRequestData(value: unknown): SyncRequestData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as SyncRequestData;
}
