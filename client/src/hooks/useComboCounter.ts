import { useCallback, useEffect, useRef, useState } from 'react';

export interface ComboState {
    songId: string;
    songTitle: string;
    songArtist: string;
    count: number;
    /** 觸發時間，用於動畫 key 強制重播 */
    triggeredAt: number;
}

export interface ComboMilestone {
    threshold: number;
    label: string;
    emoji: string;
    /** Tailwind 漸層 class */
    gradient: string;
    /** 觸發時 confetti 顆粒數 */
    confettiCount: number;
}

/**
 * 五階里程碑 — 由小到大呈現連擊強度。
 * 找出 count 對應的最高里程碑顯示。
 */
export const COMBO_MILESTONES: ComboMilestone[] = [
    { threshold: 3, label: 'COMBO', emoji: '⚡', gradient: 'from-blue-400 to-cyan-400', confettiCount: 30 },
    { threshold: 5, label: 'GREAT', emoji: '🔥', gradient: 'from-orange-400 to-red-500', confettiCount: 50 },
    { threshold: 10, label: 'AWESOME', emoji: '💥', gradient: 'from-red-500 to-pink-600', confettiCount: 80 },
    { threshold: 20, label: 'INSANE', emoji: '🌟', gradient: 'from-purple-500 via-pink-500 to-amber-400', confettiCount: 120 },
    { threshold: 50, label: 'LEGENDARY', emoji: '🚀', gradient: 'from-yellow-400 via-red-500 to-purple-600', confettiCount: 200 },
];

/** 給定 count 找出對應的最高里程碑；< 3 回傳 null（不展示） */
export function getMilestone(count: number): ComboMilestone | null {
    let result: ComboMilestone | null = null;
    for (const m of COMBO_MILESTONES) {
        if (count >= m.threshold) result = m;
    }
    return result;
}

const COMBO_RESET_MS = 3000;
const COMBO_DISPLAY_MS = 2500;
const VOTE_EVENT = 'combo:vote';

/**
 * 同一首歌 3 秒內連投累計 combo；換歌或超時就重置。
 * useVoting 在投票成功後 dispatch 'combo:vote' window 事件，
 * 此 hook 接收後增量計數，並透過 state 觸發 ComboOverlay 顯示。
 */
export function useComboCounter() {
    const [combo, setCombo] = useState<ComboState | null>(null);
    // 用 ref 而非 state 累積 count，避免 register 時拿到舊閉包值
    const stateRef = useRef<ComboState | null>(null);

    const register = useCallback((info: { songId: string; songTitle: string; songArtist: string }) => {
        const now = Date.now();
        const prev = stateRef.current;
        const isContinuation = prev
            && prev.songId === info.songId
            && now - prev.triggeredAt < COMBO_RESET_MS;
        const next: ComboState = {
            songId: info.songId,
            songTitle: info.songTitle,
            songArtist: info.songArtist,
            count: isContinuation ? prev.count + 1 : 1,
            triggeredAt: now,
        };
        stateRef.current = next;
        setCombo(next);
    }, []);

    // 監聽全域投票事件
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { songId: string; songTitle: string; songArtist: string };
            if (!detail?.songId) return;
            register(detail);
        };
        window.addEventListener(VOTE_EVENT, handler);
        return () => window.removeEventListener(VOTE_EVENT, handler);
    }, [register]);

    // 自動淡出：超過顯示時間或 3 秒沒新票就清除
    useEffect(() => {
        if (!combo) return;
        const timer = setTimeout(() => {
            // 只有「沒被新事件覆蓋過」才清除
            if (stateRef.current?.triggeredAt === combo.triggeredAt) {
                setCombo(null);
                stateRef.current = null;
            }
        }, COMBO_DISPLAY_MS);
        return () => clearTimeout(timer);
    }, [combo]);

    return { combo };
}

/** 給 useVoting 等寫端用的廣播輔助 */
export function broadcastVote(songId: string, songTitle: string, songArtist: string) {
    window.dispatchEvent(new CustomEvent(VOTE_EVENT, {
        detail: { songId, songTitle, songArtist },
    }));
}
