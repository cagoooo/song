// useNowPlaying Hook 單元測試
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firestore 模組
const mockUnsubscribe = vi.fn();
const mockSubscribeNowPlaying = vi.fn(() => mockUnsubscribe);

vi.mock('@/lib/firestore', () => ({
    subscribeNowPlaying: (callback: (info: unknown) => void) => {
        mockSubscribeNowPlaying(callback);
        return mockUnsubscribe;
    },
}));

// Import after mocking
import { useNowPlaying } from './useNowPlaying';

describe('useNowPlaying', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('初始狀態', () => {
        it('初始狀態應為 null', () => {
            const { result } = renderHook(() => useNowPlaying());
            expect(result.current).toBeNull();
        });
    });

    describe('訂閱行為', () => {
        it('應該呼叫 subscribeNowPlaying', () => {
            renderHook(() => useNowPlaying());
            expect(mockSubscribeNowPlaying).toHaveBeenCalledTimes(1);
            expect(mockSubscribeNowPlaying).toHaveBeenCalledWith(expect.any(Function));
        });

        it('unmount 時應該呼叫 unsubscribe', () => {
            const { unmount } = renderHook(() => useNowPlaying());

            expect(mockUnsubscribe).not.toHaveBeenCalled();

            unmount();

            expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        });

        it('收到新資料時應更新狀態', () => {
            let capturedCallback: ((info: unknown) => void) | null = null;

            mockSubscribeNowPlaying.mockImplementation((callback) => {
                capturedCallback = callback;
                return mockUnsubscribe;
            });

            const { result } = renderHook(() => useNowPlaying());

            expect(result.current).toBeNull();

            // 模擬接收到 nowPlaying 資料
            const mockNowPlayingInfo = {
                songId: 'song-123',
                song: {
                    id: 'song-123',
                    title: '測試歌曲',
                    artist: '測試歌手',
                    voteCount: 10,
                    createdAt: new Date(),
                    isActive: true,
                },
                startedAt: new Date(),
                startedBy: 'admin-uid',
            };

            act(() => {
                if (capturedCallback) {
                    capturedCallback(mockNowPlayingInfo);
                }
            });

            expect(result.current).toEqual(mockNowPlayingInfo);
        });

        it('收到 null 時應清除狀態', () => {
            let capturedCallback: ((info: unknown) => void) | null = null;

            mockSubscribeNowPlaying.mockImplementation((callback) => {
                capturedCallback = callback;
                return mockUnsubscribe;
            });

            const { result } = renderHook(() => useNowPlaying());

            // 先設置一個值
            const mockNowPlayingInfo = {
                songId: 'song-123',
                song: { id: 'song-123', title: '測試', artist: '測試', voteCount: 0, createdAt: new Date(), isActive: true },
                startedAt: new Date(),
                startedBy: 'admin',
            };

            act(() => {
                if (capturedCallback) {
                    capturedCallback(mockNowPlayingInfo);
                }
            });

            expect(result.current).not.toBeNull();

            // 清除狀態
            act(() => {
                if (capturedCallback) {
                    capturedCallback(null);
                }
            });

            expect(result.current).toBeNull();
        });
    });

    describe('重新渲染行為', () => {
        it('重新渲染時不應重新訂閱', () => {
            const { rerender } = renderHook(() => useNowPlaying());

            expect(mockSubscribeNowPlaying).toHaveBeenCalledTimes(1);

            rerender();
            rerender();
            rerender();

            // 不應該重新呼叫 subscribe
            expect(mockSubscribeNowPlaying).toHaveBeenCalledTimes(1);
        });
    });
});
