import { useEffect, useRef, useState } from 'react';
import type { Song } from '@/lib/firestore';

export interface DarkHorseEvent {
    songId: string;
    songTitle: string;
    songArtist: string;
    fromRank: number; // 1-based, e.g. 8
    toRank: number;   // 1-based, e.g. 2
    voteCount: number;
    triggeredAt: number;
}

const JUMP_THRESHOLD = 3;        // 至少跳幾名才算黑馬
const TARGET_TOP_N = 5;          // 跳完要進前 N 才算
const REPEAT_COOLDOWN_MS = 30_000; // 同一首歌冷卻時間
const DISPLAY_MS = 5000;         // overlay 顯示時間
const SETTLE_MS = 1500;          // 啟動後等 N 毫秒才開始偵測 (避免初始 sortedSongs 跟 prev 比錯位置)

/**
 * 偵測黑馬時刻 — 排名跳升 ≥3 名且進前 5。
 * 只用本地推算，不打 Firestore。
 *
 * 使用方式：
 *   const event = useDarkHorse(songs);  // 任意元件呼叫
 *   <DarkHorseOverlay event={event} />
 *
 * 多個分頁/裝置會各自獨立偵測（每個訂閱拿到的 snapshot 一樣，
 * 但 prev 比對是 per-instance），所以演出模式 + 訪客端都會看到
 * 同一個黑馬事件。
 */
export function useDarkHorse(songs: Song[]) {
    const prevRanksRef = useRef<Map<string, number>>(new Map());
    const lastTriggeredRef = useRef<Map<string, number>>(new Map());
    const startedAtRef = useRef<number>(Date.now());
    const [event, setEvent] = useState<DarkHorseEvent | null>(null);

    useEffect(() => {
        if (songs.length === 0) return;

        const sorted = [...songs].sort((a, b) => b.voteCount - a.voteCount);
        const newMap = new Map<string, number>();
        const prev = prevRanksRef.current;
        const now = Date.now();
        const isInitialPeriod = now - startedAtRef.current < SETTLE_MS;

        let triggered: DarkHorseEvent | null = null;

        sorted.forEach((song, newRankZeroBased) => {
            newMap.set(song.id, newRankZeroBased);
            if (isInitialPeriod) return;

            const prevRankZeroBased = prev.get(song.id);
            if (prevRankZeroBased === undefined) return; // 新加入歌曲不算

            const jumped = prevRankZeroBased - newRankZeroBased;
            const enteredTop = newRankZeroBased < TARGET_TOP_N;

            if (jumped >= JUMP_THRESHOLD && enteredTop) {
                const lastAt = lastTriggeredRef.current.get(song.id) ?? 0;
                if (now - lastAt < REPEAT_COOLDOWN_MS) return;

                // 同一輪只取「跳最多名」的那個事件，避免一次 batch 多首觸發
                if (!triggered || jumped > (triggered.fromRank - triggered.toRank)) {
                    triggered = {
                        songId: song.id,
                        songTitle: song.title,
                        songArtist: song.artist,
                        fromRank: prevRankZeroBased + 1,
                        toRank: newRankZeroBased + 1,
                        voteCount: song.voteCount,
                        triggeredAt: now,
                    };
                }
            }
        });

        prevRanksRef.current = newMap;

        if (triggered) {
            const t: DarkHorseEvent = triggered;
            lastTriggeredRef.current.set(t.songId, t.triggeredAt);
            setEvent(t);
        }
    }, [songs]);

    // 自動淡出
    useEffect(() => {
        if (!event) return;
        const timer = setTimeout(() => setEvent(null), DISPLAY_MS);
        return () => clearTimeout(timer);
    }, [event]);

    return event;
}
