// useHapticFeedback Hook 測試
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHapticFeedback } from './useHapticFeedback';

describe('useHapticFeedback', () => {
    let vibrateMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vibrateMock = vi.fn().mockReturnValue(true);

        // 模擬支援 vibrate 的瀏覽器
        Object.defineProperty(navigator, 'vibrate', {
            writable: true,
            configurable: true,
            value: vibrateMock,
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('瀏覽器支援檢測', () => {
        it('當瀏覽器支援 vibrate 時 isSupported 應為 true', () => {
            const { result } = renderHook(() => useHapticFeedback());
            expect(result.current.isSupported).toBe(true);
        });

        it('當瀏覽器不支援 vibrate 時 isSupported 應為 false', () => {
            // 使用新的 hook 實例，在 navigator 沒有 vibrate 的環境下
            const originalVibrate = navigator.vibrate;
            // @ts-ignore - 用於測試
            delete (navigator as any).vibrate;

            const { result } = renderHook(() => useHapticFeedback());
            expect(result.current.isSupported).toBe(false);

            // 恢復
            Object.defineProperty(navigator, 'vibrate', {
                writable: true,
                configurable: true,
                value: originalVibrate,
            });
        });
    });

    describe('trigger 函式', () => {
        it('呼叫 trigger("light") 應觸發輕微震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.trigger('light');
            });

            expect(vibrateMock).toHaveBeenCalledWith(10);
        });

        it('呼叫 trigger("medium") 應觸發中等震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.trigger('medium');
            });

            expect(vibrateMock).toHaveBeenCalledWith(25);
        });

        it('呼叫 trigger("heavy") 應觸發強烈震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.trigger('heavy');
            });

            expect(vibrateMock).toHaveBeenCalledWith(50);
        });

        it('呼叫 trigger("success") 應觸發成功模式震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.trigger('success');
            });

            expect(vibrateMock).toHaveBeenCalledWith([10, 50, 10]);
        });

        it('呼叫 trigger("warning") 應觸發警告模式震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.trigger('warning');
            });

            expect(vibrateMock).toHaveBeenCalledWith([30, 50, 30]);
        });

        it('呼叫 trigger("error") 應觸發錯誤模式震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.trigger('error');
            });

            expect(vibrateMock).toHaveBeenCalledWith([50, 30, 50, 30, 50]);
        });

        it('預設呼叫 trigger() 應觸發輕微震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.trigger();
            });

            expect(vibrateMock).toHaveBeenCalledWith(10);
        });

        it('不支援時呼叫 trigger 應返回 false', () => {
            Object.defineProperty(navigator, 'vibrate', {
                writable: true,
                configurable: true,
                value: undefined,
            });

            const { result } = renderHook(() => useHapticFeedback());

            let returnValue: boolean | undefined;
            act(() => {
                returnValue = result.current.trigger('light');
            });

            expect(returnValue).toBe(false);
        });
    });

    describe('快捷方法', () => {
        it('light() 應觸發輕微震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.light();
            });

            expect(vibrateMock).toHaveBeenCalledWith(10);
        });

        it('medium() 應觸發中等震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.medium();
            });

            expect(vibrateMock).toHaveBeenCalledWith(25);
        });

        it('success() 應觸發成功模式震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.success();
            });

            expect(vibrateMock).toHaveBeenCalledWith([10, 50, 10]);
        });

        it('error() 應觸發錯誤模式震動', () => {
            const { result } = renderHook(() => useHapticFeedback());

            act(() => {
                result.current.error();
            });

            expect(vibrateMock).toHaveBeenCalledWith([50, 30, 50, 30, 50]);
        });
    });
});
