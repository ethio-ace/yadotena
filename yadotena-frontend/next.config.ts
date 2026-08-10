import type { NextConfig } from "next";

const API_ORIGIN =
  (process.env.NEXT_PUBLIC_API_URL || "https://yadotena.onrender.com").replace(
    /\/$/,
    "",
  );

function r2RemotePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const patterns: NonNullable<
    NonNullable<NextConfig["images"]>["remotePatterns"]
  > = [{ protocol: "https", hostname: "**.r2.dev" }];

  const raw = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.trim();
  if (raw) {
    try {
      const u = new URL(raw);
      const protocol = u.protocol.replace(":", "") as "http" | "https";
      if (protocol === "http" || protocol === "https") {
        patterns.push({ protocol, hostname: u.hostname });
      }
    } catch {
      // ignore invalid URL
    }
  }
  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      ...r2RemotePatterns(),
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
