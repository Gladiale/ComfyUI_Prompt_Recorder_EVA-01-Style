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
    // Windows で forks 時に runner/config 未初期化で落ちることがあるため固定
    // vmThreads の方が forks より安定（forks は断続的に config 未初期化）
    pool: "vmThreads",
    maxWorkers: 1,
    fileParallelism: false,
    isolate: false,
  },
});
