// 模糊搜尋 Hook - 支援容錯搜尋
import { useMemo, useCallback } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Song } from '@/lib/firestore';

interface FuzzySearchOptions {
    threshold?: number;
    distance?: number;
    includeScore?: boolean;
}

interface UseFuzzySearchReturn {
    search: (term: string) => Song[];
    fuse: Fuse<Song>;
}

const DEFAULT_OPTIONS: IFuseOptions<Song> = {
    keys: [
        { name: 'title', weight: 2 },
        { name: 'artist', weight: 1 },
    ],
    threshold: 0.4,
    distance: 100,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 1,
};

/**
 * 模糊搜尋 Hook
 * 支援容錯搜尋，可以搜尋相似的歌曲標題和歌手名稱
 * 
 * @param songs - 歌曲列表
 * @param options - Fuse.js 選項
 * @returns search 函式和 fuse 實例
 * 
 * @example
 * const { search } = useFuzzySearch(songs);
 * const results = search('告白'); // 搜尋 "告白"
 */
export function useFuzzySearch(
    songs: Song[],
    options: FuzzySearchOptions = {}
): UseFuzzySearchReturn {
    // 建立 Fuse 實例
    const fuse = useMemo(() => {
        const fuseOptions: IFuseOptions<Song> = {
            ...DEFAULT_OPTIONS,
            threshold: options.threshold ?? DEFAULT_OPTIONS.threshold,
            distance: options.distance ?? DEFAULT_OPTIONS.distance,
            includeScore: options.includeScore ?? DEFAULT_OPTIONS.includeScore,
        };
        return new Fuse(songs, fuseOptions);
    }, [songs, options.threshold, options.distance, options.includeScore]);

    // 搜尋函式
    const search = useCallback((term: string): Song[] => {
        if (!term.trim()) {
            return songs;
        }

        const results = fuse.search(term);
        return results.map((result) => result.item);
    }, [fuse, songs]);

    return { search, fuse };
}

export default useFuzzySearch;
