// suggestionUpvotes 測試 — A2 +1 本機去重
import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

let mod: typeof import('./suggestionUpvotes');

beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    mod = await import('./suggestionUpvotes');
});
afterEach(() => { cleanup(); localStorage.clear(); });

describe('suggestionUpvotes', () => {
    it('初始未附議', () => {
        expect(mod.hasUpvoted('a')).toBe(false);
    });

    it('markUpvoted 後 hasUpvoted=true', () => {
        mod.markUpvoted('a');
        expect(mod.hasUpvoted('a')).toBe(true);
        expect(mod.hasUpvoted('b')).toBe(false);
    });

    it('useHasUpvoted 反應式更新', () => {
        const { result } = renderHook(() => mod.useHasUpvoted('x'));
        expect(result.current).toBe(false);
        act(() => mod.markUpvoted('x'));
        expect(result.current).toBe(true);
    });

    it('重複 markUpvoted 不重複（去重）', () => {
        mod.markUpvoted('a');
        mod.markUpvoted('a');
        const stored = JSON.parse(localStorage.getItem('song-upvoted-v1') || '[]');
        expect(stored).toEqual(['a']);
    });

    it('持久化到 localStorage、跨載入保留', async () => {
        mod.markUpvoted('keep');
        vi.resetModules();
        const reloaded = await import('./suggestionUpvotes');
        expect(reloaded.hasUpvoted('keep')).toBe(true);
    });

    it('localStorage 壞掉不丟錯', () => {
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
        expect(() => mod.markUpvoted('q')).not.toThrow();
        spy.mockRestore();
    });
});
