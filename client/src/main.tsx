import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from './App';
import { initPerformanceMonitoring } from './lib/performance';
import "./index.css";

// 初始化效能監控
initPerformanceMonitoring();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);

// 註冊 Service Worker（僅在生產環境）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/song/sw.js', { scope: '/song/' })
      .then((registration) => {
        console.log('[PWA] Service Worker 註冊成功:', registration.scope);

        // 檢查更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] 新版本可用，請重新整理頁面');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('[PWA] Service Worker 註冊失敗:', error);
      });
  });
}
