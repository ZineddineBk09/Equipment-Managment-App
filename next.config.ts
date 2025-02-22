import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // allow images from all domains
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.(mp3|png|jpe?g|gif)$/i,
      use: [
        {
          loader: "file-loader",
        },
      ],
    });
    return config;
  },
};

export default nextConfig;
