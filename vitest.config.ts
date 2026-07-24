import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * テスト専用設定。
 * vite.config.ts の crx / zip プラグインはテスト実行と干渉するため分離する。
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Windows で threads プール時に config 未初期化で落ちることがあるため forks 固定
    pool: "forks",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
