import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
    minimumCacheTTL: 60,
  },
  headers: async () => [
    {
      source: "/_next/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/event/:eventId/gallery",
      headers: [
        {
          key: "Cache-Control",
          value: "public, s-maxage=10, stale-while-revalidate=59",
        },
      ],
    },
  ],
};

export default nextConfig;
