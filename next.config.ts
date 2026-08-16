import type { NextConfig } from "next";
import path from "node:path";

/** Cursor abre este repo junto a otras carpetas; process.cwd() es la raíz real al correr npm run dev. */
const projectRoot = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pg",
    "@prisma/adapter-pg",
    "@prisma/client",
    "prisma",
  ],
  allowedDevOrigins: ["192.168.40.95"],
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
