// useReduceMotion Hook 測試
import { renderHook, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useReduceMotion } from './useReduceMotion';

describe('useReduceMotion', () => {
    let matchMediaMock: ReturnType<typeof vi.fn>;
    let addEventListenerSpy: ReturnType<typeof vi.fn>;
    let removeEventListenerSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        addEventListenerSpy = vi.fn();
        removeEventListenerSpy = vi.fn();

        matchMediaMock = vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            addEventListener: addEventListenerSpy,
            removeEventListener: removeEventListenerSpy,
        }));

        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: matchMediaMock,
        });

        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            value: 1024,
        });
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    describe('prefers-reduced-motion 檢測', () => {
        it('預設應該返回 false（桌面版不減少動畫）', () => {
            const { result } = renderHook(() =>
                useReduceMotion({ reduceOnMobile: false })
            );
            expect(result.current).toBe(false);
        });

        it('當用戶設定 prefers-reduced-motion: reduce 時應返回 true', () => {
            matchMediaMock.mockImplementation((query: string) => ({
                matches: query === '(prefers-reduced-motion: reduce)',
                media: query,
                addEventListener: addEventListenerSpy,
                removeEventListener: removeEventListenerSpy,
            }));

            const { result } = renderHook(() =>
                useReduceMotion({ reduceOnMobile: false })
            );
            expect(result.current).toBe(true);
        });
    });

    describe('手機裝置檢測', () => {
        it('手機螢幕寬度應該觸發減少動畫（預設行為）', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 375, // 手機寬度
            });

            const { result } = renderHook(() => useReduceMotion());
            expect(result.current).toBe(true);
        });

        it('桌面螢幕寬度不應觸發減少動畫', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 1920, // 桌面寬度
            });

            const { result } = renderHook(() => useReduceMotion());
            expect(result.current).toBe(false);
        });

        it('reduceOnMobile: false 時手機也不減少動畫', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 375,
            });

            const { result } = renderHook(() =>
                useReduceMotion({ reduceOnMobile: false })
            );
            expect(result.current).toBe(false);
        });

        it('應該支援自訂 mobileBreakpoint', () => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                value: 600,
            });

            // 預設 768px，600px 應該視為手機
            const { result: result1 } = renderHook(() => useReduceMotion());
            expect(result1.current).toBe(true);

            cleanup();

            // 自訂 breakpoint 為 500px，600px 不應該視為手機
            const { result: result2 } = renderHook(() =>
                useReduceMotion({ mobileBreakpoint: 500 })
            );
            expect(result2.current).toBe(false);
        });
    });

    describe('事件監聽', () => {
        it('應該添加 matchMedia 變化監聽器', () => {
            renderHook(() => useReduceMotion());

            expect(addEventListenerSpy).toHaveBeenCalledWith(
                'change',
                expect.any(Function)
            );
        });

        it('當 reduceOnMobile 為 true 時應該添加 resize 監聽器', () => {
            const resizeAddSpy = vi.spyOn(window, 'addEventListener');

            renderHook(() => useReduceMotion({ reduceOnMobile: true }));

            expect(resizeAddSpy).toHaveBeenCalledWith(
                'resize',
                expect.any(Function)
            );

            resizeAddSpy.mockRestore();
        });

        it('cleanup 時應該移除監聽器', () => {
            const resizeRemoveSpy = vi.spyOn(window, 'removeEventListener');

            const { unmount } = renderHook(() => useReduceMotion());
            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalled();
            expect(resizeRemoveSpy).toHaveBeenCalledWith(
                'resize',
                expect.any(Function)
            );

            resizeRemoveSpy.mockRestore();
        });
    });
});
