// 「你推薦的歌被彈出來了！」回饋
//
// 形成「推薦 → 被採納 → 被演出」的完整正向迴圈：當訪客在本機記錄過的推薦
// （mySuggestions）對應到的歌曲在現場被標記為已彈奏（song.isPlayed），
// 跳一則慶祝 toast。用 localStorage 記住已慶祝過的，避免重整重複跳。
import { useEffect, useRef } from 'react';
import { useMySuggestions } from '@/lib/mySuggestions';
import { normalizeTitle } from '@/lib/duplicateSong';
import { useToast } from '@/hooks/use-toast';
import type { Song } from '@/lib/firestore';

const CELEBRATED_KEY = 'song-played-celebrated-v1';

function loadCelebrated(): Set<string> {
    try {
        const raw = localStorage.getItem(CELEBRATED_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return new Set(Array.isArray(arr) ? arr : []);
    } catch {
        return new Set();
    }
}

function saveCelebrated(set: Set<string>): void {
    try {
        localStorage.setItem(CELEBRATED_KEY, JSON.stringify(Array.from(set)));
    } catch {
        /* 配額 / 隱私模式 → 放棄 */
    }
}

export function usePlayedSuggestionCelebration(songs: Song[]): void {
    const mine = useMySuggestions();
    const { toast } = useToast();
    const celebratedRef = useRef<Set<string>>(loadCelebrated());

    useEffect(() => {
        if (mine.length === 0 || songs.length === 0) return;

        // 現場已彈奏歌曲的標準化標題集合
        const playedTitles = new Set(
            songs.filter((s) => s.isPlayed).map((s) => normalizeTitle(s.title)),
        );
        if (playedTitles.size === 0) return;

        for (const m of mine) {
            if (celebratedRef.current.has(m.id)) continue;
            if (playedTitles.has(normalizeTitle(m.title))) {
                celebratedRef.current.add(m.id);
                saveCelebrated(celebratedRef.current);
                toast({
                    title: '🎸 你推薦的歌被彈出來了！',
                    description: `《${m.title}》今晚被阿凱彈了，謝謝你的好品味！`,
                    variant: 'success',
                });
            }
        }
    }, [mine, songs, toast]);
}
