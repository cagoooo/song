import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Song } from '@/lib/firestore';

export type SortMode = 'shuffle' | 'votes' | 'alphabet' | 'newest';

export const SORT_OPTIONS: { value: SortMode; label: string; icon: string }[] = [
    { value: 'shuffle', label: '隨機', icon: '🎲' },
    { value: 'votes', label: '票數最高', icon: '🏆' },
    { value: 'newest', label: '最新加入', icon: '🆕' },
    { value: 'alphabet', label: 'A-Z 字母', icon: '🔤' },
];

const STORAGE_KEY = 'song_sort_mode_v1';
const QUERY_KEY = 'sort';
const VALID: readonly SortMode[] = ['shuffle', 'votes', 'alphabet', 'newest'];

function readInitial(): SortMode {
    if (typeof window === 'undefined') return 'shuffle';
    // URL 優先（可分享連結），其次 localStorage，最後 default
    try {
        const fromUrl = new URLSearchParams(window.location.search).get(QUERY_KEY);
        if (fromUrl && (VALID as readonly string[]).includes(fromUrl)) return fromUrl as SortMode;
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && (VALID as readonly string[]).includes(stored)) return stored as SortMode;
    } catch {
        // ignore
    }
    return 'shuffle';
}

/** Fisher-Yates with seed — 同 seed 產生穩定隨機順序 */
function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
    const out = [...arr];
    let s = seed;
    for (let i = out.length - 1; i > 0; i--) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const j = Math.floor((s / 0x7fffffff) * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/**
 * 排序模式管理 — URL 同步、localStorage 持久化、自動 sort songs
 * @param songs    要排序的完整 song 陣列
 * @param shuffleSeed shuffle 模式用的固定 seed（同一頁面瀏覽期間穩定）
 */
export function useSortMode(songs: Song[], shuffleSeed: number) {
    const [sortMode, setSortModeState] = useState<SortMode>(readInitial);

    const setSortMode = useCallback((mode: SortMode) => {
        setSortModeState(mode);
        try {
            localStorage.setItem(STORAGE_KEY, mode);
            // 同步到 URL，方便分享連結
            const url = new URL(window.location.href);
            if (mode === 'shuffle') url.searchParams.delete(QUERY_KEY);
            else url.searchParams.set(QUERY_KEY, mode);
            window.history.replaceState({}, '', url.toString());
        } catch {
            // ignore
        }
    }, []);

    // 跨分頁同步：A 改了 B 也跟著動
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY && e.newValue && (VALID as readonly string[]).includes(e.newValue)) {
                setSortModeState(e.newValue as SortMode);
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const sortedSongs = useMemo(() => {
        switch (sortMode) {
            case 'votes':
                return [...songs].sort((a, b) => b.voteCount - a.voteCount);
            case 'newest':
                return [...songs].sort(
                    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
                );
            case 'alphabet':
                // zh-Hant 比較器，正確處理中英混排
                return [...songs].sort((a, b) =>
                    a.title.localeCompare(b.title, 'zh-Hant')
                );
            case 'shuffle':
            default:
                return shuffleWithSeed(songs, shuffleSeed);
        }
    }, [songs, sortMode, shuffleSeed]);

    return { sortMode, setSortMode, sortedSongs };
}
