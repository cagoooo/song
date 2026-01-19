/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 部署路徑（倉庫名稱）
  base: "/song/",
  // .env 檔案位置（專案根目錄）
  envDir: __dirname,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心
          'react-vendor': ['react', 'react-dom'],
          // Firebase 相關
          'firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          // UI 元件庫
          'ui-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-tabs',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-alert-dialog',
          ],
          // 動畫與圖表
          'animation': ['framer-motion'],
          'charts': ['recharts'],
          // 其他工具
          'utils': ['date-fns', 'fuse.js', 'zod', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
  // Vitest 測試配置
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
    },
  },
});
