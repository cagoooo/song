import { useEffect, useMemo, useRef, useState } from 'react';
import type { Song } from '@/lib/firestore';

/** 飆升等級：0 無、1 微熱、2 飆升、3 爆衝 */
export type SurgeLevel = 0 | 1 | 2 | 3;

const WINDOW_MS = 60_000;
const THRESHOLDS = { hot: 5, surging: 10, exploding: 20 };

function levelFor(count: number): SurgeLevel {
    if (count >= THRESHOLDS.exploding) return 3;
    if (count >= THRESHOLDS.surging) return 2;
    if (count >= THRESHOLDS.hot) return 1;
    return 0;
}

/**
 * 偵測歌曲票數飆升 — 純客戶端推算，不需要新訂閱也不寫 Firestore。
 *
 * 機制：每次 songs 變動時，比對「上次 voteCount」vs「現在 voteCount」，
 *       差額代表這個 tick 內收到的新票，記錄時間戳。
 *       只保留最近 60 秒內的時間戳，超過則 prune。
 *
 * 回傳：Map<songId, SurgeLevel>，給 RankingBoard / StagePage / SongCard 套樣式
 */
export function useVoteSurge(songs: Song[]): Map<string, SurgeLevel> {
    const prevCountsRef = useRef<Map<string, number>>(new Map());
    const eventsRef = useRef<Map<string, number[]>>(new Map());
    const [tick, setTick] = useState(0);

    // 比對前後票數，把新票時間戳累積進事件 map
    useEffect(() => {
        const now = Date.now();
        const prev = prevCountsRef.current;

        songs.forEach((song) => {
            const prevCount = prev.get(song.id) ?? song.voteCount;
            const delta = song.voteCount - prevCount;
            if (delta > 0) {
                const list = eventsRef.current.get(song.id) ?? [];
                for (let i = 0; i < delta; i++) list.push(now);
                eventsRef.current.set(song.id, list);
            }
            prev.set(song.id, song.voteCount);
        });
    }, [songs]);

    // 每秒 tick 一次強制重算（讓「過了 60s 就降階」即時生效）
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    // 計算每首歌目前的 surge level（同時 prune 過期事件）
    const result = useMemo(() => {
        const cutoff = Date.now() - WINDOW_MS;
        const map = new Map<string, SurgeLevel>();
        eventsRef.current.forEach((times, songId) => {
            const fresh = times.filter((t) => t >= cutoff);
            if (fresh.length !== times.length) {
                eventsRef.current.set(songId, fresh);
            }
            const lvl = levelFor(fresh.length);
            if (lvl > 0) map.set(songId, lvl);
        });
        return map;
    }, [tick, songs]);

    return result;
}

/** 給 UI 用的元數據 — 標籤、emoji、配色 */
export const SURGE_META: Record<Exclude<SurgeLevel, 0>, {
    emoji: string;
    label: string;
    /** Tailwind border / shadow / glow color stops */
    ringClass: string;
    badgeClass: string;
}> = {
    1: {
        emoji: '🔥',
        label: '微熱',
        ringClass: 'ring-2 ring-orange-400/60 shadow-orange-400/30',
        badgeClass: 'bg-orange-500 text-white',
    },
    2: {
        emoji: '🔥🔥',
        label: '飆升',
        ringClass: 'ring-4 ring-red-500/70 shadow-red-500/50',
        badgeClass: 'bg-gradient-to-r from-orange-500 to-red-600 text-white',
    },
    3: {
        emoji: '🚀',
        label: '爆衝',
        ringClass: 'ring-4 ring-amber-300 shadow-2xl shadow-red-500/70',
        badgeClass: 'bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600 text-white animate-pulse',
    },
};
