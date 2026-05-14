// 搜尋過濾邏輯 Hook - 支援模糊搜尋 + 拼音/注音/歌詞片段
import { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Song } from '@/lib/firestore';

// pinyin-pro 字典 ~216KB raw / 138KB gzip — 改為動態載入，
// 避免阻塞首屏。Module-level 快取確保只 fetch 一次。
type PinyinModule = typeof import('pinyin-pro');
let pinyinModulePromise: Promise<PinyinModule> | null = null;
function loadPinyinModule(): Promise<PinyinModule> {
    if (!pinyinModulePromise) {
        pinyinModulePromise = import('pinyin-pro');
    }
    return pinyinModulePromise;
}

/** 將中文轉成無音調拼音 (空白分隔), 支援多音字 + 加聲母前綴 (gbqz) 方便注音輸入法用戶 */
function toPinyin(s: string, mod: PinyinModule | null): string {
    if (!s || !mod) return '';
    try {
        const py = mod.pinyin(s, { toneType: 'none', type: 'string', nonZh: 'consecutive' }).toLowerCase();
        // 順便加首字母組合 (gbq → 「告白氣球」), 涵蓋一些使用者只記住聲母的場景
        const initials = mod.pinyin(s, { pattern: 'first', type: 'string', toneType: 'none', nonZh: 'consecutive' }).toLowerCase();
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
    const [searchTerm, setSearchTermState] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isFuzzyMode, setIsFuzzyMode] = useState(options.useFuzzySearch ?? true);
    // pinyin-pro 動態載入後存到 state，觸發 enrichedSongs 重新計算
    const [pinyinMod, setPinyinMod] = useState<PinyinModule | null>(null);

    // 閒置時間預先載入 pinyin-pro（不阻塞首屏，但通常在使用者搜尋前就準備好）
    useEffect(() => {
        if (typeof window === 'undefined' || pinyinMod) return;
        let cancelled = false;
        const trigger = () => {
            loadPinyinModule().then((mod) => {
                if (!cancelled) setPinyinMod(mod);
            }).catch(() => {
                // 載入失敗時 fallback 為純精確搜尋，不影響核心功能
            });
        };
        const win = window as Window & {
            requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
            cancelIdleCallback?: (id: number) => void;
        };
        if (typeof win.requestIdleCallback === 'function') {
            const id = win.requestIdleCallback(trigger, { timeout: 3000 });
            return () => {
                cancelled = true;
                win.cancelIdleCallback?.(id);
            };
        }
        const id = window.setTimeout(trigger, 1500);
        return () => {
            cancelled = true;
            window.clearTimeout(id);
        };
    }, [pinyinMod]);

    // 使用者搜尋時若模組還沒到位，立刻強制觸發載入（不等 idle）
    const setSearchTerm = useCallback((term: string) => {
        if (term && !pinyinMod) {
            loadPinyinModule().then((mod) => setPinyinMod(mod)).catch(() => {});
        }
        setSearchTermState(term);
    }, [pinyinMod]);

    // 預先計算每首歌的拼音 (含首字母), 比對時 Fuse.js 多欄一起 fuzzy
    // 純中文歌曲 1000 首 ≈ 50-100ms 一次性計算; useMemo 確保只算一次
    // 在 pinyinMod 載入前 _titlePy/_artistPy 為空，Fuse 仍可用 title/artist 比對
    const enrichedSongs = useMemo<SongWithPhonetic[]>(
        () => songs.map((s) => ({
            ...s,
            _titlePy: toPinyin(s.title, pinyinMod),
            _artistPy: toPinyin(s.artist, pinyinMod),
        })),
        [songs, pinyinMod]
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
