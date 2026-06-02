// useWideColumns 測試 — 超寬螢幕欄數
import { renderHook, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useWideColumns } from './useWideColumns';

let listeners: Array<() => void>;
function mockMatchMedia(matches: boolean) {
    listeners = [];
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches,
            media: query,
            addEventListener: (_: string, cb: () => void) => listeners.push(cb),
            removeEventListener: vi.fn(),
        })),
    });
}

beforeEach(() => { listeners = []; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('useWideColumns', () => {
    it('一般螢幕（< 1536px）回傳 1 欄', () => {
        mockMatchMedia(false);
        const { result } = renderHook(() => useWideColumns());
        expect(result.current).toBe(1);
    });

    it('超寬螢幕（≥ 1536px / 2xl）回傳 2 欄', () => {
        mockMatchMedia(true);
        const { result } = renderHook(() => useWideColumns());
        expect(result.current).toBe(2);
    });

    it('查詢的是 2xl 斷點 (min-width: 1536px)', () => {
        mockMatchMedia(true);
        renderHook(() => useWideColumns());
        expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1536px)');
    });
});
