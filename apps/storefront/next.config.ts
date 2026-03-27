import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@kstack/types"],
  images: {
    remotePatterns: [
      // Allow any HTTPS image — merchants can add images from any host
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
