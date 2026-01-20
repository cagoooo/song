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

            // 應該顯示錯誤畫面 - 使用 emoji 和標題來查找
            expect(screen.getByText(/😵/)).toBeInTheDocument();
            // 使用更精確的選擇器：標題 h1 中的「發生錯誤」
            expect(screen.getByRole('heading', { name: /發生錯誤/ })).toBeInTheDocument();
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
            // 不應該顯示預設錯誤畫面的 emoji
            expect(screen.queryByText(/😵/)).not.toBeInTheDocument();
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

        it('點擊再試一次應該嘗試重新渲染', async () => {
            // 使用可控制的錯誤狀態
            let shouldThrowError = true;

            const ConditionalThrow = () => {
                if (shouldThrowError) {
                    throw new Error('測試錯誤');
                }
                return <div data-testid="child-content">正常內容</div>;
            };

            const { rerender } = render(
                <ErrorBoundary>
                    <ConditionalThrow />
                </ErrorBoundary>
            );

            // 確認顯示錯誤畫面
            expect(screen.getByText(/😵/)).toBeInTheDocument();

            // 修改狀態為不拋出錯誤
            shouldThrowError = false;

            // 點擊「再試一次」按鈕，這會呼叫 handleReset 清除錯誤狀態並重新渲染
            fireEvent.click(screen.getByRole('button', { name: /再試一次/i }));

            // 因為 shouldThrowError 已經變成 false，重新渲染後應該顯示正常內容
            expect(screen.getByTestId('child-content')).toBeInTheDocument();
            expect(screen.getByText('正常內容')).toBeInTheDocument();
        });
    });
});
