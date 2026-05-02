import { useEffect, useRef, useState } from 'react';
import type { Song } from '@/lib/firestore';

export type HypeLevel = 1 | 2 | 3;

export interface HypeEvent {
    level: HypeLevel;
    /** 60 秒內全站累積票數 */
    count: number;
    triggeredAt: number;
}

export interface HypeMeta {
    threshold: number;
    label: string;
    emoji: string;
    /** 主漸層 */
    gradient: string;
    /** 邊條漸層（橫條） */
    barGradient: string;
}

export const HYPE_META: Record<HypeLevel, HypeMeta> = {
    1: {
        threshold: 50,
        label: '全站熱浪',
        emoji: '🎉',
        gradient: 'from-amber-400 via-orange-500 to-red-500',
        barGradient: 'from-amber-400 via-orange-500 to-amber-400',
    },
    2: {
        threshold: 100,
        label: '火力全開',
        emoji: '🔥',
        gradient: 'from-red-500 via-pink-500 to-purple-600',
        barGradient: 'from-red-500 via-pink-500 to-red-500',
    },
    3: {
        threshold: 200,
        label: '失控狀態',
        emoji: '🚀',
        gradient: 'from-yellow-400 via-pink-500 via-purple-500 to-cyan-400',
        barGradient: 'from-yellow-400 via-pink-500 via-purple-500 to-cyan-400',
    },
};

const WINDOW_MS = 60_000;
const COOLDOWN_MS = 30_000;
const DISPLAY_MS = 4500;
const SETTLE_MS = 1500;

/**
 * 偵測全站投票熱度 — 60 秒內所有歌曲票數總和過 50/100/200 觸發三階。
 * 同 useVoteSurge 機制，但聚合所有歌曲。
 */
export function useGlobalHype(songs: Song[]): HypeEvent | null {
    const eventsRef = useRef<number[]>([]);
    const prevCountsRef = useRef<Map<string, number>>(new Map());
    const lastTriggeredAtRef = useRef<number>(0);
    const startedAtRef = useRef<number>(Date.now());
    const [event, setEvent] = useState<HypeEvent | null>(null);

    // 累積 delta 為時間戳事件
    useEffect(() => {
        const now = Date.now();
        const isInitial = now - startedAtRef.current < SETTLE_MS;

        songs.forEach((song) => {
            const prev = prevCountsRef.current.get(song.id);
            if (prev !== undefined && !isInitial) {
                const delta = song.voteCount - prev;
                if (delta > 0) {
                    for (let i = 0; i < delta; i++) eventsRef.current.push(now);
                }
            }
            prevCountsRef.current.set(song.id, song.voteCount);
        });
    }, [songs]);

    // 每秒重算 + 觸發判斷
    useEffect(() => {
        const id = setInterval(() => {
            const now = Date.now();
            const cutoff = now - WINDOW_MS;
            eventsRef.current = eventsRef.current.filter((t) => t >= cutoff);
            const count = eventsRef.current.length;

            // 冷卻中
            if (now - lastTriggeredAtRef.current < COOLDOWN_MS) return;

            let level: HypeLevel | 0 = 0;
            if (count >= HYPE_META[3].threshold) level = 3;
            else if (count >= HYPE_META[2].threshold) level = 2;
            else if (count >= HYPE_META[1].threshold) level = 1;

            if (level > 0) {
                setEvent({ level: level as HypeLevel, count, triggeredAt: now });
                lastTriggeredAtRef.current = now;
            }
        }, 1000);
        return () => clearInterval(id);
    }, []);

    // 自動淡出
    useEffect(() => {
        if (!event) return;
        const timer = setTimeout(() => setEvent(null), DISPLAY_MS);
        return () => clearTimeout(timer);
    }, [event]);

    return event;
}
