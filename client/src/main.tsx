import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import App from './App';
import { initPerformanceMonitoring } from './lib/performance';
import "./index.css";

// 初始化效能監控
initPerformanceMonitoring();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// 註冊 Service Worker（僅在生產環境）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/song/sw.js', { scope: '/song/' })
      .then((registration) => {
        console.log('[PWA] Service Worker 註冊成功:', registration.scope);
        // 新版偵測 + 更新 banner 由 useServiceWorkerUpdate hook 與
        // UpdatePrompt 元件處理 (Home.tsx 渲染), 此處只負責註冊。
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker 註冊失敗:', error);
      });
  });
}
