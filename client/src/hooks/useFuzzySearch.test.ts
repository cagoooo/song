// useFuzzySearch Hook 測試
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFuzzySearch } from './useFuzzySearch';
import type { Song } from '@/lib/firestore';

// Mock 歌曲資料
const mockSongs: Song[] = [
    {
        id: '1',
        title: '告白氣球',
        artist: '周杰倫',
        votes: 10,
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        updatedAt: { seconds: 0, nanoseconds: 0 } as any,
    },
    {
        id: '2',
        title: '小幸運',
        artist: '田馥甄',
        votes: 8,
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        updatedAt: { seconds: 0, nanoseconds: 0 } as any,
    },
    {
        id: '3',
        title: '慢慢喜歡你',
        artist: '莫文蔚',
        votes: 6,
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        updatedAt: { seconds: 0, nanoseconds: 0 } as any,
    },
    {
        id: '4',
        title: 'Shape of You',
        artist: 'Ed Sheeran',
        votes: 12,
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        updatedAt: { seconds: 0, nanoseconds: 0 } as any,
    },
    {
        id: '5',
        title: '晴天',
        artist: '周杰倫',
        votes: 15,
        createdAt: { seconds: 0, nanoseconds: 0 } as any,
        updatedAt: { seconds: 0, nanoseconds: 0 } as any,
    },
];

describe('useFuzzySearch', () => {
    describe('基本功能', () => {
        it('應該返回 search 函式和 fuse 實例', () => {
            const { result } = renderHook(() => useFuzzySearch(mockSongs));

            expect(result.current.search).toBeDefined();
            expect(typeof result.current.search).toBe('function');
            expect(result.current.fuse).toBeDefined();
        });

        it('空搜尋字串應該返回所有歌曲', () => {
            const { result } = renderHook(() => useFuzzySearch(mockSongs));

            const results = result.current.search('');
            expect(results).toEqual(mockSongs);
        });

        it('只有空白的搜尋字串應該返回所有歌曲', () => {
            const { result } = renderHook(() => useFuzzySearch(mockSongs));

            const results = result.current.search('   ');
            expect(results).toEqual(mockSongs);
        });
    });

    describe('精確匹配', () => {
        it('應該能精確匹配歌曲標題', () => {
            const { result } = renderHook(() => useFuzzySearch(mockSongs));

            const results = result.current.search('告白氣球');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].title).toBe('告白氣球');
        });

        it('應該能精確匹配歌手名稱', () => {
            const { result } = renderHook(() => useFuzzySearch(mockSongs));

            const results = result.current.search('周杰倫');
            expect(results.length).toBe(2); // 告白氣球 和 晴天
            expect(results.every(song => song.artist === '周杰倫')).toBe(true);
        });

        it('應該能匹配英文歌曲', () => {
            const { result } = renderHook(() => useFuzzySearch(mockSongs));

            const results = result.current.search('Shape of You');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].title).toBe('Shape of You');
        });
    });

    describe('模糊匹配', () => {
        it('應該能模糊匹配部分標題', () => {
            const { result } = renderHook(() => useFuzzySearch(mockSongs));

            const results = result.current.search('告白');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].title).toContain('告白');
        });

        it('應該能模糊匹配部分歌手名稱', () => {
            const { result } = renderHook(() => useFuzzySearch(mockSongs));

            const results = result.current.search('Sheeran');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].artist).toContain('Sheeran');
        });
    });

    describe('自訂選項', () => {
        it('應該支援自訂 threshold', () => {
            const { result } = renderHook(() =>
                useFuzzySearch(mockSongs, { threshold: 0.1 })
            );

            // 低 threshold = 更嚴格的匹配
            const results = result.current.search('告白氣球');
            expect(results.length).toBeGreaterThan(0);
        });

        it('歌曲列表更新時應該重新建立 Fuse 實例', () => {
            const { result, rerender } = renderHook(
                ({ songs }) => useFuzzySearch(songs),
                { initialProps: { songs: mockSongs } }
            );

            const initialFuse = result.current.fuse;

            // 更新歌曲列表
            const newSongs = [...mockSongs, {
                id: '6',
                title: '新歌曲',
                artist: '新歌手',
                votes: 0,
                createdAt: { seconds: 0, nanoseconds: 0 } as any,
                updatedAt: { seconds: 0, nanoseconds: 0 } as any,
            }];

            rerender({ songs: newSongs });

            // Fuse 實例應該更新
            expect(result.current.fuse).not.toBe(initialFuse);

            // 應該能搜尋到新歌曲
            const results = result.current.search('新歌曲');
            expect(results.length).toBeGreaterThan(0);
        });
    });
});
