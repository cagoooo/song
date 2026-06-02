// useScrollFocusedIntoView 測試 — 行動裝置鍵盤遮擋處理
import { renderHook, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useScrollFocusedIntoView } from './useScrollFocusedIntoView';

// 模擬 visualViewport（jsdom 沒有）
function mockVisualViewport() {
    const listeners: Record<string, Array<() => void>> = {};
    const vv = {
        addEventListener: vi.fn((type: string, cb: () => void) => {
            (listeners[type] ||= []).push(cb);
        }),
        removeEventListener: vi.fn((type: string, cb: () => void) => {
            listeners[type] = (listeners[type] || []).filter((l) => l !== cb);
        }),
        // 測試用：手動觸發某事件
        _fire: (type: string) => (listeners[type] || []).forEach((l) => l()),
    };
    Object.defineProperty(window, 'visualViewport', { writable: true, configurable: true, value: vv });
    return vv;
}

function setMobile(isMobile: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((q: string) => ({
            matches: isMobile && q.includes('coarse'),
            media: q,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    });
    Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: isMobile ? 390 : 1280,
    });
}

let scrollSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.useFakeTimers();
    scrollSpy = vi.fn();
    // jsdom 沒有 scrollIntoView
    (window.HTMLElement.prototype as any).scrollIntoView = scrollSpy;
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    document.body.innerHTML = '';
});

describe('useScrollFocusedIntoView', () => {
    it('enabled=false 時不註冊任何監聽', () => {
        const vv = mockVisualViewport();
        setMobile(true);
        renderHook(() => useScrollFocusedIntoView(false));
        expect(vv.addEventListener).not.toHaveBeenCalled();
    });

    it('桌機（非觸控、大螢幕）不介入', () => {
        const vv = mockVisualViewport();
        setMobile(false);
        renderHook(() => useScrollFocusedIntoView(true));
        expect(vv.addEventListener).not.toHaveBeenCalled();
    });

    it('手機：聚焦輸入框後（延遲 300ms）把欄位捲進可視區中央', () => {
        mockVisualViewport();
        setMobile(true);
        renderHook(() => useScrollFocusedIntoView(true));

        const input = document.createElement('input');
        input.type = 'text';
        document.body.appendChild(input);
        input.focus();

        act(() => {
            input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        });
        // 還沒到延遲時間 → 尚未捲動
        expect(scrollSpy).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(300));
        expect(scrollSpy).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    });

    it('手機：visualViewport resize（鍵盤升起）時把聚焦欄位捲回可視區', () => {
        const vv = mockVisualViewport();
        setMobile(true);
        renderHook(() => useScrollFocusedIntoView(true));

        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.focus();

        act(() => {
            vv._fire('resize');
        });
        expect(scrollSpy).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    });

    it('聚焦非輸入元素時不捲動', () => {
        mockVisualViewport();
        setMobile(true);
        renderHook(() => useScrollFocusedIntoView(true));

        const button = document.createElement('button');
        document.body.appendChild(button);
        button.focus();

        act(() => {
            button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
            vi.advanceTimersByTime(300);
        });
        expect(scrollSpy).not.toHaveBeenCalled();
    });

    it('unmount 後移除 visualViewport 監聽', () => {
        const vv = mockVisualViewport();
        setMobile(true);
        const { unmount } = renderHook(() => useScrollFocusedIntoView(true));
        unmount();
        expect(vv.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
});
