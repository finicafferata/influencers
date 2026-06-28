import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shared workspace packages ship as TS source; let Next compile them.
  transpilePackages: ["@repo/trpc"],
};

export default nextConfig;
