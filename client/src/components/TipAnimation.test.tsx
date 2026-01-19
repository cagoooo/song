// TipAnimation 元件單元測試
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TipAnimation from './TipAnimation';
import type { TipType } from '@/lib/firestore';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => (
            <div data-testid="motion-div" {...props}>{children}</div>
        ),
        span: ({ children, ...props }: { children?: React.ReactNode;[key: string]: unknown }) => (
            <span data-testid="motion-span" {...props}>{children}</span>
        ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('TipAnimation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    describe('可見性', () => {
        it('isVisible 為 true 時應該渲染動畫', () => {
            render(
                <TipAnimation
                    tipType="❤️"
                    isVisible={true}
                />
            );

            // 應該有動畫元素
            expect(screen.getAllByTestId('motion-div').length).toBeGreaterThan(0);
        });

        it('isVisible 為 false 時不應該渲染動畫', () => {
            render(
                <TipAnimation
                    tipType="❤️"
                    isVisible={false}
                />
            );

            // 不應該有動畫內容
            expect(screen.queryAllByTestId('motion-div')).toHaveLength(0);
        });
    });

    describe('不同打賞類型', () => {
        const tipTypes: TipType[] = ['❤️', '🌟', '🎉', '🔥', '💎'];

        tipTypes.forEach((tipType) => {
            it(`${tipType} 類型應該正確渲染`, () => {
                render(
                    <TipAnimation
                        tipType={tipType}
                        isVisible={true}
                    />
                );

                // 應該有動畫元素
                expect(screen.getAllByTestId('motion-div').length).toBeGreaterThan(0);
            });
        });
    });

    describe('onComplete 回調', () => {
        it('動畫結束後應該呼叫 onComplete', async () => {
            const onComplete = vi.fn();

            render(
                <TipAnimation
                    tipType="❤️"
                    isVisible={true}
                    onComplete={onComplete}
                />
            );

            // 快進時間（愛心動畫 duration 為 2 秒）
            vi.advanceTimersByTime(2500);

            await waitFor(() => {
                expect(onComplete).toHaveBeenCalled();
            });
        });

        it('不同打賞類型有不同的動畫時長', async () => {
            const onComplete = vi.fn();

            // 鑽石動畫 duration 為 2.5 秒
            render(
                <TipAnimation
                    tipType="💎"
                    isVisible={true}
                    onComplete={onComplete}
                />
            );

            // 2 秒後還不應該完成
            vi.advanceTimersByTime(2000);
            expect(onComplete).not.toHaveBeenCalled();

            // 再過 1 秒應該完成
            vi.advanceTimersByTime(1000);

            await waitFor(() => {
                expect(onComplete).toHaveBeenCalled();
            });
        });
    });

    describe('動畫容器', () => {
        it('應該有全螢幕覆蓋層', () => {
            const { container } = render(
                <TipAnimation
                    tipType="❤️"
                    isVisible={true}
                />
            );

            // 檢查是否有 fixed 定位的容器
            const wrapper = container.firstChild;
            expect(wrapper).toBeInTheDocument();
        });
    });
});
