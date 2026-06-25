/** @type {import('next').NextConfig} */
const nextConfig = {
  // The agent package is consumed as TypeScript source (ESM with .js import specifiers).
  transpilePackages: ["@mantleflow/agent"],
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
