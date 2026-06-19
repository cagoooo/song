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

const JUMP_THRESHOLD = 3;          // 至少跳升幾名才算黑馬
const TARGET_TOP_N = 5;            // 必須進入前 N 名
const REPEAT_COOLDOWN_MS = 30_000; // 同一首歌避免短時間重複觸發
const DISPLAY_MS = 5000;           // overlay 顯示時間
const SETTLE_MS = 1500;            // 初次載入等待，避免第一批資料誤觸發

/**
 * 偵測黑馬時刻：排名跳升達門檻、進入前段班，而且票數真的有增加。
 * 管理員重置投票會讓排名重新洗牌，但票數會下降或歸零，不能被視為黑馬。
 */
export function useDarkHorse(songs: Song[]) {
    const prevRanksRef = useRef<Map<string, number>>(new Map());
    const prevVotesRef = useRef<Map<string, number>>(new Map());
    const lastTriggeredRef = useRef<Map<string, number>>(new Map());
    const startedAtRef = useRef<number>(Date.now());
    const [event, setEvent] = useState<DarkHorseEvent | null>(null);

    useEffect(() => {
        if (songs.length === 0) return;

        const sorted = [...songs].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
        const newRanks = new Map<string, number>();
        const newVotes = new Map<string, number>();
        const prevRanks = prevRanksRef.current;
        const prevVotes = prevVotesRef.current;
        const now = Date.now();
        const isInitialPeriod = now - startedAtRef.current < SETTLE_MS;

        let triggered: DarkHorseEvent | null = null;

        sorted.forEach((song, newRankZeroBased) => {
            const voteCount = song.voteCount || 0;
            newRanks.set(song.id, newRankZeroBased);
            newVotes.set(song.id, voteCount);
            if (isInitialPeriod) return;

            const prevRankZeroBased = prevRanks.get(song.id);
            if (prevRankZeroBased === undefined) return;

            const voteDelta = voteCount - (prevVotes.get(song.id) ?? 0);
            const jumped = prevRankZeroBased - newRankZeroBased;
            const enteredTop = newRankZeroBased < TARGET_TOP_N;

            if (voteDelta > 0 && voteCount > 0 && jumped >= JUMP_THRESHOLD && enteredTop) {
                const lastAt = lastTriggeredRef.current.get(song.id) ?? 0;
                if (now - lastAt < REPEAT_COOLDOWN_MS) return;

                if (!triggered || jumped > (triggered.fromRank - triggered.toRank)) {
                    triggered = {
                        songId: song.id,
                        songTitle: song.title,
                        songArtist: song.artist,
                        fromRank: prevRankZeroBased + 1,
                        toRank: newRankZeroBased + 1,
                        voteCount,
                        triggeredAt: now,
                    };
                }
            }
        });

        prevRanksRef.current = newRanks;
        prevVotesRef.current = newVotes;

        if (triggered) {
            const t: DarkHorseEvent = triggered;
            lastTriggeredRef.current.set(t.songId, t.triggeredAt);
            setEvent(t);
        }
    }, [songs]);

    useEffect(() => {
        if (!event) return;
        const timer = setTimeout(() => setEvent(null), DISPLAY_MS);
        return () => clearTimeout(timer);
    }, [event]);

    return event;
}
