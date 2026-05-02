import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComboCounter, broadcastVote, getMilestone } from './useComboCounter';

const SONG = { songId: 's1', songTitle: 'A', songArtist: 'X' };

describe('getMilestone', () => {
    it('< 3 票回傳 null', () => {
        expect(getMilestone(0)).toBeNull();
        expect(getMilestone(2)).toBeNull();
    });

    it.each([
        [3, 'COMBO'],
        [5, 'GREAT'],
        [10, 'AWESOME'],
        [20, 'INSANE'],
        [50, 'LEGENDARY'],
        [99, 'LEGENDARY'],
    ])('%d 票 → %s', (count, label) => {
        expect(getMilestone(count)?.label).toBe(label);
    });
});

describe('useComboCounter', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('初始狀態為 null', () => {
        const { result } = renderHook(() => useComboCounter());
        expect(result.current.combo).toBeNull();
    });

    it('收到 broadcastVote 事件累計 combo', () => {
        const { result } = renderHook(() => useComboCounter());
        act(() => broadcastVote(SONG.songId, SONG.songTitle, SONG.songArtist));
        expect(result.current.combo?.count).toBe(1);
        act(() => broadcastVote(SONG.songId, SONG.songTitle, SONG.songArtist));
        expect(result.current.combo?.count).toBe(2);
        act(() => broadcastVote(SONG.songId, SONG.songTitle, SONG.songArtist));
        expect(result.current.combo?.count).toBe(3);
    });

    it('換歌會重置 combo', () => {
        const { result } = renderHook(() => useComboCounter());
        act(() => {
            broadcastVote('s1', 'A', 'X');
            broadcastVote('s1', 'A', 'X');
            broadcastVote('s2', 'B', 'Y');
        });
        expect(result.current.combo?.songId).toBe('s2');
        expect(result.current.combo?.count).toBe(1);
    });

    it('間隔超過 3 秒 combo 重置', () => {
        const { result } = renderHook(() => useComboCounter());
        act(() => broadcastVote('s1', 'A', 'X'));
        expect(result.current.combo?.count).toBe(1);
        act(() => { vi.advanceTimersByTime(3500); });
        // 顯示時間 (2.5s) 已過, combo 自動清除為 null
        expect(result.current.combo).toBeNull();

        act(() => broadcastVote('s1', 'A', 'X'));
        expect(result.current.combo?.count).toBe(1); // 重新從 1 開始
    });

    it('連擊期間每 < 3s 投票 count 持續累加', () => {
        const { result } = renderHook(() => useComboCounter());
        act(() => broadcastVote('s1', 'A', 'X'));
        act(() => { vi.advanceTimersByTime(1000); });
        act(() => broadcastVote('s1', 'A', 'X'));
        act(() => { vi.advanceTimersByTime(1000); });
        act(() => broadcastVote('s1', 'A', 'X'));
        expect(result.current.combo?.count).toBe(3);
    });
});
