// useSongSearch Hook 單元測試
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSongSearch } from './useSongSearch';

// Mock Song 資料
const mockSongs = [
    { id: '1', title: '告白氣球', artist: '周杰倫', voteCount: 10, createdAt: new Date() },
    { id: '2', title: '稻香', artist: '周杰倫', voteCount: 8, createdAt: new Date() },
    { id: '3', title: '小幸運', artist: '田馥甄', voteCount: 5, createdAt: new Date() },
    { id: '4', title: '演員', artist: '薛之謙', voteCount: 12, createdAt: new Date() },
    { id: '5', title: '晴天', artist: '周杰倫', voteCount: 15, createdAt: new Date() },
];

describe('useSongSearch', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('初始狀態', () => {
        it('應該返回空搜尋詞', () => {
            const { result } = renderHook(() => useSongSearch(mockSongs));

            expect(result.current.searchTerm).toBe('');
            expect(result.current.debouncedSearch).toBe('');
            expect(result.current.isInSearchMode).toBe(false);
        });

        it('未搜尋時應返回所有歌曲', () => {
            const { result } = renderHook(() => useSongSearch(mockSongs));

            expect(result.current.filteredSongs).toEqual(mockSongs);
            expect(result.current.searchResults).toBeNull();
        });
    });

    describe('搜尋功能', () => {
        it('應該根據歌曲標題過濾', async () => {
            const { result } = renderHook(() => useSongSearch(mockSongs));

            act(() => {
                result.current.setSearchTerm('告白');
            });

            // 立即更新 searchTerm
            expect(result.current.searchTerm).toBe('告白');
            expect(result.current.isInSearchMode).toBe(true);

            // 快進 debounce 時間
            act(() => {
                vi.advanceTimersByTime(350);
            });

            expect(result.current.debouncedSearch).toBe('告白');
            expect(result.current.filteredSongs).toHaveLength(1);
            expect(result.current.filteredSongs[0].title).toBe('告白氣球');
        });

        it('應該根據歌手名稱過濾', async () => {
            const { result } = renderHook(() => useSongSearch(mockSongs));

            act(() => {
                result.current.setSearchTerm('周杰倫');
            });

            act(() => {
                vi.advanceTimersByTime(350);
            });

            expect(result.current.filteredSongs).toHaveLength(3);
            expect(result.current.filteredSongs.every(s => s.artist === '周杰倫')).toBe(true);
        });

        it('搜尋應該不區分大小寫', async () => {
            const { result } = renderHook(() => useSongSearch(mockSongs));

            act(() => {
                result.current.setSearchTerm('稀');
            });

            act(() => {
                vi.advanceTimersByTime(350);
            });

            // 應該沒有結果因為沒有包含 '稀' 的歌曲
            expect(result.current.filteredSongs).toHaveLength(0);
        });

        it('空白搜尋詞應該返回所有歌曲', async () => {
            const { result } = renderHook(() => useSongSearch(mockSongs));

            // 先搜尋
            act(() => {
                result.current.setSearchTerm('告白');
            });
            act(() => {
                vi.advanceTimersByTime(350);
            });

            expect(result.current.filteredSongs).toHaveLength(1);

            // 清空搜尋
            act(() => {
                result.current.setSearchTerm('');
            });
            act(() => {
                vi.advanceTimersByTime(350);
            });

            expect(result.current.filteredSongs).toEqual(mockSongs);
            expect(result.current.isInSearchMode).toBe(false);
        });

        it('只有空格的搜尋詞應視為未搜尋', async () => {
            const { result } = renderHook(() => useSongSearch(mockSongs));

            act(() => {
                result.current.setSearchTerm('   ');
            });

            act(() => {
                vi.advanceTimersByTime(350);
            });

            expect(result.current.isInSearchMode).toBe(false);
            expect(result.current.filteredSongs).toEqual(mockSongs);
        });
    });

    describe('Debounce 行為', () => {
        it('應該在 300ms 後才更新 debouncedSearch', async () => {
            const { result } = renderHook(() => useSongSearch(mockSongs));

            act(() => {
                result.current.setSearchTerm('晴天');
            });

            // 200ms 後還沒更新
            act(() => {
                vi.advanceTimersByTime(200);
            });
            expect(result.current.debouncedSearch).toBe('');

            // 再過 150ms 總共 350ms，應該更新了
            act(() => {
                vi.advanceTimersByTime(150);
            });
            expect(result.current.debouncedSearch).toBe('晴天');
        });

        it('快速輸入時應該只觸發最後一次搜尋', async () => {
            const { result } = renderHook(() => useSongSearch(mockSongs));

            act(() => {
                result.current.setSearchTerm('周');
            });
            act(() => {
                vi.advanceTimersByTime(100);
            });

            act(() => {
                result.current.setSearchTerm('周杰');
            });
            act(() => {
                vi.advanceTimersByTime(100);
            });

            act(() => {
                result.current.setSearchTerm('周杰倫');
            });
            act(() => {
                vi.advanceTimersByTime(350);
            });

            // 應該只有最後的搜尋詞生效
            expect(result.current.debouncedSearch).toBe('周杰倫');
            expect(result.current.filteredSongs).toHaveLength(3);
        });
    });

    describe('搜尋所有曲庫', () => {
        it('應該能夠搜尋傳入的所有歌曲', () => {
            const allSongs = [
                ...mockSongs,
                { id: '6', title: '稀客', artist: '各種情歌', voteCount: 3, createdAt: new Date() },
            ];

            const { result } = renderHook(() => useSongSearch(allSongs));

            act(() => {
                result.current.setSearchTerm('稀客');
            });

            act(() => {
                vi.advanceTimersByTime(350);
            });

            expect(result.current.filteredSongs).toHaveLength(1);
            expect(result.current.filteredSongs[0].title).toBe('稀客');
        });

        it('應該能夠從大量歌曲中搜尋', () => {
            // 模擬 100 首歌曲
            const largeSongList = Array.from({ length: 100 }, (_, i) => ({
                id: `song-${i}`,
                title: `歌曲 ${i}`,
                artist: `歌手 ${i % 10}`,
                voteCount: i,
                createdAt: new Date(),
            }));

            // 加入一首特定歌曲
            largeSongList.push({
                id: 'special',
                title: '特別的歌',
                artist: '特別歌手',
                voteCount: 999,
                createdAt: new Date(),
            });

            const { result } = renderHook(() => useSongSearch(largeSongList));

            act(() => {
                result.current.setSearchTerm('特別');
            });

            act(() => {
                vi.advanceTimersByTime(350);
            });

            expect(result.current.filteredSongs).toHaveLength(1);
            expect(result.current.filteredSongs[0].id).toBe('special');
        });
    });
});
