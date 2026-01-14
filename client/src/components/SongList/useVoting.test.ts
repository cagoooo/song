// useVoting Hook 單元測試
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing useVoting
vi.mock('@/lib/firestore', () => ({
    voteSong: vi.fn().mockResolvedValue(undefined),
    getSessionId: vi.fn(() => 'test-session-id'),
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: vi.fn(),
    }),
}));

vi.mock('canvas-confetti', () => ({
    default: vi.fn(),
}));

// Import after mocking
import { useVoting } from './useVoting';
import { voteSong } from '@/lib/firestore';

describe('useVoting', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('初始狀態', () => {
        it('應該初始為無投票狀態', () => {
            const { result } = renderHook(() => useVoting());

            expect(result.current.votingId).toBeNull();
            expect(result.current.clickCount).toEqual({});
            expect(result.current.voteSuccess).toEqual({});
            expect(result.current.showVoteOverlay).toBeNull();
        });

        it('buttonRefs 應該是一個空物件', () => {
            const { result } = renderHook(() => useVoting());

            expect(result.current.buttonRefs.current).toEqual({});
        });
    });

    describe('handleVoteStart', () => {
        it('投票後應該更新 clickCount', async () => {
            const { result } = renderHook(() => useVoting());
            const mockSong = {
                id: 'song-1',
                title: '測試歌曲',
                artist: '測試歌手',
                voteCount: 10,
                createdAt: new Date(),
            };

            await act(async () => {
                await result.current.handleVoteStart('song-1', mockSong);
            });

            expect(result.current.clickCount['song-1']).toBe(1);
            expect(voteSong).toHaveBeenCalledWith('song-1', 'test-session-id');
        });

        it('投票後應該顯示 overlay', async () => {
            const { result } = renderHook(() => useVoting());
            const mockSong = {
                id: 'song-1',
                title: '告白氣球',
                artist: '周杰倫',
                voteCount: 5,
                createdAt: new Date(),
            };

            await act(async () => {
                await result.current.handleVoteStart('song-1', mockSong);
            });

            expect(result.current.showVoteOverlay).toEqual({
                songId: 'song-1',
                title: '告白氣球',
                artist: '周杰倫',
            });
        });

        it('投票後應該設置 voteSuccess', async () => {
            const { result } = renderHook(() => useVoting());
            const mockSong = {
                id: 'song-1',
                title: '測試歌曲',
                artist: '測試歌手',
                voteCount: 10,
                createdAt: new Date(),
            };

            await act(async () => {
                await result.current.handleVoteStart('song-1', mockSong);
            });

            expect(result.current.voteSuccess['song-1']).toBe(true);
        });

        it('連續投票應該累加 clickCount', async () => {
            const { result } = renderHook(() => useVoting());
            const mockSong = {
                id: 'song-1',
                title: '測試歌曲',
                artist: '測試歌手',
                voteCount: 10,
                createdAt: new Date(),
            };

            // 第一次投票
            await act(async () => {
                await result.current.handleVoteStart('song-1', mockSong);
            });

            // 快進 500ms 以避免防抖
            act(() => {
                vi.advanceTimersByTime(500);
            });

            // 第二次投票
            await act(async () => {
                await result.current.handleVoteStart('song-1', mockSong);
            });

            expect(result.current.clickCount['song-1']).toBe(2);
        });

        it('300ms 內的重複投票應該被忽略（防抖）', async () => {
            const { result } = renderHook(() => useVoting());
            const mockSong = {
                id: 'song-1',
                title: '測試歌曲',
                artist: '測試歌手',
                voteCount: 10,
                createdAt: new Date(),
            };

            // 第一次投票
            await act(async () => {
                await result.current.handleVoteStart('song-1', mockSong);
            });

            // 快進 100ms（小於 300ms）
            act(() => {
                vi.advanceTimersByTime(100);
            });

            // 第二次投票（應該被忽略）
            await act(async () => {
                await result.current.handleVoteStart('song-1', mockSong);
            });

            // 應該只有一次投票計數
            expect(result.current.clickCount['song-1']).toBe(1);
            expect(voteSong).toHaveBeenCalledTimes(1);
        });

        it('不同歌曲的投票應該獨立計算', async () => {
            const { result } = renderHook(() => useVoting());
            const song1 = {
                id: 'song-1',
                title: '歌曲 1',
                artist: '歌手 1',
                voteCount: 10,
                createdAt: new Date(),
            };
            const song2 = {
                id: 'song-2',
                title: '歌曲 2',
                artist: '歌手 2',
                voteCount: 20,
                createdAt: new Date(),
            };

            await act(async () => {
                await result.current.handleVoteStart('song-1', song1);
            });

            act(() => {
                vi.advanceTimersByTime(500);
            });

            await act(async () => {
                await result.current.handleVoteStart('song-2', song2);
            });

            expect(result.current.clickCount['song-1']).toBe(1);
            expect(result.current.clickCount['song-2']).toBe(1);
        });
    });

    describe('投票錯誤處理', () => {
        it('投票失敗時應該重置 votingId', async () => {
            // 設置 mock 為拋出錯誤
            vi.mocked(voteSong).mockRejectedValueOnce(new Error('投票失敗'));

            const { result } = renderHook(() => useVoting());
            const mockSong = {
                id: 'song-1',
                title: '測試歌曲',
                artist: '測試歌手',
                voteCount: 10,
                createdAt: new Date(),
            };

            await act(async () => {
                await result.current.handleVoteStart('song-1', mockSong);
            });

            expect(result.current.votingId).toBeNull();
        });
    });

    describe('狀態清理', () => {
        it('voteSuccess 應該在 800ms 後重置', async () => {
            const { result } = renderHook(() => useVoting());
            const mockSong = {
                id: 'song-1',
                title: '測試歌曲',
                artist: '測試歌手',
                voteCount: 10,
                createdAt: new Date(),
            };

            await act(async () => {
                await result.current.handleVoteStart('song-1', mockSong);
            });

            expect(result.current.voteSuccess['song-1']).toBe(true);

            // 快進 900ms
            act(() => {
                vi.advanceTimersByTime(900);
            });

            expect(result.current.voteSuccess['song-1']).toBe(false);
        });

        it('showVoteOverlay 應該在 1500ms 後清除', async () => {
            const { result } = renderHook(() => useVoting());
            const mockSong = {
                id: 'song-1',
                title: '測試歌曲',
                artist: '測試歌手',
                voteCount: 10,
                createdAt: new Date(),
            };

            await act(async () => {
                await result.current.handleVoteStart('song-1', mockSong);
            });

            expect(result.current.showVoteOverlay).not.toBeNull();

            // 快進 1600ms
            act(() => {
                vi.advanceTimersByTime(1600);
            });

            expect(result.current.showVoteOverlay).toBeNull();
        });
    });
});
