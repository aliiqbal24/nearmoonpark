import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/video/moonpark-opening-v6.mp4",
        destination: "/video/moonpark-opening-v7.mp4",
        permanent: false,
      },
      {
        source: "/video/moonpark-opening-v6-mobile.mp4",
        destination: "/video/moonpark-opening-v7-mobile.mp4",
        permanent: false,
      },
      {
        source: "/video/moonpark-opening-v6-poster.jpg",
        destination: "/video/moonpark-opening-v7-poster.jpg",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
