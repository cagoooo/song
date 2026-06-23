// 離線送出佇列的自動補送（輕量強化版）
//
// 在「分頁開著」的前提下盡量把暫存的推薦補送出去，涵蓋多種「回到可送出狀態」的時機：
//   - App 啟動（涵蓋上次離線後關掉分頁的殘留）
//   - 恢復連線（online 事件）
//   - 分頁切回前景（visibilitychange）—— 手機常切走再回來
//   - 離開頁面前（pagehide）best-effort 再試一次
//   - 開著時每 60s 輪詢一次（補捉 online 事件沒觸發的弱網狀況）
// 全部以 navigator.onLine 與佇列長度作前置判斷，避免無謂嘗試；單次執行加鎖避免重入。
import { useEffect, useRef } from 'react';
import { flushPendingSuggestions } from '@/lib/firestore';
import { pendingSuggestionCount } from '@/lib/pendingSuggestions';
import { useToast } from '@/hooks/use-toast';

const RETRY_INTERVAL_MS = 60_000;

export function usePendingSuggestionFlush(): void {
    const { toast } = useToast();
    const runningRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            if (runningRef.current || cancelled) return;
            if (pendingSuggestionCount() === 0) return;
            // 明確離線就先別試（等 online / 回前景再補）
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

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

        // 啟動補送一次
        void run();
        window.addEventListener('online', onOnline);
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('pagehide', onPageHide);
        const timer = window.setInterval(() => void run(), RETRY_INTERVAL_MS);

        return () => {
            cancelled = true;
            window.removeEventListener('online', onOnline);
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('pagehide', onPageHide);
            window.clearInterval(timer);
        };
    }, [toast]);
}
