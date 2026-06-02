// mySuggestions 測試 —「我的推薦」本機追蹤
import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let mod: typeof import('./mySuggestions');

beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    mod = await import('./mySuggestions');
});

afterEach(() => {
    cleanup();
    localStorage.clear();
});

function entry(id: string, over: Partial<import('./mySuggestions').MySuggestionEntry> = {}) {
    return { id, title: 't' + id, artist: 'a', ts: 1, seenStatus: 'pending', ...over };
}

describe('mySuggestions', () => {
    it('addMySuggestion 新增、同 id 不重複', () => {
        mod.addMySuggestion(entry('x1'));
        mod.addMySuggestion(entry('x1')); // 重複
        mod.addMySuggestion(entry('x2'));
        const { result } = renderHook(() => mod.useMySuggestions());
        expect(result.current.map((e) => e.id).sort()).toEqual(['x1', 'x2']);
    });

    it('useMySuggestions 隨新增即時更新', () => {
        const { result } = renderHook(() => mod.useMySuggestions());
        expect(result.current).toHaveLength(0);
        act(() => mod.addMySuggestion(entry('a1')));
        expect(result.current).toHaveLength(1);
        expect(result.current[0].id).toBe('a1');
    });

    it('markSeenStatus 更新狀態', () => {
        mod.addMySuggestion(entry('m1'));
        const { result } = renderHook(() => mod.useMySuggestions());
        act(() => mod.markSeenStatus('m1', 'approved'));
        expect(result.current[0].seenStatus).toBe('approved');
    });

    it('removeMySuggestion 移除', () => {
        mod.addMySuggestion(entry('r1'));
        mod.addMySuggestion(entry('r2'));
        const { result } = renderHook(() => mod.useMySuggestions());
        act(() => mod.removeMySuggestion('r1'));
        expect(result.current.map((e) => e.id)).toEqual(['r2']);
    });

    it('getSnapshot 回傳穩定參考（同內容不換 reference）', () => {
        mod.addMySuggestion(entry('s1'));
        const { result, rerender } = renderHook(() => mod.useMySuggestions());
        const first = result.current;
        rerender();
        expect(result.current).toBe(first); // 無變更 → 同參考，避免無限 render
    });

    it('localStorage 壞掉時不丟錯、回空陣列', () => {
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });
        expect(() => mod.addMySuggestion(entry('q1'))).not.toThrow();
        spy.mockRestore();
    });
});
