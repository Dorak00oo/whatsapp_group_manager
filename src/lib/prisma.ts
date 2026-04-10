import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";
import { resolveDatabaseUrl } from "@/lib/database-url";

/**
 * Prisma 7 exige `adapter` o `accelerateUrl` en el constructor; `new PrismaClient()`
 * solo ya no es válido cuando el datasource solo está en prisma.config.
 */
const connectionString = (() => {
  const fromFile = resolveDatabaseUrl();
  if (fromFile) {
    process.env.DATABASE_URL = fromFile;
    return fromFile;
  }
  return (process.env.DATABASE_URL ?? "").trim();
})();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  if (!connectionString) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[prisma] DATABASE_URL vacía — revisa .env en la raíz (junto a package.json)",
      );
    }
    throw new Error(
      "DATABASE_URL no está definida. Configúrala en .env o en las variables del hosting.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/** Tras `prisma generate` o HMR, `globalThis.prisma` puede ser un cliente viejo sin los modelos nuevos. */
function isCurrentPrismaClient(c: PrismaClient | undefined): boolean {
  const x = c as {
    directoryMember?: { findMany?: unknown };
    botPanelSettings?: { findUnique?: unknown };
  };
  return (
    c != null &&
    typeof x.directoryMember?.findMany === "function" &&
    typeof x.botPanelSettings?.findUnique === "function"
  );
}

function getPrisma(): PrismaClient {
  const g = globalForPrisma;
  const cached = g.prisma;
  if (cached && isCurrentPrismaClient(cached)) {
    return cached;
  }
  if (cached) {
    void cached.$disconnect().catch(() => {});
    g.prisma = undefined;
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    g.prisma = client;
  }
  return client;
}

export const prisma = getPrisma();
