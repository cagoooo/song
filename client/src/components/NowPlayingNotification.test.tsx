import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NowPlayingNotification } from './NowPlayingNotification';
import { clearNowPlaying } from '@/lib/firestore';
import { useUser } from '@/hooks/use-user';

vi.mock('@/lib/firestore', () => ({
    clearNowPlaying: vi.fn(),
    markSongAsPlayed: vi.fn(),
}));

// 可動態切換的 nowPlaying 狀態（模擬 Firestore 即時更新：開始彈奏 ↔ 結束彈奏）
const nowPlayingState = vi.hoisted(() => ({
    current: null as { songId: string; song: { id: string; title: string; artist: string } } | null,
}));

vi.mock('@/hooks/useNowPlaying', () => ({
    useNowPlaying: () => nowPlayingState.current,
}));

const PLAYING = {
    songId: 'song-1',
    song: { id: 'song-1', title: '或是一首歌', artist: '田馥甄' },
};

vi.mock('@/hooks/use-user', () => ({
    useUser: vi.fn(),
}));

vi.mock('@/hooks/useInteractions', () => ({
    useInteractions: () => ({
        ratingStats: { average: 0, count: 0 },
        isSending: false,
        userRating: 0,
        handleSendTip: vi.fn(),
        handleSendRating: vi.fn(),
    }),
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

describe('NowPlayingNotification 叉叉關閉權限行為', () => {
    beforeEach(() => {
        vi.mocked(clearNowPlaying).mockReset().mockResolvedValue(undefined as never);
        nowPlayingState.current = PLAYING;
    });

    it('管理員按叉叉 → 同步結束彈奏（clearNowPlaying）並關閉卡片', async () => {
        vi.mocked(useUser).mockReturnValue({ user: { id: 'admin-1', isAdmin: true } } as ReturnType<typeof useUser>);
        render(<NowPlayingNotification />);

        fireEvent.click(screen.getByRole('button', { name: '結束彈奏並關閉' }));

        await waitFor(() => {
            expect(clearNowPlaying).toHaveBeenCalledTimes(1);
            expect(screen.queryByText('正在彈奏中')).not.toBeInTheDocument();
        });
    });

    it('訪客按叉叉 → 只關閉本地通知，不動全站彈奏狀態', async () => {
        vi.mocked(useUser).mockReturnValue({ user: null } as ReturnType<typeof useUser>);
        render(<NowPlayingNotification />);

        fireEvent.click(screen.getByRole('button', { name: '關閉通知' }));

        await waitFor(() => {
            expect(screen.queryByText('正在彈奏中')).not.toBeInTheDocument();
        });
        expect(clearNowPlaying).not.toHaveBeenCalled();
    });

    it('同一首歌：關閉 → 結束彈奏 → 再次開始彈奏 → 卡片重新出現', async () => {
        vi.mocked(useUser).mockReturnValue({ user: { id: 'admin-1', isAdmin: true } } as ReturnType<typeof useUser>);
        const { rerender } = render(<NowPlayingNotification />);

        // 管理員按叉叉 → 結束彈奏、卡片關閉
        fireEvent.click(screen.getByRole('button', { name: '結束彈奏並關閉' }));
        await waitFor(() => {
            expect(screen.queryByText('正在彈奏中')).not.toBeInTheDocument();
        });

        // Firestore 同步：彈奏狀態被清空
        nowPlayingState.current = null;
        rerender(<NowPlayingNotification />);
        expect(screen.queryByText('正在彈奏中')).not.toBeInTheDocument();

        // 同一首歌再次開始彈奏 → 卡片必須重新出現
        nowPlayingState.current = PLAYING;
        rerender(<NowPlayingNotification />);
        await waitFor(() => {
            expect(screen.getByText('正在彈奏中')).toBeInTheDocument();
            expect(screen.getByText('或是一首歌')).toBeInTheDocument();
        });
    });

    it('管理員結束彈奏失敗 → 卡片保持開啟讓管理員知道狀態沒清掉', async () => {
        vi.mocked(useUser).mockReturnValue({ user: { id: 'admin-1', isAdmin: true } } as ReturnType<typeof useUser>);
        vi.mocked(clearNowPlaying).mockRejectedValue(new Error('network'));
        render(<NowPlayingNotification />);

        fireEvent.click(screen.getByRole('button', { name: '結束彈奏並關閉' }));

        await waitFor(() => {
            expect(clearNowPlaying).toHaveBeenCalledTimes(1);
        });
        expect(screen.getByText('正在彈奏中')).toBeInTheDocument();
    });
});
