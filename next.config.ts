import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer (used in lib/labels) ships Node-only internals and font/binary
  // assets; keep it external so it's required at runtime instead of bundled.
  serverExternalPackages: ["@react-pdf/renderer"],

  experimental: {
    // Next 15+ stopped reusing page segments from the client Router Cache on
    // navigation (dynamic default = 0), so re-visiting a page always re-renders +
    // re-queries Supabase. Opting back in makes repeat / back-forward navigation
    // between recently visited dashboard pages feel instant in production. RLS still
    // re-validates every query, and writes go through revalidatePath which evicts the
    // cache, so freshness is preserved. (Only affects the production build; dev still
    // round-trips because prefetching is production-only.)
    staleTimes: {
      dynamic: 30, // seconds a dynamic (data) page stays fresh in the client cache
      static: 180, // seconds a static segment stays fresh
    },
  },
};

export default nextConfig;
