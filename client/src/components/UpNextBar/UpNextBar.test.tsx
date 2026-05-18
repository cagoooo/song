// UpNextBar 單元測試 — 三狀態（演出中 / 觀眾投票 / 待開場）+ 隊列排序 + tooltip
// 📐 設計文件：docs/design/T2-ritual-modal-tests.md

import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UpNextBar } from './UpNextBar';
import type { NowPlayingInfo } from '@/lib/firestore';
import { makeSong, makeVote } from '@/test/fixtures';

// 由測試控制的 mock 狀態
let mockNowPlaying: NowPlayingInfo | null = null;
let mockHistory: ReturnType<typeof makeVote>[] = [];

vi.mock('@/hooks/useNowPlaying', () => ({
    useNowPlaying: () => mockNowPlaying,
}));

vi.mock('@/hooks/useVoteHistory', () => ({
    useVoteHistory: () => ({
        history: mockHistory,
        todayCount: 0,
        todayUniqueCount: 0,
        addVote: vi.fn(),
        clearHistory: vi.fn(),
        getLastVoteAt: () => null,
    }),
}));

describe('UpNextBar', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-05-18T20:00:00+08:00'));
        mockNowPlaying = null;
        mockHistory = [];
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        document.body.className = '';
    });

    describe('狀態切換', () => {
        it('待開場（nowPlaying=null）→ 顯示 empty 樣式 + 「待開場」', () => {
            const { container } = render(<UpNextBar songs={[]} />);
            const bar = container.querySelector('.un-bar');
            expect(bar).toHaveClass('empty');
            expect(screen.getByText('待開場')).toBeInTheDocument();
        });

        it('演出中（nowPlaying 有 song）→ 顯示歌名 + 不在 empty 樣式', () => {
            const song = makeSong({ id: 's1', title: '晴天', artist: '周杰倫', isNowPlaying: true });
            mockNowPlaying = {
                songId: 's1',
                song,
                startedAt: new Date(),
                startedBy: 'admin',
            };
            const { container } = render(<UpNextBar songs={[song]} />);
            const bar = container.querySelector('.un-bar');
            expect(bar).not.toHaveClass('empty');
            // 標題出現在 NOW PLAYING button 上
            expect(screen.getByTitle('晴天 — 周杰倫')).toBeInTheDocument();
        });
    });

    describe('隊列排序與篩選', () => {
        it('依 voteCount 降序、剔除 isPlayed / isNowPlaying、取前 3', () => {
            const songs = [
                makeSong({ id: 'a', title: 'A', voteCount: 3 }),
                makeSong({ id: 'b', title: 'B', voteCount: 10 }),
                makeSong({ id: 'c', title: 'C', voteCount: 5, isPlayed: true }),  // 被剔除
                makeSong({ id: 'd', title: 'D', voteCount: 8 }),
                makeSong({ id: 'e', title: 'E', voteCount: 15, isNowPlaying: true }),  // 被剔除
                makeSong({ id: 'f', title: 'F', voteCount: 1 }),  // 排第 4 不出現
            ];
            mockNowPlaying = {
                songId: 'e',
                song: songs[4],
                startedAt: new Date(),
                startedBy: 'admin',
            };
            render(<UpNextBar songs={songs} />);
            // 預期順序：B(10) → D(8) → A(3)
            const cards = document.querySelectorAll('.un-card-title');
            const titles = Array.from(cards).map((el) => el.textContent);
            expect(titles).toEqual(['B', 'D', 'A']);
        });

        it('沒下一首（演出中但 queue 空）→ 顯示「隊列空了」', () => {
            const playing = makeSong({ id: 'p', title: 'P', isNowPlaying: true });
            mockNowPlaying = {
                songId: 'p',
                song: playing,
                startedAt: new Date(),
                startedBy: 'admin',
            };
            render(<UpNextBar songs={[playing]} />);
            expect(screen.getByText('隊列空了')).toBeInTheDocument();
        });
    });

    describe('callback', () => {
        it('點 +5 看全部 → onShowFullQueue', () => {
            const onShowFullQueue = vi.fn();
            render(<UpNextBar songs={[]} onShowFullQueue={onShowFullQueue} />);
            fireEvent.click(screen.getByLabelText('展開完整隊列'));
            expect(onShowFullQueue).toHaveBeenCalledTimes(1);
        });

        it('點隊列卡 → onOpenDetail(song)', () => {
            const onOpenDetail = vi.fn();
            const songs = [
                makeSong({ id: 'a', title: 'A', voteCount: 1 }),
            ];
            mockNowPlaying = {
                songId: 'np',
                song: makeSong({ id: 'np', title: 'NP' }),
                startedAt: new Date(),
                startedBy: 'admin',
            };
            render(<UpNextBar songs={songs} onOpenDetail={onOpenDetail} />);
            fireEvent.click(screen.getByLabelText(/隊列第 1：A/));
            expect(onOpenDetail).toHaveBeenCalledWith(songs[0]);
        });

        it('點 NOW PLAYING 標題 → onOpenDetail(playingSong)', () => {
            const onOpenDetail = vi.fn();
            const playing = makeSong({
                id: 'np',
                title: 'NowPlayingTrack',
                artist: 'AnArtist',
                isNowPlaying: true,
            });
            mockNowPlaying = {
                songId: 'np',
                song: playing,
                startedAt: new Date(),
                startedBy: 'admin',
            };
            render(<UpNextBar songs={[playing]} onOpenDetail={onOpenDetail} />);
            // .un-now-title 是唯一帶這個 title 屬性的（card 不會出現因為 isNowPlaying 被過濾）
            fireEvent.click(screen.getByTitle('NowPlayingTrack — AnArtist'));
            expect(onOpenDetail).toHaveBeenCalledWith(playing);
        });
    });

    describe('「你點的還排第 N」tooltip', () => {
        it('使用者投過的歌仍在隊列裡 → data-mine 屬性帶排名', () => {
            const songs = [
                makeSong({ id: 'a', voteCount: 10 }),
                makeSong({ id: 'b', voteCount: 5 }),  // 使用者投過這首
                makeSong({ id: 'c', voteCount: 1 }),
            ];
            mockHistory = [makeVote('b', 'B', 'X', Date.now())];
            mockNowPlaying = {
                songId: 'np',
                song: makeSong({ id: 'np' }),
                startedAt: new Date(),
                startedBy: 'admin',
            };
            render(<UpNextBar songs={songs} />);
            const userCard = screen.getByLabelText(/隊列第 2：/);
            expect(userCard).toHaveAttribute('data-mine', expect.stringContaining('你點的還排第'));
        });

        it('使用者投過已彈過的歌 → 沒有 tooltip', () => {
            const songs = [
                makeSong({ id: 'a', voteCount: 10 }),
                makeSong({ id: 'b', voteCount: 5 }),
                makeSong({ id: 'played', voteCount: 100, isPlayed: true }),
            ];
            mockHistory = [makeVote('played', 'X', 'X', Date.now())];
            mockNowPlaying = {
                songId: 'np',
                song: makeSong({ id: 'np' }),
                startedAt: new Date(),
                startedBy: 'admin',
            };
            render(<UpNextBar songs={songs} />);
            const cards = document.querySelectorAll('.un-card');
            cards.forEach((c) => {
                expect(c.getAttribute('data-mine')).toBeNull();
            });
        });
    });

    describe('combo:vote 事件 → 黃光 pulse', () => {
        it('收到 combo:vote 事件 → 對應 card 加 flash class，700ms 後消失', () => {
            const songs = [makeSong({ id: 'a', voteCount: 10 })];
            mockNowPlaying = {
                songId: 'np',
                song: makeSong({ id: 'np' }),
                startedAt: new Date(),
                startedBy: 'admin',
            };
            render(<UpNextBar songs={songs} />);
            const card = screen.getByLabelText(/隊列第 1：/);
            expect(card).not.toHaveClass('flash');

            act(() => {
                window.dispatchEvent(
                    new CustomEvent('combo:vote', { detail: { songId: 'a' } }),
                );
            });
            expect(card).toHaveClass('flash');

            // 700ms 後 flash 消失
            act(() => {
                vi.advanceTimersByTime(700);
            });
            expect(card).not.toHaveClass('flash');
        });
    });

    describe('body class 管理', () => {
        it('mount 時加 has-up-next-bar，unmount 時移除', () => {
            const { unmount } = render(<UpNextBar songs={[]} />);
            expect(document.body.classList.contains('has-up-next-bar')).toBe(true);
            unmount();
            expect(document.body.classList.contains('has-up-next-bar')).toBe(false);
        });
    });
});
