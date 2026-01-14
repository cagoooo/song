// 搜尋過濾邏輯 Hook - 支援模糊搜尋
import { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Song } from '@/lib/firestore';

interface UseSongSearchOptions {
    useFuzzySearch?: boolean;
    fuzzyThreshold?: number;
}

interface UseSongSearchReturn {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    debouncedSearch: string;
    searchResults: Song[] | null;
    isInSearchMode: boolean;
    filteredSongs: Song[];
    isFuzzyMode: boolean;
    toggleFuzzyMode: () => void;
}

// Fuse.js 預設選項
const FUSE_OPTIONS: IFuseOptions<Song> = {
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

export function useSongSearch(
    songs: Song[],
    options: UseSongSearchOptions = {}
): UseSongSearchReturn {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isFuzzyMode, setIsFuzzyMode] = useState(options.useFuzzySearch ?? true);

    // 建立 Fuse 實例
    const fuse = useMemo(() => new Fuse(songs, {
        ...FUSE_OPTIONS,
        threshold: options.fuzzyThreshold ?? FUSE_OPTIONS.threshold,
    }), [songs, options.fuzzyThreshold]);

    // Debounce 搜尋輸入
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 精確搜尋（原始邏輯）
    const exactSearchResults = useMemo(() => {
        if (!debouncedSearch.trim()) return null;
        const term = debouncedSearch.toLowerCase();
        return songs.filter(
            (song) =>
                song.title.toLowerCase().includes(term) ||
                song.artist.toLowerCase().includes(term)
        );
    }, [songs, debouncedSearch]);

    // 模糊搜尋
    const fuzzySearchResults = useMemo(() => {
        if (!debouncedSearch.trim()) return null;
        return fuse.search(debouncedSearch).map((result) => result.item);
    }, [fuse, debouncedSearch]);

    // 根據模式選擇搜尋結果
    const searchResults = useMemo(() => {
        if (!debouncedSearch.trim()) return null;
        return isFuzzyMode ? fuzzySearchResults : exactSearchResults;
    }, [debouncedSearch, isFuzzyMode, fuzzySearchResults, exactSearchResults]);

    // 判斷是否正在搜尋模式
    const isInSearchMode = !!searchTerm.trim();

    // 搜尋時使用結果，否則使用分頁的歌曲列表
    const filteredSongs = useMemo(() => {
        if (debouncedSearch.trim() && searchResults) {
            return searchResults;
        }
        return songs;
    }, [songs, debouncedSearch, searchResults]);

    // 切換模糊搜尋模式
    const toggleFuzzyMode = useCallback(() => {
        setIsFuzzyMode((prev) => !prev);
    }, []);

    return {
        searchTerm,
        setSearchTerm,
        debouncedSearch,
        searchResults,
        isInSearchMode,
        filteredSongs,
        isFuzzyMode,
        toggleFuzzyMode,
    };
}
