import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { renameSync, rmSync, readFileSync, writeFileSync } from 'node:fs'

// Vite は input のパス構造を維持して dist/src/popup.html を吐くため、
// ルートへ再配置する（Chrome 拡張では manifest の default_popup はルート相対が自然）。
function popupToRoot(): Plugin {
  return {
    name: 'popup-to-root',
    apply: 'build',
    closeBundle() {
      try {
        const from = resolve(__dirname, 'dist/src/popup.html')
        const to = resolve(__dirname, 'dist/popup.html')
        renameSync(from, to)
        // 移動前(src/深さ)基準で出力された相対参照を、ルート基準へ補正
        let html = readFileSync(to, 'utf8')
        html = html.replace(/\.\.\/assets\//g, './assets/')
        writeFileSync(to, html)
        rmSync(resolve(__dirname, 'dist/src'), { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    },
  }
}

// Chrome拡張機能 (Manifest V3) 向けビルド。
// popup.html をエントリにして dist/ へ出力。base './' で相対アセット参照。
export default defineConfig({
  base: './',
  plugins: [react(), popupToRoot()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})
