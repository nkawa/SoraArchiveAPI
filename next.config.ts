import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    trailingSlash: true,
    assetPrefix: "/sapi",
    basePath: "/sapi",
};

export default nextConfig;
