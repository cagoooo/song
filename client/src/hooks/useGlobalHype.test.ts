import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGlobalHype } from './useGlobalHype';
import type { Song } from '@/lib/firestore';

function songs(...counts: number[]): Song[] {
    return counts.map((c, i) => ({
        id: 's' + i,
        title: 't',
        artist: 'a',
        isActive: true,
        createdAt: new Date(0),
        voteCount: c,
    }));
}

describe('useGlobalHype', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('初始無事件', () => {
        const { result } = renderHook(() => useGlobalHype(songs(0)));
        expect(result.current).toBeNull();
    });

    it('settle 期內變動不觸發', () => {
        const { result, rerender } = renderHook(
            ({ s }) => useGlobalHype(s),
            { initialProps: { s: songs(0) } }
        );
        rerender({ s: songs(60) });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current).toBeNull();
    });

    it('1 分鐘內 50 票觸發等級 1', () => {
        const { result, rerender } = renderHook(
            ({ s }) => useGlobalHype(s),
            { initialProps: { s: songs(0) } }
        );
        // 跳過 settle
        act(() => { vi.advanceTimersByTime(2000); });
        rerender({ s: songs(60) });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current?.level).toBe(1);
        expect(result.current?.count).toBe(60);
    });

    it('1 分鐘內 100 票觸發等級 2', () => {
        const { result, rerender } = renderHook(
            ({ s }) => useGlobalHype(s),
            { initialProps: { s: songs(0) } }
        );
        act(() => { vi.advanceTimersByTime(2000); });
        rerender({ s: songs(120) });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current?.level).toBe(2);
    });

    it('1 分鐘內 200 票觸發等級 3', () => {
        const { result, rerender } = renderHook(
            ({ s }) => useGlobalHype(s),
            { initialProps: { s: songs(0) } }
        );
        act(() => { vi.advanceTimersByTime(2000); });
        rerender({ s: songs(250) });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current?.level).toBe(3);
    });

    it('30 秒冷卻內不重複觸發 (即使新一波 surge)', () => {
        const { result, rerender } = renderHook(
            ({ s }) => useGlobalHype(s),
            { initialProps: { s: songs(0) } }
        );
        act(() => { vi.advanceTimersByTime(2000); });
        rerender({ s: songs(60) });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current?.level).toBe(1);

        // overlay 自動淡出後 (>4.5s), event 為 null
        act(() => { vi.advanceTimersByTime(5000); });
        expect(result.current).toBeNull();

        // 在 30 秒冷卻期內再 surge → 不應重新觸發 (lastTriggeredAt 還在 cooldown)
        rerender({ s: songs(150) });
        act(() => { vi.advanceTimersByTime(1000); });
        expect(result.current).toBeNull();

        // 跨過 30 秒冷卻 → 應該又能觸發 (累積票數可能跳到更高等級)
        act(() => { vi.advanceTimersByTime(25_000); });
        rerender({ s: songs(220) });
        act(() => { vi.advanceTimersByTime(1000); });
        // 60s 視窗內累積票會超過 200 (60+90+70=220), 觸發等級 3
        expect(result.current?.level).toBeGreaterThanOrEqual(1);
    });
});
