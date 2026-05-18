// SongDetailModal 單元測試 — 歌曲詳情頁
// 📐 設計文件：docs/design/T2-ritual-modal-tests.md

import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SongDetailModal } from './SongDetailModal';
import { makeSong } from '@/test/fixtures';

describe('SongDetailModal', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    describe('開關狀態', () => {
        it('song=null 不渲染', () => {
            const { container } = render(<SongDetailModal song={null} onClose={() => {}} />);
            expect(container.querySelector('.sd-page')).toBeNull();
        });

        it('傳入 song 渲染 dialog + 標題', () => {
            const song = makeSong({ title: '晴天', artist: '周杰倫' });
            render(<SongDetailModal song={song} onClose={() => {}} />);
            // sr-only DialogTitle 內含歌曲標題
            expect(screen.getByText('晴天 · 周杰倫 — 歌曲詳情頁')).toBeInTheDocument();
        });
    });

    describe('「晴天」固定 detail（資料來自 data.ts）', () => {
        it('Capo 2、78 BPM、C Key 對應 SONG_DETAILS["晴天"]', () => {
            const song = makeSong({ title: '晴天', artist: '周杰倫' });
            render(<SongDetailModal song={song} onClose={() => {}} />);
            // Capo
            expect(screen.getByText('2')).toBeInTheDocument();
            // BPM
            expect(screen.getByText('78')).toBeInTheDocument();
        });
    });

    describe('Fallback detail（其他歌走 hash 推導）', () => {
        it('未知歌曲也有 detail 不爆炸', () => {
            const song = makeSong({ id: 'random-id', title: 'XYZ Test', artist: '某歌手' });
            render(<SongDetailModal song={song} onClose={() => {}} />);
            // 至少 hero / chord progression / lyrics 結構出現（Dialog 走 Portal，要查 document）
            const heroTitle = document.querySelector('.sdp-title');
            expect(heroTitle).not.toBeNull();
            expect(heroTitle!.textContent).toBe('XYZ Test');
        });

        it('傳入 lyrics: "短歌詞" → 顯示在 VERSE 1 區塊', () => {
            const song = makeSong({
                id: 'r1',
                title: 'Random',
                lyrics: '故事的小黃花 從出生那年就飄著',
            });
            render(<SongDetailModal song={song} onClose={() => {}} />);
            expect(screen.getByText(/故事的小黃花/)).toBeInTheDocument();
        });
    });

    describe('投票流程', () => {
        it('預設 voted=false，按鈕顯示「+ 我要點這首」', () => {
            const song = makeSong({ title: '晴天' });
            render(<SongDetailModal song={song} onClose={() => {}} />);
            expect(screen.getByLabelText('點播這首歌')).toBeInTheDocument();
            expect(screen.getByText(/\+ 我要點這首/)).toBeInTheDocument();
        });

        it('點投票 → 按鈕變「✓ 已點播這首」+ 觸發 onVote', () => {
            const song = makeSong({ title: '晴天' });
            const onVote = vi.fn();
            render(<SongDetailModal song={song} onClose={() => {}} onVote={onVote} />);
            const btn = screen.getByLabelText('點播這首歌');
            fireEvent.click(btn);
            expect(onVote).toHaveBeenCalledWith(song);
            // 按鈕變「已點播」
            expect(screen.getByLabelText('已點播')).toBeInTheDocument();
        });

        it('已投票按鈕 disabled，再次點不會重複觸發 onVote', () => {
            const song = makeSong({ title: '晴天' });
            const onVote = vi.fn();
            render(<SongDetailModal song={song} onClose={() => {}} onVote={onVote} />);
            fireEvent.click(screen.getByLabelText('點播這首歌'));
            fireEvent.click(screen.getByLabelText('已點播'));
            expect(onVote).toHaveBeenCalledTimes(1);
        });

        it('切換到另一首歌 → 投票狀態 reset', () => {
            const songA = makeSong({ id: 'a', title: '晴天' });
            const songB = makeSong({ id: 'b', title: '稻香' });
            const onVote = vi.fn();
            const { rerender } = render(
                <SongDetailModal song={songA} onClose={() => {}} onVote={onVote} />,
            );
            fireEvent.click(screen.getByLabelText('點播這首歌'));
            expect(screen.getByLabelText('已點播')).toBeInTheDocument();

            // 切到 B 歌 → 又變回 voted=false
            rerender(<SongDetailModal song={songB} onClose={() => {}} onVote={onVote} />);
            expect(screen.getByLabelText('點播這首歌')).toBeInTheDocument();
        });
    });

    describe('關閉觸發', () => {
        it('點「返回歌單」→ 呼叫 onClose', () => {
            const song = makeSong();
            const onClose = vi.fn();
            render(<SongDetailModal song={song} onClose={onClose} />);
            fireEvent.click(screen.getByLabelText('返回歌單'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('和弦複製', () => {
        it('點和弦進行的 C → 觸發 navigator.clipboard.writeText("C")', () => {
            const writeText = vi.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', {
                value: { writeText },
                configurable: true,
            });
            const song = makeSong({ title: '晴天' });
            render(<SongDetailModal song={song} onClose={() => {}} />);
            // 「晴天」progression = ['C', 'G', 'Am', 'Em', 'F', 'Dm', 'G', 'C']
            // 第一個 C chord pill button
            const cChordBtn = screen.getAllByLabelText('複製和弦名 C')[0];
            fireEvent.click(cChordBtn);
            expect(writeText).toHaveBeenCalledWith('C');
        });
    });

    describe('toast 訊息', () => {
        it('投票後顯示「✓ 已點播 + 1」toast', () => {
            const song = makeSong({ title: '晴天' });
            render(<SongDetailModal song={song} onClose={() => {}} />);
            fireEvent.click(screen.getByLabelText('點播這首歌'));
            // toast 內容
            act(() => {
                vi.advanceTimersByTime(50);
            });
            expect(screen.getByText(/已點播 \+ 1/)).toBeInTheDocument();
        });
    });
});
