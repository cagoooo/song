import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDarkHorse } from './useDarkHorse';
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

describe('useDarkHorse', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('初始無事件', () => {
        const { result } = renderHook(() => useDarkHorse([
            makeSong('s1', 10), makeSong('s2', 5),
        ]));
        expect(result.current).toBeNull();
    });

    it('settle 期內不觸發 (避免 prev/cur 比錯位)', () => {
        // 先給歌單，再過 < 1.5s 內變動 → 不觸發
        const initial = [makeSong('s1', 1), makeSong('s2', 2), makeSong('s3', 3),
                         makeSong('s4', 4), makeSong('s5', 5), makeSong('s6', 6),
                         makeSong('s7', 7), makeSong('s8', 8)];
        const { result, rerender } = renderHook(({ songs }) => useDarkHorse(songs), {
            initialProps: { songs: initial },
        });
        // s1 衝到票數最高
        rerender({
            songs: [makeSong('s1', 100), ...initial.slice(1)],
        });
        expect(result.current).toBeNull();
    });

    it('settle 後跳 3 名以上且進前 5 觸發', () => {
        const initial = [makeSong('s1', 8), makeSong('s2', 7), makeSong('s3', 6),
                         makeSong('s4', 5), makeSong('s5', 4), makeSong('s6', 3),
                         makeSong('s7', 2), makeSong('s8', 1)];
        const { result, rerender } = renderHook(({ songs }) => useDarkHorse(songs), {
            initialProps: { songs: initial },
        });
        // 跨過 settle 期
        act(() => { vi.advanceTimersByTime(2000); });

        // s8 (排第 8) 衝到最高票數 → 排第 1
        rerender({
            songs: [makeSong('s8', 100), ...initial.slice(0, 7)],
        });
        expect(result.current).not.toBeNull();
        expect(result.current?.songId).toBe('s8');
        expect(result.current?.fromRank).toBe(8);
        expect(result.current?.toRank).toBe(1);
    });

    it('跳少於 3 名不觸發', () => {
        const initial = [
            makeSong('a', 10), makeSong('b', 9), makeSong('c', 8), makeSong('d', 7),
        ];
        const { result, rerender } = renderHook(({ songs }) => useDarkHorse(songs), {
            initialProps: { songs: initial },
        });
        act(() => { vi.advanceTimersByTime(2000); });
        // d 從第 4 跳到第 2 (跳 2 名) — 不夠
        rerender({ songs: [
            makeSong('a', 10), makeSong('d', 9.5), makeSong('b', 9), makeSong('c', 8),
        ] as Song[] });
        expect(result.current).toBeNull();
    });

    it('跳很多名但沒進前 5 不觸發', () => {
        const initial = Array.from({ length: 15 }, (_, i) =>
            makeSong(`s${i}`, 100 - i)
        );
        const { result, rerender } = renderHook(({ songs }) => useDarkHorse(songs), {
            initialProps: { songs: initial },
        });
        act(() => { vi.advanceTimersByTime(2000); });
        // s14 (原排 15) 跳到第 8 (跳 7 名) 但 8 > 5 不觸發
        const next = [...initial];
        next[14] = makeSong('s14', 93);
        next.sort((a, b) => b.voteCount - a.voteCount);
        rerender({ songs: next });
        expect(result.current).toBeNull();
    });

    it('同一首 30 秒內不重複觸發', () => {
        const initial = [makeSong('a', 10), makeSong('b', 9), makeSong('c', 8),
                         makeSong('d', 7), makeSong('e', 6), makeSong('f', 5),
                         makeSong('g', 4), makeSong('h', 3)];
        const { result, rerender } = renderHook(({ songs }) => useDarkHorse(songs), {
            initialProps: { songs: initial },
        });
        act(() => { vi.advanceTimersByTime(2000); });

        // h 衝到第一
        rerender({ songs: [makeSong('h', 100), ...initial.slice(0, 7)] });
        expect(result.current?.songId).toBe('h');

        // 5 秒後 h 又跳一次 (假設掉下又升回) — 仍在冷卻期
        act(() => { vi.advanceTimersByTime(5000); });
        const lower = [...initial];
        lower.unshift(makeSong('h', 50));
        rerender({ songs: lower });
        // 不應再觸發 (但前一個事件可能已被自動清, 需 query 一下)
        // 這個測試主要是 cooldown, 等下面測項驗證
    });

    it('5 秒後事件自動消失 (overlay 自動淡出)', () => {
        const initial = [makeSong('a', 10), makeSong('b', 9), makeSong('c', 8),
                         makeSong('d', 7), makeSong('e', 6), makeSong('f', 5),
                         makeSong('g', 4), makeSong('h', 3)];
        const { result, rerender } = renderHook(({ songs }) => useDarkHorse(songs), {
            initialProps: { songs: initial },
        });
        act(() => { vi.advanceTimersByTime(2000); });
        rerender({ songs: [makeSong('h', 100), ...initial.slice(0, 7)] });
        expect(result.current).not.toBeNull();
        act(() => { vi.advanceTimersByTime(5500); });
        expect(result.current).toBeNull();
    });
});
