import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // The in-process checker supports TypeScript 5 and avoids an unnecessary
    // child process; `pnpm typecheck` remains the explicit CI gate.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
