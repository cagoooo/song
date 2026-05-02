import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoteSurge } from './useVoteSurge';
import type { Song } from '@/lib/firestore';

function makeSong(id: string, voteCount: number): Song {
    return {
        id,
        title: 't' + id,
        artist: 'a',
        isActive: true,
        createdAt: new Date(0),
        voteCount,
    };
}

describe('useVoteSurge', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('沒有票變動時 surge level 為 0 (空 Map)', () => {
        const songs = [makeSong('s1', 5)];
        const { result } = renderHook(() => useVoteSurge(songs));
        expect(result.current.size).toBe(0);
    });

    it('60 秒內 +5 票觸發等級 1 (微熱)', () => {
        const initial = [makeSong('s1', 0)];
        const { result, rerender } = renderHook(({ songs }) => useVoteSurge(songs), {
            initialProps: { songs: initial },
        });
        rerender({ songs: [makeSong('s1', 5)] });
        // 觸發 tick 重算
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current.get('s1')).toBe(1);
    });

    it('60 秒內 +10 票觸發等級 2 (飆升)', () => {
        const { result, rerender } = renderHook(({ songs }) => useVoteSurge(songs), {
            initialProps: { songs: [makeSong('s1', 0)] },
        });
        rerender({ songs: [makeSong('s1', 10)] });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current.get('s1')).toBe(2);
    });

    it('60 秒內 +20 票觸發等級 3 (爆衝)', () => {
        const { result, rerender } = renderHook(({ songs }) => useVoteSurge(songs), {
            initialProps: { songs: [makeSong('s1', 0)] },
        });
        rerender({ songs: [makeSong('s1', 25)] });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current.get('s1')).toBe(3);
    });

    it('超過 60 秒的事件會被 prune, level 降回 0', () => {
        const { result, rerender } = renderHook(({ songs }) => useVoteSurge(songs), {
            initialProps: { songs: [makeSong('s1', 0)] },
        });
        rerender({ songs: [makeSong('s1', 5)] });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current.get('s1')).toBe(1);

        // 跨過 60 秒視窗
        act(() => { vi.advanceTimersByTime(61_000); });
        expect(result.current.get('s1')).toBeUndefined();
    });

    it('多首歌獨立計算', () => {
        const { result, rerender } = renderHook(({ songs }) => useVoteSurge(songs), {
            initialProps: { songs: [makeSong('s1', 0), makeSong('s2', 0)] },
        });
        rerender({ songs: [makeSong('s1', 5), makeSong('s2', 20)] });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current.get('s1')).toBe(1);
        expect(result.current.get('s2')).toBe(3);
    });
});
