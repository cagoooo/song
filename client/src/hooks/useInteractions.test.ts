// useInteractions Hook 單元測試
import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firestore 模組
const mockUnsubscribeInteractions = vi.fn();
const mockUnsubscribeRatingStats = vi.fn();
const mockSubscribeInteractions = vi.fn(() => mockUnsubscribeInteractions);
const mockSubscribeRatingStats = vi.fn(() => mockUnsubscribeRatingStats);
const mockSendTip = vi.fn();
const mockSendRating = vi.fn();
const mockGetSessionId = vi.fn(() => 'test-session-id');

vi.mock('@/lib/firestore', () => ({
    subscribeInteractions: (songId: string, callback: (interaction: unknown) => void) => {
        mockSubscribeInteractions(songId, callback);
        return mockUnsubscribeInteractions;
    },
    subscribeRatingStats: (songId: string, callback: (stats: unknown) => void) => {
        mockSubscribeRatingStats(songId, callback);
        return mockUnsubscribeRatingStats;
    },
    sendTip: mockSendTip,
    sendRating: mockSendRating,
    getSessionId: mockGetSessionId,
}));

// Import after mocking
import { useInteractions } from './useInteractions';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useInteractions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    describe('初始狀態', () => {
        it('ratingStats 初始值應為 { average: 0, count: 0, total: 0 }', () => {
            const { result } = renderHook(() =>
                useInteractions({ songId: null, enabled: true })
            );

            expect(result.current.ratingStats).toEqual({
                average: 0,
                count: 0,
                total: 0,
            });
        });

        it('isSending 初始值應為 false', () => {
            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true })
            );

            expect(result.current.isSending).toBe(false);
        });

        it('currentInteraction 初始值應為 null', () => {
            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true })
            );

            expect(result.current.currentInteraction).toBeNull();
        });

        it('songId 為 null 時 userRating 應為 null', () => {
            const { result } = renderHook(() =>
                useInteractions({ songId: null, enabled: true })
            );

            expect(result.current.userRating).toBeNull();
        });
    });

    describe('localStorage 行為', () => {
        it('應該從 localStorage 讀取已儲存的評分', () => {
            localStorageMock.getItem.mockReturnValue('4');

            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true })
            );

            expect(localStorageMock.getItem).toHaveBeenCalledWith('rating_song-1');
            expect(result.current.userRating).toBe(4);
        });

        it('localStorage 無評分時 userRating 應為 null', () => {
            localStorageMock.getItem.mockReturnValue(null);

            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true })
            );

            expect(result.current.userRating).toBeNull();
        });

        it('songId 變更時應重新讀取 localStorage', () => {
            localStorageMock.getItem.mockReturnValueOnce('3').mockReturnValueOnce('5');

            const { result, rerender } = renderHook(
                ({ songId }) => useInteractions({ songId, enabled: true }),
                { initialProps: { songId: 'song-1' } }
            );

            expect(result.current.userRating).toBe(3);

            rerender({ songId: 'song-2' });

            expect(localStorageMock.getItem).toHaveBeenCalledWith('rating_song-2');
        });
    });

    describe('訂閱行為', () => {
        it('enabled 為 false 時不應訂閱 ratingStats', () => {
            renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: false })
            );

            expect(mockSubscribeRatingStats).not.toHaveBeenCalled();
        });

        it('songId 有值且 enabled 為 true 時應訂閱 ratingStats', () => {
            renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true })
            );

            expect(mockSubscribeRatingStats).toHaveBeenCalledWith('song-1', expect.any(Function));
        });

        it('unmount 時應取消訂閱', () => {
            const { unmount } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true })
            );

            expect(mockUnsubscribeRatingStats).not.toHaveBeenCalled();
            expect(mockUnsubscribeInteractions).not.toHaveBeenCalled();

            unmount();

            expect(mockUnsubscribeRatingStats).toHaveBeenCalledTimes(1);
            expect(mockUnsubscribeInteractions).toHaveBeenCalledTimes(1);
        });
    });

    describe('打賞功能', () => {
        it('應該正常發送打賞', async () => {
            mockSendTip.mockResolvedValue(undefined);

            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true })
            );

            await act(async () => {
                await result.current.handleSendTip('❤️');
            });

            expect(mockSendTip).toHaveBeenCalledWith('song-1', '❤️', 'test-session-id');
        });

        it('songId 為 null 時不應發送打賞', async () => {
            const { result } = renderHook(() =>
                useInteractions({ songId: null, enabled: true })
            );

            await act(async () => {
                await result.current.handleSendTip('❤️');
            });

            expect(mockSendTip).not.toHaveBeenCalled();
        });

        it('發送中時不應重複發送', async () => {
            // 模擬緩慢的 API 請求
            mockSendTip.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true })
            );

            // 同時發送兩次
            act(() => {
                result.current.handleSendTip('❤️');
                result.current.handleSendTip('🌟');
            });

            // 由於 isSending 為 true，第二次應被忽略
            expect(mockSendTip).toHaveBeenCalledTimes(1);
        });
    });

    describe('評分功能', () => {
        it('應該正常發送評分並存入 localStorage', async () => {
            mockSendRating.mockResolvedValue(undefined);

            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true })
            );

            await act(async () => {
                await result.current.handleSendRating(5);
            });

            expect(mockSendRating).toHaveBeenCalledWith('song-1', 5, 'test-session-id');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('rating_song-1', '5');
            expect(result.current.userRating).toBe(5);
        });

        it('songId 為 null 時不應發送評分', async () => {
            const { result } = renderHook(() =>
                useInteractions({ songId: null, enabled: true })
            );

            await act(async () => {
                await result.current.handleSendRating(4);
            });

            expect(mockSendRating).not.toHaveBeenCalled();
        });
    });

    describe('clearCurrentInteraction', () => {
        it('應該清除當前互動', () => {
            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true })
            );

            act(() => {
                result.current.clearCurrentInteraction();
            });

            expect(result.current.currentInteraction).toBeNull();
        });
    });

    describe('管理員模式', () => {
        it('isAdmin 為 true 時應該可以看到評分動畫', () => {
            let capturedCallback: ((interaction: unknown) => void) | null = null;

            mockSubscribeInteractions.mockImplementation((songId, callback) => {
                capturedCallback = callback;
                return mockUnsubscribeInteractions;
            });

            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true, isAdmin: true })
            );

            // 模擬收到評分互動
            const ratingInteraction = { type: 'rating', rating: 5 };
            act(() => {
                if (capturedCallback) {
                    capturedCallback(ratingInteraction);
                }
            });

            expect(result.current.currentInteraction).toEqual(ratingInteraction);
        });

        it('isAdmin 為 false 時評分互動不應觸發動畫', () => {
            let capturedCallback: ((interaction: unknown) => void) | null = null;

            mockSubscribeInteractions.mockImplementation((songId, callback) => {
                capturedCallback = callback;
                return mockUnsubscribeInteractions;
            });

            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true, isAdmin: false })
            );

            // 模擬收到評分互動
            const ratingInteraction = { type: 'rating', rating: 5 };
            act(() => {
                if (capturedCallback) {
                    capturedCallback(ratingInteraction);
                }
            });

            // 訪客不應看到評分動畫
            expect(result.current.currentInteraction).toBeNull();
        });

        it('訪客可以看到打賞動畫', () => {
            let capturedCallback: ((interaction: unknown) => void) | null = null;

            mockSubscribeInteractions.mockImplementation((songId, callback) => {
                capturedCallback = callback;
                return mockUnsubscribeInteractions;
            });

            const { result } = renderHook(() =>
                useInteractions({ songId: 'song-1', enabled: true, isAdmin: false })
            );

            // 模擬收到打賞互動
            const tipInteraction = { type: 'tip', tipType: '❤️' };
            act(() => {
                if (capturedCallback) {
                    capturedCallback(tipInteraction);
                }
            });

            expect(result.current.currentInteraction).toEqual(tipInteraction);
        });
    });
});
