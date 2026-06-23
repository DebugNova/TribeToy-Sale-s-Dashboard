import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer (used in lib/labels) ships Node-only internals and font/binary
  // assets; keep it external so it's required at runtime instead of bundled.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
