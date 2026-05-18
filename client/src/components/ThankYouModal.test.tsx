// ThankYouModal 單元測試 — END OF SIDE A 收尾儀式
// 📐 設計文件：docs/design/T2-ritual-modal-tests.md

import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThankYouModal } from './ThankYouModal';
import { makeSong } from '@/test/fixtures';

vi.mock('@/hooks/useVoterLeaderboard', () => ({
    useVoterLeaderboard: () => ({
        topVoters: [],
        totalVotes: 87,
        totalVoters: 14,
        yourRank: null,
        yourCount: 0,
    }),
}));

const SAMPLE_SONGS = [
    makeSong({ id: 's1', title: '晴天', voteCount: 20 }),
    makeSong({ id: 's2', title: '小幸運', voteCount: 18 }),
    makeSong({ id: 's3', title: '稻香', voteCount: 12 }),
];

describe('ThankYouModal', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-18T22:00:00+08:00'));
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    describe('開關狀態', () => {
        it('isOpen=false 不渲染', () => {
            render(<ThankYouModal isOpen={false} onClose={() => {}} songs={SAMPLE_SONGS} />);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('isOpen=true 渲染 dialog + END OF SIDE A 標頭', () => {
            render(<ThankYouModal isOpen={true} onClose={() => {}} songs={SAMPLE_SONGS} />);
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            // Nº 12 · END OF SIDE A 雜誌頂條
            expect(screen.getByText(/END OF SIDE A/)).toBeInTheDocument();
        });
    });

    describe('關閉觸發', () => {
        it('按 Escape → 觸發 dismiss 動畫，420ms 後呼叫 onClose', () => {
            const onClose = vi.fn();
            render(<ThankYouModal isOpen={true} onClose={onClose} songs={SAMPLE_SONGS} />);
            fireEvent.keyDown(window, { key: 'Escape' });
            // 立即進入 dismissing class（420ms 動畫期間）
            expect(screen.getByRole('dialog')).toHaveClass('dismissing');
            // 還沒真的 close
            expect(onClose).not.toHaveBeenCalled();
            // 420ms 後才 close
            act(() => {
                vi.advanceTimersByTime(420);
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('按「ESC 跳過」按鈕也觸發關閉', () => {
            const onClose = vi.fn();
            render(<ThankYouModal isOpen={true} onClose={onClose} songs={SAMPLE_SONGS} />);
            fireEvent.click(screen.getByText(/跳過/));
            act(() => {
                vi.advanceTimersByTime(420);
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('連按 Escape 兩次只觸發一次 onClose（debounce）', () => {
            const onClose = vi.fn();
            render(<ThankYouModal isOpen={true} onClose={onClose} songs={SAMPLE_SONGS} />);
            fireEvent.keyDown(window, { key: 'Escape' });
            fireEvent.keyDown(window, { key: 'Escape' });
            fireEvent.keyDown(window, { key: 'Escape' });
            act(() => {
                vi.advanceTimersByTime(500);
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('30 秒 auto-fade', () => {
        it('預設 30 秒後自動關閉', () => {
            const onClose = vi.fn();
            render(<ThankYouModal isOpen={true} onClose={onClose} songs={SAMPLE_SONGS} />);
            // 倒數 30 秒
            act(() => {
                vi.advanceTimersByTime(30_000);
            });
            // 加上 420ms 的 dismissing 動畫
            act(() => {
                vi.advanceTimersByTime(420);
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('autoFadeSeconds=5 可縮短倒數', () => {
            const onClose = vi.fn();
            render(
                <ThankYouModal
                    isOpen={true}
                    onClose={onClose}
                    songs={SAMPLE_SONGS}
                    autoFadeSeconds={5}
                />,
            );
            // 5 個 interval tick 觸發 close()
            act(() => {
                vi.advanceTimersByTime(5_000);
            });
            // 再加 420ms 等 dismissing 動畫完成
            act(() => {
                vi.advanceTimersByTime(420);
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('倒數從 N 開始 → 1 秒後變 N-1', () => {
            render(
                <ThankYouModal
                    isOpen={true}
                    onClose={() => {}}
                    songs={SAMPLE_SONGS}
                    autoFadeSeconds={10}
                />,
            );
            expect(screen.getByText('10s')).toBeInTheDocument();
            act(() => {
                vi.advanceTimersByTime(1_000);
            });
            expect(screen.getByText('9s')).toBeInTheDocument();
        });
    });

    describe('分享按鈕', () => {
        it('點「分享今晚的節目單」→ 觸發 onShare', () => {
            const onShare = vi.fn();
            render(
                <ThankYouModal
                    isOpen={true}
                    onClose={() => {}}
                    songs={SAMPLE_SONGS}
                    onShare={onShare}
                />,
            );
            fireEvent.click(screen.getByLabelText('分享今晚的節目單'));
            expect(onShare).toHaveBeenCalledTimes(1);
        });

        it('沒傳 onShare → 點分享改觸發關閉', () => {
            const onClose = vi.fn();
            render(
                <ThankYouModal isOpen={true} onClose={onClose} songs={SAMPLE_SONGS} />,
            );
            fireEvent.click(screen.getByLabelText('分享今晚的節目單'));
            act(() => {
                vi.advanceTimersByTime(420);
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('統計動畫', () => {
        it('820ms 前計數還是 0（動畫尚未開始）', () => {
            const { container } = render(
                <ThankYouModal isOpen={true} onClose={() => {}} songs={SAMPLE_SONGS} />,
            );
            // 不前進時間，count 應該還是 0
            const counts = container.ownerDocument.querySelectorAll('.ty-mega-n, .ty-stat-n');
            // 多個數字節點都該是 0
            counts.forEach((el) => {
                expect(['0', '0 ', '']).toContain(el.textContent?.trim().replace(/[^0-9]/g, '') ?? '');
            });
        });

        it('2.5s 後計數動畫已結束 — totalVotes=50 顯示在某處', () => {
            const songs = [
                makeSong({ id: 'a', voteCount: 30 }),
                makeSong({ id: 'b', voteCount: 20 }),
            ];
            render(<ThankYouModal isOpen={true} onClose={() => {}} songs={songs} />);
            act(() => {
                vi.advanceTimersByTime(820 + 1500 + 100); // delay + duration + 緩衝
            });
            // 50 票應該顯示
            expect(screen.getAllByText('50').length).toBeGreaterThan(0);
        });
    });
});
