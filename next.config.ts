import { imageRemotePatterns } from "./lib/image-policy";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const remotePatterns = imageRemotePatterns;

const nextConfig: NextConfig = {
  // Cloudflare has no IMAGES binding yet; serve originals until configured.
  // Vercel keeps its native optimizer when explicitly deployed there later.
  images: { remotePatterns, unoptimized: process.env.VERCEL !== "1" },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
