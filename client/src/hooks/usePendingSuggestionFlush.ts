// 離線送出佇列的自動補送（跨平台強化版）
//
// 在「分頁開著」的前提下盡量把暫存的推薦補送出去，涵蓋多種「回到可送出狀態」的時機：
//   - App 啟動（涵蓋上次離線後關掉分頁的殘留）
//   - 恢復連線（online 事件）
//   - 分頁切回前景 / 重新聚焦（visibilitychange / focus）—— 手機（含 iOS）常切走再回來
//   - 離開頁面前（pagehide）best-effort 再試一次
//   - 開著時每 60s 輪詢一次（補捉 online 事件沒觸發的弱網狀況）
//   - bonus：支援的瀏覽器（Chromium）登記 Background Sync，連線恢復時由 SW 喚醒並通知前端補送
// 全部以 navigator.onLine 與佇列長度作前置判斷，避免無謂嘗試；單次執行加鎖避免重入。
import { useEffect, useRef } from 'react';
import { flushPendingSuggestions } from '@/lib/firestore';
import { pendingSuggestionCount } from '@/lib/pendingSuggestions';
import { useToast } from '@/hooks/use-toast';

const RETRY_INTERVAL_MS = 60_000;
const SYNC_TAG = 'flush-suggestions';

// bonus：登記 Background Sync（支援才有效；失敗靜默）。iOS Safari 不支援 → 無妨，靠上面的 JS 觸發。
function registerBackgroundSync(): void {
    try {
        navigator.serviceWorker?.ready
            .then((reg) => (reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync?.register(SYNC_TAG))
            .catch(() => { /* 不支援 / 失敗 → 靜默 */ });
    } catch {
        /* 忽略 */
    }
}

export function usePendingSuggestionFlush(): void {
    const { toast } = useToast();
    const runningRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            if (runningRef.current || cancelled) return;
            if (pendingSuggestionCount() === 0) return;
            // 明確離線就先別試（等 online / 回前景再補），順手登記 Background Sync 由 SW 之後喚醒
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                registerBackgroundSync();
                return;
            }

            runningRef.current = true;
            try {
                const { ok } = await flushPendingSuggestions();
                if (!cancelled && ok > 0) {
                    toast({
                        title: `已自動補送 ${ok} 首推薦`,
                        description: '剛剛網路不穩暫存的推薦已成功送達阿凱老師。',
                        variant: 'success',
                    });
                }
            } finally {
                runningRef.current = false;
            }
        };

        const onOnline = () => void run();
        const onVisible = () => {
            if (document.visibilityState === 'visible') void run();
        };
        const onPageHide = () => void run();
        // SW（Background Sync）喚醒後通知前端補送
        const onSwMessage = (e: MessageEvent) => {
            if (e.data?.type === 'FLUSH_SUGGESTIONS') void run();
        };

        // 啟動補送一次
        void run();
        window.addEventListener('online', onOnline);
        window.addEventListener('focus', onOnline);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('pagehide', onPageHide);
        navigator.serviceWorker?.addEventListener('message', onSwMessage);
        const timer = window.setInterval(() => void run(), RETRY_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.removeEventListener('online', onOnline);
            window.removeEventListener('focus', onOnline);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('pagehide', onPageHide);
            navigator.serviceWorker?.removeEventListener('message', onSwMessage);
            window.clearInterval(timer);
        };
    }, [toast]);
}
