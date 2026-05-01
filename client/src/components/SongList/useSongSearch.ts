// 搜尋過濾邏輯 Hook - 支援模糊搜尋
import { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Song } from '@/lib/firestore';

interface UseSongSearchOptions {
    useFuzzySearch?: boolean;
    fuzzyThreshold?: number;
    /** 已勾選的 tagId 陣列；篩選邏輯為「歌曲必須包含所有勾選的標籤」(AND) */
    selectedTagIds?: string[];
    /** songId → tagId[] 對應表 */
    songTagsMap?: Map<string, string[]>;
}

interface UseSongSearchReturn {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    debouncedSearch: string;
    searchResults: Song[] | null;
    isInSearchMode: boolean;
    /** 是否套用任何過濾（搜尋字串 OR 標籤） */
    isFilteringActive: boolean;
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

    const selectedTagIds = options.selectedTagIds ?? [];
    const songTagsMap = options.songTagsMap;
    const hasTagFilter = selectedTagIds.length > 0;

    // 搜尋時使用結果，否則使用分頁的歌曲列表；再套標籤篩選
    const filteredSongs = useMemo(() => {
        const base = (debouncedSearch.trim() && searchResults) ? searchResults : songs;
        if (!hasTagFilter || !songTagsMap) return base;
        return base.filter((song) => {
            const tagIds = songTagsMap.get(song.id) ?? [];
            // AND 邏輯：所有勾選的 tag 都要在這首歌身上
            return selectedTagIds.every((sel) => tagIds.includes(sel));
        });
    }, [songs, debouncedSearch, searchResults, hasTagFilter, songTagsMap, selectedTagIds]);

    const isFilteringActive = isInSearchMode || hasTagFilter;

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
        isFilteringActive,
        filteredSongs,
        isFuzzyMode,
        toggleFuzzyMode,
    };
}
