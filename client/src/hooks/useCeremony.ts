// 監聽 admin 廣播的演出儀式
// 只有「掛載後」收到的新儀式才會觸發 → 避免使用者進站看到上一場的儀式
import { useEffect, useRef, useState } from 'react';
import { subscribeCeremony, type CeremonyInfo } from '@/lib/firestore';

interface UseCeremonyOptions {
    /** 客戶端是否已掛載；只有掛載後 triggeredAt 才算數 */
    enabled?: boolean;
}

interface UseCeremonyReturn {
    /** 最新一筆要播放的儀式（已扣除自己掛載前的歷史儀式） */
    pending: CeremonyInfo | null;
    /** 呼叫此函式把目前的 pending 標記為已消化 */
    consume: () => void;
}

export function useCeremony({ enabled = true }: UseCeremonyOptions = {}): UseCeremonyReturn {
    const [pending, setPending] = useState<CeremonyInfo | null>(null);
    const mountTimeRef = useRef<number>(Date.now());
    const lastSeenTriggeredAtRef = useRef<number>(0);

    useEffect(() => {
        if (!enabled) return;
        // 重設 mount 時間（hook 重啟或重新啟用時）
        mountTimeRef.current = Date.now();

        // 給一點緩衝（500ms）避免首次 snapshot 把已存在的舊文件當新儀式
        const safetyThresholdMs = mountTimeRef.current + 500;

        const unsubscribe = subscribeCeremony((info) => {
            if (!info) return;
            const triggeredMs = info.triggeredAt.getTime();
            // 必須是「掛載後 + 還沒看過」的儀式
            if (triggeredMs < safetyThresholdMs) return;
            if (triggeredMs <= lastSeenTriggeredAtRef.current) return;
            lastSeenTriggeredAtRef.current = triggeredMs;
            setPending(info);
        });

        return () => unsubscribe();
    }, [enabled]);

    return {
        pending,
        consume: () => setPending(null),
    };
}
