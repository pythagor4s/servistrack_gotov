import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
  async redirects() {
    return [
      { source: "/plan-vzdrzevanja", destination: "/opravila", permanent: true },
      { source: "/koledar", destination: "/opravila", permanent: true },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
  transpilePackages: ["@servis-track/shared"],
};

export default nextConfig;
