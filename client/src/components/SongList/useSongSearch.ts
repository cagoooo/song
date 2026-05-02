// 搜尋過濾邏輯 Hook - 支援模糊搜尋 + 拼音/注音/歌詞片段
import { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import { pinyin } from 'pinyin-pro';
import type { Song } from '@/lib/firestore';

/** 將中文轉成無音調拼音 (空白分隔), 支援多音字 + 加聲母前綴 (gbqz) 方便注音輸入法用戶 */
function toPinyin(s: string): string {
    if (!s) return '';
    try {
        const py = pinyin(s, { toneType: 'none', type: 'string', nonZh: 'consecutive' }).toLowerCase();
        // 順便加首字母組合 (gbq → 「告白氣球」), 涵蓋一些使用者只記住聲母的場景
        const initials = pinyin(s, { pattern: 'first', type: 'string', toneType: 'none', nonZh: 'consecutive' }).toLowerCase();
        return `${py} ${initials}`;
    } catch {
        return '';
    }
}

interface SongWithPhonetic extends Song {
    /** internal — 拼音 (no tone) + 首字母, 用於 Fuse 搜尋 */
    _titlePy?: string;
    _artistPy?: string;
}

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

// Fuse.js 預設選項 — 中文標題 + 歌手 + 拼音 + 首字母 + 歌詞片段
const FUSE_OPTIONS: IFuseOptions<SongWithPhonetic> = {
    keys: [
        { name: 'title', weight: 2.5 },
        { name: 'artist', weight: 1.2 },
        { name: '_titlePy', weight: 1.5 },
        { name: '_artistPy', weight: 0.8 },
        { name: 'lyrics', weight: 0.3 },
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

    // 預先計算每首歌的拼音 (含首字母), 比對時 Fuse.js 多欄一起 fuzzy
    // 純中文歌曲 1000 首 ≈ 50-100ms 一次性計算; useMemo 確保只算一次
    const enrichedSongs = useMemo<SongWithPhonetic[]>(
        () => songs.map((s) => ({
            ...s,
            _titlePy: toPinyin(s.title),
            _artistPy: toPinyin(s.artist),
        })),
        [songs]
    );

    // 建立 Fuse 實例
    const fuse = useMemo(() => new Fuse(enrichedSongs, {
        ...FUSE_OPTIONS,
        threshold: options.fuzzyThreshold ?? FUSE_OPTIONS.threshold,
    }), [enrichedSongs, options.fuzzyThreshold]);

    // Debounce 搜尋輸入
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 精確搜尋（原始邏輯, 順手加歌詞片段）
    const exactSearchResults = useMemo(() => {
        if (!debouncedSearch.trim()) return null;
        const term = debouncedSearch.toLowerCase();
        return songs.filter((song) => {
            if (song.title.toLowerCase().includes(term)) return true;
            if (song.artist.toLowerCase().includes(term)) return true;
            if (song.lyrics?.toLowerCase().includes(term)) return true;
            return false;
        });
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
