/** @type {import('next').NextConfig} */
const nextConfig = {
  // The agent package is consumed as TypeScript source (ESM with .js import specifiers).
  transpilePackages: ["@mantleflow/agent"],
  // The landing prerenders a live MI4 distribution read; give it headroom (loadPreview is also
  // bounded by its own timeout so a slow upstream degrades to the "unavailable" shell, not a hang).
  staticPageGenerationTimeout: 180,
  webpack: (config) => {
    // Resolve NodeNext-style ".js" import specifiers to their ".ts" sources.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
