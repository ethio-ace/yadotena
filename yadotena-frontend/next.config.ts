import type { NextConfig } from "next";

const API_ORIGIN =
  (process.env.NEXT_PUBLIC_API_URL || "https://yadotena.onrender.com").replace(
    /\/$/,
    "",
  );

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Browser → same-origin proxy → Render API (avoids CORS when origin isn't allowlisted)
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${API_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
