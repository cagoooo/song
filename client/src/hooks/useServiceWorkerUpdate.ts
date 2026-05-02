import { useCallback, useEffect, useState } from 'react';

interface SwState {
    /** 有新版本在 waiting 等待啟用 */
    updateAvailable: boolean;
    /** 目前生效的 SW 版本字串 (從 SW message 取回) */
    currentVersion: string | null;
}

/**
 * 監聽 SW 狀態 + 提供「立刻更新」操作。
 *
 * 機制:
 * 1. 註冊新 SW 時, browser 會把它放在 'waiting' 狀態 (因為舊 SW 還在 controller)
 * 2. 偵測 'updatefound' → 監聽新 SW 'installed' 狀態
 * 3. 通知 React state, 由 UpdatePrompt 顯示按鈕
 * 4. 使用者點按鈕 → postMessage('SKIP_WAITING') → SW 切換 → 監聽 'controllerchange' → reload
 */
export function useServiceWorkerUpdate(): SwState & { applyUpdate: () => void } {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [currentVersion, setCurrentVersion] = useState<string | null>(null);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    useEffect(() => {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

        let cancelled = false;

        navigator.serviceWorker.ready.then((registration) => {
            if (cancelled) return;

            // 詢問現役 SW 版本
            const ch = new MessageChannel();
            ch.port1.onmessage = (e) => {
                if (e.data?.version) setCurrentVersion(e.data.version);
            };
            registration.active?.postMessage({ type: 'GET_VERSION' }, [ch.port2]);

            // 已經有 waiting worker (例如使用者開頁前 SW 就更新好了)
            if (registration.waiting) {
                setWaitingWorker(registration.waiting);
                setUpdateAvailable(true);
            }

            // 監聽未來的更新事件
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;
                newWorker.addEventListener('statechange', () => {
                    if (
                        newWorker.state === 'installed'
                        && navigator.serviceWorker.controller
                    ) {
                        // 有新 SW 安裝完, 且目前頁面已被舊 SW 控制 → 提示更新
                        setWaitingWorker(newWorker);
                        setUpdateAvailable(true);
                    }
                });
            });

            // 主動定期觸發 update 檢查 (每 30 分鐘) — 開著的分頁也會偵測新版
            const interval = setInterval(() => {
                registration.update().catch(() => {});
            }, 30 * 60 * 1000);

            return () => clearInterval(interval);
        });

        // 新 SW 接管後 reload (在 applyUpdate postMessage 之後會觸發)
        let refreshing = false;
        const onControllerChange = () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        return () => {
            cancelled = true;
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        };
    }, []);

    const applyUpdate = useCallback(() => {
        if (!waitingWorker) {
            // 沒有 waiting worker 但使用者強制要 reload (例如開發模式)
            window.location.reload();
            return;
        }
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        // controllerchange 事件會自動 reload
    }, [waitingWorker]);

    return { updateAvailable, currentVersion, applyUpdate };
}
