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

        it('詳情頁使用手機安全的獨立捲動容器，不再被行內 padding 覆蓋', () => {
            const song = makeSong({ title: '手機版測試' });
            render(<SongDetailModal song={song} onClose={() => {}} />);

            expect(screen.getByRole('dialog')).toHaveClass('sdp-dialog');
            const page = document.querySelector<HTMLElement>('.sd-page');
            expect(page).not.toBeNull();
            expect(page?.style.padding).toBe('');
            expect(page).toHaveClass('min-h-0', 'overflow-x-hidden');
        });

        it('點播 Bar 是捲動容器的外層兄弟，固定在 Dialog 最下方', () => {
            const song = makeSong({ title: '底部列測試' });
            render(<SongDetailModal song={song} onClose={() => {}} />);

            const page = document.querySelector('.sd-page');
            const cta = document.querySelector('.sdp-cta');
            expect(page).not.toBeNull();
            expect(cta).not.toBeNull();
            expect(page?.contains(cta)).toBe(false);
            expect(page?.nextElementSibling).toBe(cta);
        });
    });

    describe('Firestore 樂譜欄位優先顯示（T3 schema）', () => {
        it('傳入完整樂譜欄位 → 顯示真實 Capo / BPM / 進行', () => {
            const song = makeSong({
                title: '晴天',
                artist: '周杰倫',
                songKey: 'C',
                capo: 2,
                bpm: 78,
                progression: ['C', 'G', 'Am', 'Em', 'F', 'Dm', 'G', 'C'],
            });
            render(<SongDetailModal song={song} onClose={() => {}} />);
            expect(screen.getByText('2')).toBeInTheDocument();   // Capo
            expect(screen.getByText('78')).toBeInTheDocument();  // BPM
        });

        it('傳入 lyricBlocks → 顯示結構化歌詞', () => {
            const song = makeSong({
                title: 'Test',
                lyricBlocks: [
                    { sec: 'VERSE 1', rows: [{ chord: 'C G', line: '測試歌詞行' }] },
                ],
            });
            render(<SongDetailModal song={song} onClose={() => {}} />);
            expect(screen.getByText('測試歌詞行')).toBeInTheDocument();
        });

        it('傳入 kaiNote → 顯示主理人筆記', () => {
            const song = makeSong({
                title: 'Test',
                kaiNote: '副歌前那個 Em 卡半拍給它',
            });
            render(<SongDetailModal song={song} onClose={() => {}} />);
            expect(screen.getByText(/Em 卡半拍給它/)).toBeInTheDocument();
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
