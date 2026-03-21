/**
 * @fileoverview Next.js configuration.
 * Minimal config for Turbopack — @xenova/transformers is client-side only.
 */

import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "onnxruntime-node": "./lib/empty-node.ts",
      sharp: "./lib/empty-node.ts",
    },
  },
  webpack: (config, { isServer }) => {
    // WASM files must be served as static assets
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });

    // Don't try to polyfill Node built-ins in the browser
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "sharp$": false,
        "onnxruntime-node$": false,
        fs: path.resolve(".", "lib", "empty-node.ts"),
        path: path.resolve(".", "lib", "empty-node.ts"),
        crypto: path.resolve(".", "lib", "empty-node.ts"),
        url: path.resolve(".", "lib", "empty-node.ts"),
        os: path.resolve(".", "lib", "empty-node.ts"),
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
