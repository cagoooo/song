// ErrorBoundary 元件單元測試
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

// 測試用的會拋出錯誤的元件
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
        throw new Error('測試錯誤訊息');
    }
    return <div data-testid="child-content">正常內容</div>;
};

// 抑制錯誤邊界的 console.error
const originalConsoleError = console.error;

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // 抑制 React 錯誤邊界的 console.error
        console.error = vi.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
        vi.clearAllMocks();
    });

    describe('正常狀態', () => {
        it('應該正常渲染 children', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={false} />
                </ErrorBoundary>
            );

            expect(screen.getByTestId('child-content')).toBeInTheDocument();
            expect(screen.getByText('正常內容')).toBeInTheDocument();
        });

        it('應該渲染多個 children', () => {
            render(
                <ErrorBoundary>
                    <div data-testid="child-1">子元件 1</div>
                    <div data-testid="child-2">子元件 2</div>
                </ErrorBoundary>
            );

            expect(screen.getByTestId('child-1')).toBeInTheDocument();
            expect(screen.getByTestId('child-2')).toBeInTheDocument();
        });
    });

    describe('錯誤處理', () => {
        it('當子元件拋出錯誤時應該顯示錯誤畫面', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            // 應該不顯示正常內容
            expect(screen.queryByTestId('child-content')).not.toBeInTheDocument();

            // 應該顯示錯誤畫面
            expect(screen.getByText('😵 發生錯誤')).toBeInTheDocument();
            expect(screen.getByText(/很抱歉，應用程式遇到了一些問題/)).toBeInTheDocument();
        });

        it('應該顯示重新載入按鈕', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByRole('button', { name: /重新載入/i })).toBeInTheDocument();
        });

        it('應該顯示再試一次按鈕', () => {
            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByRole('button', { name: /再試一次/i })).toBeInTheDocument();
        });
    });

    describe('自訂 fallback', () => {
        it('應該使用自訂 fallback 元件', () => {
            const CustomFallback = <div data-testid="custom-fallback">自訂錯誤畫面</div>;

            render(
                <ErrorBoundary fallback={CustomFallback}>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
            expect(screen.getByText('自訂錯誤畫面')).toBeInTheDocument();
            // 不應該顯示預設錯誤畫面
            expect(screen.queryByText('😵 發生錯誤')).not.toBeInTheDocument();
        });
    });

    describe('按鈕互動', () => {
        it('點擊重新載入應該呼叫 window.location.reload', () => {
            // Mock window.location.reload
            const mockReload = vi.fn();
            Object.defineProperty(window, 'location', {
                value: { reload: mockReload },
                writable: true,
            });

            render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            fireEvent.click(screen.getByRole('button', { name: /重新載入/i }));
            expect(mockReload).toHaveBeenCalledTimes(1);
        });

        it('點擊再試一次應該嘗試重新渲染', () => {
            const { rerender } = render(
                <ErrorBoundary>
                    <ThrowError shouldThrow={true} />
                </ErrorBoundary>
            );

            // 確認顯示錯誤畫面
            expect(screen.getByText('😵 發生錯誤')).toBeInTheDocument();

            // 點擊再試一次
            fireEvent.click(screen.getByRole('button', { name: /再試一次/i }));

            // 注意：由於 ThrowError 仍然會拋出錯誤，錯誤畫面會再次顯示
            // 但這裡主要測試 handleReset 被正確觸發
            // 重新渲染時不拋出錯誤
            rerender(
                <ErrorBoundary>
                    <ThrowError shouldThrow={false} />
                </ErrorBoundary>
            );

            // 現在應該顯示正常內容
            expect(screen.getByTestId('child-content')).toBeInTheDocument();
        });
    });
});
