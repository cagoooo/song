import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoteHistory } from './useVoteHistory';

describe('useVoteHistory', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('初始為空', () => {
        const { result } = renderHook(() => useVoteHistory());
        expect(result.current.history).toEqual([]);
        expect(result.current.todayCount).toBe(0);
        expect(result.current.todayUniqueCount).toBe(0);
    });

    it('addVote 應該寫進 localStorage 並更新狀態', () => {
        const { result } = renderHook(() => useVoteHistory());
        act(() => {
            result.current.addVote({ songId: 's1', title: '告白氣球', artist: '周杰倫' });
        });
        expect(result.current.history).toHaveLength(1);
        expect(result.current.history[0].songId).toBe('s1');
        expect(result.current.todayCount).toBe(1);
        expect(result.current.todayUniqueCount).toBe(1);

        // 驗證有寫進 localStorage
        const stored = JSON.parse(localStorage.getItem('song_vote_history_v1')!);
        expect(stored.votes).toHaveLength(1);
    });

    it('多次點同一首：todayCount 累加但 todayUniqueCount 不變', () => {
        const { result } = renderHook(() => useVoteHistory());
        act(() => {
            result.current.addVote({ songId: 's1', title: 'A', artist: 'X' });
            result.current.addVote({ songId: 's1', title: 'A', artist: 'X' });
            result.current.addVote({ songId: 's2', title: 'B', artist: 'Y' });
        });
        expect(result.current.todayCount).toBe(3);
        expect(result.current.todayUniqueCount).toBe(2);
    });

    it('history 上限 50 筆，最新優先', () => {
        const { result } = renderHook(() => useVoteHistory());
        act(() => {
            for (let i = 0; i < 60; i++) {
                result.current.addVote({ songId: `s${i}`, title: `t${i}`, artist: 'x' });
            }
        });
        expect(result.current.history).toHaveLength(50);
        // 最新一筆要在頂端
        expect(result.current.history[0].songId).toBe('s59');
    });

    it('clearHistory 清空一切', () => {
        const { result } = renderHook(() => useVoteHistory());
        act(() => {
            result.current.addVote({ songId: 's1', title: 'a', artist: 'b' });
        });
        act(() => result.current.clearHistory());
        expect(result.current.history).toEqual([]);
        expect(localStorage.getItem('song_vote_history_v1')).toBe('{"votes":[]}');
    });

    it('getLastVoteAt 找到最新一筆，找不到回傳 null', () => {
        const { result } = renderHook(() => useVoteHistory());
        act(() => {
            result.current.addVote({ songId: 's1', title: 'a', artist: 'b' });
        });
        expect(result.current.getLastVoteAt('s1')).toBeTypeOf('number');
        expect(result.current.getLastVoteAt('non-existent')).toBeNull();
    });

    it('localStorage 壞資料應該安全降級為空陣列', () => {
        localStorage.setItem('song_vote_history_v1', 'not valid json');
        const { result } = renderHook(() => useVoteHistory());
        expect(result.current.history).toEqual([]);
    });
});
