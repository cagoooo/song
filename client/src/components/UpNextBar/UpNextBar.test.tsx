import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpNextBar } from './UpNextBar';
import type { NowPlayingInfo } from '@/lib/firestore';
import { makeSong, makeVote } from '@/test/fixtures';

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

    it('nowPlaying 為空時顯示等待開場狀態', () => {
        render(<UpNextBar songs={[]} />);

        expect(document.body.querySelector('.un-bar')).toHaveClass('empty');
        expect(screen.getByText('等待開場')).toBeInTheDocument();
    });

    it('有 nowPlaying song 時顯示目前播放歌曲', () => {
        const song = makeSong({ id: 's1', title: '十年', artist: '陳奕迅', isNowPlaying: true });
        mockNowPlaying = {
            songId: 's1',
            song,
            startedAt: new Date(),
            startedBy: 'admin',
        };

        render(<UpNextBar songs={[song]} />);

        expect(screen.getByTitle('十年 · 陳奕迅')).toBeInTheDocument();
    });

    it('依票數排序待播清單，排除已播放與正在播放，底部只顯示前三首', () => {
        const songs = [
            makeSong({ id: 'a', title: 'A', voteCount: 3 }),
            makeSong({ id: 'b', title: 'B', voteCount: 10 }),
            makeSong({ id: 'c', title: 'C', voteCount: 5, isPlayed: true }),
            makeSong({ id: 'd', title: 'D', voteCount: 8 }),
            makeSong({ id: 'e', title: 'E', voteCount: 15, isNowPlaying: true }),
            makeSong({ id: 'f', title: 'F', voteCount: 1 }),
        ];
        mockNowPlaying = {
            songId: 'e',
            song: songs[4],
            startedAt: new Date(),
            startedBy: 'admin',
        };

        render(<UpNextBar songs={songs} />);

        const titles = Array.from(document.querySelectorAll('.un-card-title')).map((el) => el.textContent);
        expect(titles).toEqual(['B', 'D', 'A']);
    });

    it('沒有待播歌曲時顯示空清單提示', () => {
        const playing = makeSong({ id: 'p', title: 'P', isNowPlaying: true });
        mockNowPlaying = {
            songId: 'p',
            song: playing,
            startedAt: new Date(),
            startedBy: 'admin',
        };

        render(<UpNextBar songs={[playing]} />);

        expect(screen.getByText('待播清單空了')).toBeInTheDocument();
    });

    it('點 +N 會打開完整待播清單', () => {
        const playing = makeSong({ id: 'p', title: 'P', isNowPlaying: true });
        const songs = [
            playing,
            makeSong({ id: 'a', title: 'A', voteCount: 1 }),
            makeSong({ id: 'b', title: 'B', voteCount: 5 }),
            makeSong({ id: 'c', title: 'C', voteCount: 3 }),
            makeSong({ id: 'd', title: 'D', voteCount: 2 }),
        ];
        mockNowPlaying = {
            songId: 'p',
            song: playing,
            startedAt: new Date(),
            startedBy: 'admin',
        };

        render(<UpNextBar songs={songs} />);
        fireEvent.click(screen.getByLabelText('查看完整待播清單，共 4 首'));

        const dialog = screen.getByRole('dialog', { name: '完整待播清單' });
        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText('D')).toBeInTheDocument();
    });

    it('完整待播清單中的歌曲可開啟詳情', () => {
        const onOpenDetail = vi.fn();
        const playing = makeSong({ id: 'p', title: 'P', isNowPlaying: true });
        const queued = makeSong({ id: 'a', title: '下一首', artist: '歌手', voteCount: 1 });
        mockNowPlaying = {
            songId: 'p',
            song: playing,
            startedAt: new Date(),
            startedBy: 'admin',
        };

        render(<UpNextBar songs={[playing, queued]} onOpenDetail={onOpenDetail} />);
        fireEvent.click(screen.getByLabelText('查看完整待播清單，共 1 首'));
        const dialog = screen.getByRole('dialog', { name: '完整待播清單' });
        fireEvent.click(within(dialog).getByText('下一首'));

        expect(onOpenDetail).toHaveBeenCalledWith(queued);
        expect(screen.queryByRole('dialog', { name: '完整待播清單' })).not.toBeInTheDocument();
    });

    it('點待播卡片會呼叫 onOpenDetail(song)', () => {
        const onOpenDetail = vi.fn();
        const song = makeSong({ id: 'a', title: 'A', artist: 'Artist', voteCount: 1 });
        mockNowPlaying = {
            songId: 'np',
            song: makeSong({ id: 'np', title: 'NP' }),
            startedAt: new Date(),
            startedBy: 'admin',
        };

        render(<UpNextBar songs={[song]} onOpenDetail={onOpenDetail} />);
        fireEvent.click(screen.getByLabelText('待播第 1 首：A，Artist'));

        expect(onOpenDetail).toHaveBeenCalledWith(song);
    });

    it('點 NOW PLAYING 會呼叫 onOpenDetail(playingSong)', () => {
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
        fireEvent.click(screen.getByTitle('NowPlayingTrack · AnArtist'));

        expect(onOpenDetail).toHaveBeenCalledWith(playing);
    });

    it('使用者投過的歌會標記目前排名 tooltip', () => {
        const songs = [
            makeSong({ id: 'a', voteCount: 10 }),
            makeSong({ id: 'b', voteCount: 5 }),
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

        expect(screen.getByLabelText(/待播第 2 首/)).toHaveAttribute('data-mine', '你點的歌目前第 2');
    });

    it('combo:vote 事件會讓對應卡片短暫 flash', () => {
        const song = makeSong({ id: 'a', title: 'A', voteCount: 10 });
        mockNowPlaying = {
            songId: 'np',
            song: makeSong({ id: 'np' }),
            startedAt: new Date(),
            startedBy: 'admin',
        };

        render(<UpNextBar songs={[song]} />);
        const card = screen.getByLabelText(/待播第 1 首/);

        expect(card).not.toHaveClass('flash');
        act(() => {
            window.dispatchEvent(new CustomEvent('combo:vote', { detail: { songId: 'a' } }));
        });
        expect(card).toHaveClass('flash');
        act(() => {
            vi.advanceTimersByTime(700);
        });
        expect(card).not.toHaveClass('flash');
    });

    it('mount 時加入 body class，unmount 時移除', () => {
        const { unmount } = render(<UpNextBar songs={[]} />);

        expect(document.body.classList.contains('has-up-next-bar')).toBe(true);
        unmount();
        expect(document.body.classList.contains('has-up-next-bar')).toBe(false);
    });
});
