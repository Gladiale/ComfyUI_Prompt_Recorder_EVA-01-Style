import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
// import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { crx } from "@crxjs/vite-plugin";
import zip, { type Options } from "vite-plugin-zip-pack";
import manifest from "./manifest.config.ts";
import pkg from "./package.json" with { type: "json" };

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": `${path.resolve(__dirname, "src")}`,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    // reactCompiler無効化
    // babel({ presets: [reactCompilerPreset()] }),
    crx({ manifest }),
    // 実行時は default export の関数として解決される（TS は namespace 型と判定するため型のみ調整）
    (zip as unknown as (opts?: Options) => PluginOption)({
      outDir: "release",
      outFileName: `crx-${pkg.name}-${pkg.version}.zip`,
    }),
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
});
