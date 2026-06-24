// OpeningCurtain 單元測試 — 6 秒鏡像反向開場儀式
// 📐 設計文件：docs/design/T2-ritual-modal-tests.md

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OpeningCurtain } from './OpeningCurtain';

describe('OpeningCurtain', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('開關狀態', () => {
        it('isOpen=false 不渲染 overlay', () => {
            render(<OpeningCurtain isOpen={false} onClose={() => {}} />);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('isOpen=true 渲染 dialog role + aria-label', () => {
            render(<OpeningCurtain isOpen={true} onClose={() => {}} />);
            const dialog = screen.getByRole('dialog');
            expect(dialog).toBeInTheDocument();
            expect(dialog).toHaveAttribute('aria-modal', 'true');
            expect(dialog).toHaveAttribute('aria-label', '演出開場儀式');
        });
    });

    describe('副標 songCount', () => {
        it('songCount > 0 → 顯示「Side A · N 首歌 · 一起點播」', () => {
            render(<OpeningCurtain isOpen={true} onClose={() => {}} songCount={22} />);
            expect(screen.getByText('Side A · 22 首歌 · 一起點播')).toBeInTheDocument();
        });

        it('songCount=0 → 顯示「Side A · 一起點播」', () => {
            render(<OpeningCurtain isOpen={true} onClose={() => {}} songCount={0} />);
            expect(screen.getByText('Side A · 一起點播')).toBeInTheDocument();
        });

        it('未傳 songCount → 顯示預設副標', () => {
            render(<OpeningCurtain isOpen={true} onClose={() => {}} />);
            expect(screen.getByText('Side A · 一起點播')).toBeInTheDocument();
        });
    });

    describe('關閉觸發', () => {
        it('按 Escape 觸發 onClose', () => {
            const onClose = vi.fn();
            render(<OpeningCurtain isOpen={true} onClose={onClose} />);
            fireEvent.keyDown(window, { key: 'Escape' });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('按其他鍵不觸發 onClose', () => {
            const onClose = vi.fn();
            render(<OpeningCurtain isOpen={true} onClose={onClose} />);
            fireEvent.keyDown(window, { key: 'Enter' });
            fireEvent.keyDown(window, { key: ' ' });
            fireEvent.keyDown(window, { key: 'a' });
            expect(onClose).not.toHaveBeenCalled();
        });

        it('點「跳過儀式」按鈕觸發 onClose', () => {
            const onClose = vi.fn();
            render(<OpeningCurtain isOpen={true} onClose={onClose} />);
            fireEvent.click(screen.getByLabelText('跳過開場儀式'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('自動關閉計時器', () => {
        it('6 秒後自動 onClose', () => {
            const onClose = vi.fn();
            render(<OpeningCurtain isOpen={true} onClose={onClose} />);
            // 5.9s 還沒關
            act(() => {
                vi.advanceTimersByTime(5_900);
            });
            expect(onClose).not.toHaveBeenCalled();
            // 6s 整關
            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('isOpen 從 true → false 後切換不再觸發 onClose（cleanup 正確）', () => {
            const onClose = vi.fn();
            const { rerender } = render(<OpeningCurtain isOpen={true} onClose={onClose} />);
            rerender(<OpeningCurtain isOpen={false} onClose={onClose} />);
            act(() => {
                vi.advanceTimersByTime(10_000);
            });
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    describe('prefers-reduced-motion', () => {
        it('matchMedia reduce-motion → 1 秒後自動 onClose（不是 6 秒）', () => {
            // mock matchMedia
            const originalMatchMedia = window.matchMedia;
            window.matchMedia = vi.fn().mockImplementation((q: string) => ({
                matches: q.includes('reduce'),
                media: q,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })) as unknown as typeof window.matchMedia;

            const onClose = vi.fn();
            render(<OpeningCurtain isOpen={true} onClose={onClose} />);
            // 0.9s 還沒關
            act(() => {
                vi.advanceTimersByTime(900);
            });
            expect(onClose).not.toHaveBeenCalled();
            // 1s 整關
            act(() => {
                vi.advanceTimersByTime(100);
            });
            expect(onClose).toHaveBeenCalledTimes(1);

            window.matchMedia = originalMatchMedia;
        });
    });

    describe('視覺元素', () => {
        it('渲染頂條 OPENING + LIVE + 主標 + 跑馬燈', () => {
            render(<OpeningCurtain isOpen={true} onClose={() => {}} />);
            expect(screen.getByText(/Nº 12 · OPENING/)).toBeInTheDocument();
            expect(screen.getByText('吉他彈唱之夜')).toBeInTheDocument();
            expect(screen.getByText(/今晚開始/)).toBeInTheDocument();
            // 跑馬燈內容
            expect(screen.getAllByText(/SIDE A/).length).toBeGreaterThan(0);
        });
    });
});
