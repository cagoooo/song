import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import App from './App';
import "./index.css";

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

// 註冊 Service Worker + 啟動效能監控 — 都在 load 後 idle 才跑, 不阻塞 FCP/LCP
if (typeof window !== 'undefined') {
  const win = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  };

  // 效能監控 lazy load（firebase/performance ~30KB 不必進主 bundle）
  const startPerfMonitor = () => {
    import('./lib/performance').then(({ initPerformanceMonitoring }) => {
      initPerformanceMonitoring();
    }).catch(() => {/* perf 監控失敗不影響核心 */});
  };

  // SW 註冊
  const registerSW = () => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register('/song/sw.js', { scope: '/song/', updateViaCache: 'none' })
        .then((registration) => {
          registration.update().catch(() => {});
          console.log('[PWA] Service Worker 註冊成功:', registration.scope);
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker 註冊失敗:', error);
        });
    }
  };

  window.addEventListener('load', () => {
    // SW 用 idle 排程降低與 React hydration 的競爭
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(registerSW, { timeout: 2000 });
      win.requestIdleCallback(startPerfMonitor, { timeout: 4000 });
    } else {
      setTimeout(registerSW, 500);
      setTimeout(startPerfMonitor, 1500);
    }
  });
}
