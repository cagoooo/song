// ShareCardModal 單元測試 — 雙尺寸切換 + 截圖機制 + Top 3 渲染
// 📐 設計文件：docs/design/T2-ritual-modal-tests.md

import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ShareCardModal } from './ShareCardModal';
import { makeSong } from '@/test/fixtures';

// Mock html-to-image — 永遠不真的截圖（jsdom 不支援）
const mockToPng = vi.fn();
const mockToBlob = vi.fn();
vi.mock('html-to-image', () => ({
    toPng: (...args: unknown[]) => mockToPng(...args),
    toBlob: (...args: unknown[]) => mockToBlob(...args),
}));

// Mock VoterLeaderboard — 走 Firestore，測試環境不該真的訂閱
vi.mock('@/hooks/useVoterLeaderboard', () => ({
    useVoterLeaderboard: () => ({
        topVoters: [
            { sessionId: 'v1', count: 18, isYou: false, avatar: '🎸', displayName: '投票者-01' },
            { sessionId: 'v2', count: 12, isYou: true, avatar: '🎤', displayName: '投票者-02' },
            { sessionId: 'v3', count: 8, isYou: false, avatar: '🎷', displayName: '投票者-03' },
        ],
        totalVotes: 87,
        totalVoters: 14,
        yourRank: 2,
        yourCount: 12,
    }),
}));

// Mock useToast — 不需要真的吐 toast UI
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: mockToast }),
}));

const SAMPLE_SONGS = [
    makeSong({ id: 's1', title: '晴天', artist: '周杰倫', voteCount: 20 }),
    makeSong({ id: 's2', title: '小幸運', artist: '田馥甄', voteCount: 18 }),
    makeSong({ id: 's3', title: '稻香', artist: '周杰倫', voteCount: 12 }),
    makeSong({ id: 's4', title: '倒數', artist: 'G.E.M.', voteCount: 8 }),
];

describe('ShareCardModal', () => {
    beforeEach(() => {
        mockToPng.mockReset().mockResolvedValue('data:image/png;base64,mock');
        mockToBlob.mockReset().mockResolvedValue(new Blob(['mock'], { type: 'image/png' }));
        mockToast.mockReset();
    });

    afterEach(() => {
        cleanup();
    });

    describe('開關狀態', () => {
        it('isOpen=false 不渲染', () => {
            render(<ShareCardModal isOpen={false} onClose={() => {}} songs={SAMPLE_SONGS} />);
            expect(screen.queryByText('演唱會節目單分享卡')).not.toBeInTheDocument();
        });

        it('isOpen=true 渲染標題', () => {
            render(<ShareCardModal isOpen={true} onClose={() => {}} songs={SAMPLE_SONGS} />);
            expect(screen.getByText('演唱會節目單分享卡')).toBeInTheDocument();
        });
    });

    describe('雙尺寸切換', () => {
        it('預設選 portrait（IG 1080×1350）', () => {
            render(<ShareCardModal isOpen={true} onClose={() => {}} songs={SAMPLE_SONGS} />);
            const tab = screen.getByText('IG · 1080×1350');
            expect(tab).toHaveAttribute('aria-selected', 'true');
        });

        it('點 FB OG tab → 切換到 landscape', () => {
            render(<ShareCardModal isOpen={true} onClose={() => {}} songs={SAMPLE_SONGS} />);
            const fbTab = screen.getByText('FB OG · 1200×630');
            expect(fbTab).toHaveAttribute('aria-selected', 'false');
            fireEvent.click(fbTab);
            expect(fbTab).toHaveAttribute('aria-selected', 'true');
            // IG tab 同時取消選取
            expect(screen.getByText('IG · 1080×1350')).toHaveAttribute('aria-selected', 'false');
        });
    });

    describe('截圖下載', () => {
        it('點「下載 PNG」→ 觸發 html-to-image.toPng', async () => {
            render(<ShareCardModal isOpen={true} onClose={() => {}} songs={SAMPLE_SONGS} />);
            fireEvent.click(screen.getByText('下載 PNG（2×）'));
            await waitFor(() => expect(mockToPng).toHaveBeenCalledTimes(1));
            // 確認帶上 pixelRatio: 2
            expect(mockToPng).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ pixelRatio: 2 }),
            );
            // 確認 toast 成功訊息
            await waitFor(() =>
                expect(mockToast).toHaveBeenCalledWith(
                    expect.objectContaining({ title: '✓ 已下載' }),
                ),
            );
        });

        it('html-to-image 拋例外 → toast 顯示「下載失敗」', async () => {
            mockToPng.mockRejectedValueOnce(new Error('PNG 產生時出錯'));
            render(<ShareCardModal isOpen={true} onClose={() => {}} songs={SAMPLE_SONGS} />);
            fireEvent.click(screen.getByText('下載 PNG（2×）'));
            await waitFor(() =>
                expect(mockToast).toHaveBeenCalledWith(
                    expect.objectContaining({ title: '下載失敗', variant: 'destructive' }),
                ),
            );
        });
    });

    describe('複製到剪貼簿', () => {
        it('點「複製到剪貼簿」→ 觸發 html-to-image.toBlob + clipboard.write', async () => {
            const writeMock = vi.fn().mockResolvedValue(undefined);
            // 確保 ClipboardItem 與 clipboard 在 jsdom 存在
            Object.defineProperty(navigator, 'clipboard', {
                value: { write: writeMock },
                configurable: true,
            });
            (globalThis as unknown as { ClipboardItem: typeof ClipboardItem }).ClipboardItem =
                class MockClipboardItem {
                    constructor(public items: Record<string, Blob>) {}
                } as unknown as typeof ClipboardItem;

            render(<ShareCardModal isOpen={true} onClose={() => {}} songs={SAMPLE_SONGS} />);
            fireEvent.click(screen.getByText('複製到剪貼簿'));
            await waitFor(() => expect(mockToBlob).toHaveBeenCalledTimes(1));
            await waitFor(() => expect(writeMock).toHaveBeenCalledTimes(1));
            await waitFor(() =>
                expect(mockToast).toHaveBeenCalledWith(
                    expect.objectContaining({ title: '✓ 已複製' }),
                ),
            );
        });
    });

    describe('Top 3 渲染', () => {
        it('Top 3 顯示前 3 首', () => {
            render(<ShareCardModal isOpen={true} onClose={() => {}} songs={SAMPLE_SONGS} />);
            // 用 getAllByText 因為標題可能在多處（top3 + setlist）
            expect(screen.getAllByText('晴天').length).toBeGreaterThan(0);
            expect(screen.getAllByText('小幸運').length).toBeGreaterThan(0);
            expect(screen.getAllByText('稻香').length).toBeGreaterThan(0);
        });

        it('依 voteCount 降序排（即使 input 不是排好的）', () => {
            const unsorted = [
                makeSong({ id: 'low', title: 'Low', voteCount: 1 }),
                makeSong({ id: 'high', title: 'High', voteCount: 100 }),
                makeSong({ id: 'mid', title: 'Mid', voteCount: 50 }),
            ];
            render(<ShareCardModal isOpen={true} onClose={() => {}} songs={unsorted} />);
            // Radix Dialog 走 Portal，要查 document 而非 container
            const top3Items = document.querySelectorAll('.share-top3 li');
            expect(top3Items.length).toBe(3);
            expect(top3Items[0].textContent).toContain('High');
            expect(top3Items[1].textContent).toContain('Mid');
            expect(top3Items[2].textContent).toContain('Low');
        });
    });
});
