import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd(), "../../"),
  },
  async rewrites() {
    if (!process.env.JOBPILOT_API_URL) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.JOBPILOT_API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;


