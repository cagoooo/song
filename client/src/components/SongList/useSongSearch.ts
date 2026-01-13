// 搜尋過濾邏輯 Hook
import { useState, useEffect, useMemo } from 'react';
import type { Song } from '@/lib/firestore';

interface UseSongSearchReturn {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    debouncedSearch: string;
    searchResults: Song[] | null;
    isInSearchMode: boolean;
    filteredSongs: Song[];
}

export function useSongSearch(songs: Song[]): UseSongSearchReturn {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce 搜尋輸入
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // 本地搜尋過濾
    const searchResults = useMemo(() => {
        if (!debouncedSearch.trim()) return null;
        const term = debouncedSearch.toLowerCase();
        return songs.filter(
            (song) =>
                song.title.toLowerCase().includes(term) ||
                song.artist.toLowerCase().includes(term)
        );
    }, [songs, debouncedSearch]);

    // 判斷是否正在搜尋模式
    const isInSearchMode = !!searchTerm.trim();

    // 搜尋時使用結果，否則使用分頁的歌曲列表
    const filteredSongs = useMemo(() => {
        if (debouncedSearch.trim() && searchResults) {
            return searchResults;
        }
        return songs;
    }, [songs, debouncedSearch, searchResults]);

    return {
        searchTerm,
        setSearchTerm,
        debouncedSearch,
        searchResults,
        isInSearchMode,
        filteredSongs,
    };
}
