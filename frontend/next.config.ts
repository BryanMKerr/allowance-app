import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/allowance-app" : "",
  assetPrefix: isProd ? "/allowance-app/" : "",
};

export default nextConfig;
