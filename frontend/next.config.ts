import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only — allow LAN IPs to hit the Next dev server. Harmless in prod
  // (this config field is ignored by `next start`).
  allowedDevOrigins: ["192.168.56.1", "localhost", "127.0.0.1"],
};

export default nextConfig;
