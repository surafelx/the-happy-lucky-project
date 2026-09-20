import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
  // PGlite ships a WASM Postgres and the Neon driver uses ws; both must be loaded by Node, not bundled.
  serverExternalPackages: ["@electric-sql/pglite", "@neondatabase/serverless"],
};

export default nextConfig;
