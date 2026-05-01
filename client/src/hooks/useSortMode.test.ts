import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSortMode } from './useSortMode';
import type { Song } from '@/lib/firestore';

function makeSong(overrides: Partial<Song>): Song {
    return {
        id: overrides.id ?? 'x',
        title: overrides.title ?? 'X',
        artist: overrides.artist ?? 'a',
        isActive: true,
        createdAt: overrides.createdAt ?? new Date(0),
        voteCount: overrides.voteCount ?? 0,
    };
}

const SEED = 12345;

describe('useSortMode', () => {
    let songs: Song[];

    beforeEach(() => {
        localStorage.clear();
        // 清掉 URL query
        window.history.replaceState({}, '', '/');
        songs = [
            makeSong({ id: '1', title: 'C 歌', voteCount: 5, createdAt: new Date('2026-01-01') }),
            makeSong({ id: '2', title: 'A 歌', voteCount: 10, createdAt: new Date('2026-03-01') }),
            makeSong({ id: '3', title: 'B 歌', voteCount: 3, createdAt: new Date('2026-02-01') }),
        ];
    });

    it('預設為 shuffle 模式', () => {
        const { result } = renderHook(() => useSortMode(songs, SEED));
        expect(result.current.sortMode).toBe('shuffle');
        expect(result.current.sortedSongs).toHaveLength(3);
    });

    it('votes 模式：依票數降冪', () => {
        const { result } = renderHook(() => useSortMode(songs, SEED));
        act(() => result.current.setSortMode('votes'));
        const ids = result.current.sortedSongs.map((s) => s.id);
        expect(ids).toEqual(['2', '1', '3']); // 10 > 5 > 3
    });

    it('newest 模式：依 createdAt 降冪', () => {
        const { result } = renderHook(() => useSortMode(songs, SEED));
        act(() => result.current.setSortMode('newest'));
        const ids = result.current.sortedSongs.map((s) => s.id);
        expect(ids).toEqual(['2', '3', '1']); // 3/1 > 2/1 > 1/1
    });

    it('alphabet 模式：依 title 升冪 (zh-Hant)', () => {
        const { result } = renderHook(() => useSortMode(songs, SEED));
        act(() => result.current.setSortMode('alphabet'));
        const titles = result.current.sortedSongs.map((s) => s.title);
        expect(titles[0]).toBe('A 歌');
    });

    it('shuffle 模式：同 seed 兩次結果一致（穩定隨機）', () => {
        const { result: r1 } = renderHook(() => useSortMode(songs, SEED));
        const { result: r2 } = renderHook(() => useSortMode(songs, SEED));
        const ids1 = r1.current.sortedSongs.map((s) => s.id);
        const ids2 = r2.current.sortedSongs.map((s) => s.id);
        expect(ids1).toEqual(ids2);
    });

    it('setSortMode 寫入 localStorage 與 URL', () => {
        const { result } = renderHook(() => useSortMode(songs, SEED));
        act(() => result.current.setSortMode('votes'));
        expect(localStorage.getItem('song_sort_mode_v1')).toBe('votes');
        expect(new URLSearchParams(window.location.search).get('sort')).toBe('votes');
    });

    it('setSortMode 切回 shuffle 會清掉 URL query（避免分享出去亂掉預設）', () => {
        const { result } = renderHook(() => useSortMode(songs, SEED));
        act(() => result.current.setSortMode('votes'));
        act(() => result.current.setSortMode('shuffle'));
        expect(new URLSearchParams(window.location.search).has('sort')).toBe(false);
    });

    it('URL 有 ?sort=votes 時初始化會用該模式', () => {
        window.history.replaceState({}, '', '/?sort=votes');
        const { result } = renderHook(() => useSortMode(songs, SEED));
        expect(result.current.sortMode).toBe('votes');
    });

    it('localStorage 有壞值時降回 shuffle', () => {
        localStorage.setItem('song_sort_mode_v1', 'NOT_A_VALID_MODE');
        const { result } = renderHook(() => useSortMode(songs, SEED));
        expect(result.current.sortMode).toBe('shuffle');
    });
});
