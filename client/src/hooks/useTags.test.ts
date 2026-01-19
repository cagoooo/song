// useTags Hook 測試
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firestore 模組
vi.mock('@/lib/firestore', () => ({
    getTags: vi.fn(),
    addTag: vi.fn(),
    deleteTag: vi.fn(),
    getSongTags: vi.fn(),
    addSongTag: vi.fn(),
    removeSongTag: vi.fn(),
}));

// Mock error-handler 模組
vi.mock('@/lib/error-handler', () => ({
    handleFirestoreError: vi.fn((err) => err.message || '未知錯誤'),
}));

import { useTags } from './use-tags';
import {
    getTags,
    addTag as addTagToFirestore,
    deleteTag as deleteTagFromFirestore,
    getSongTags,
    addSongTag as addSongTagToFirestore,
    removeSongTag as removeSongTagFromFirestore,
} from '@/lib/firestore';

const mockTags = [
    { id: 'tag1', name: '華語' },
    { id: 'tag2', name: '西洋' },
    { id: 'tag3', name: '日韓' },
];

const mockSongTags = [
    { id: 'tag1', name: '華語' },
    { id: 'tag2', name: '西洋' },
];

describe('useTags', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getTags as any).mockResolvedValue(mockTags);
        (getSongTags as any).mockResolvedValue(mockSongTags);
        (addTagToFirestore as any).mockResolvedValue('newTagId');
        (deleteTagFromFirestore as any).mockResolvedValue(undefined);
        (addSongTagToFirestore as any).mockResolvedValue(undefined);
        (removeSongTagFromFirestore as any).mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('初始化', () => {
        it('autoLoad 為 true 時應自動載入標籤', async () => {
            const { result } = renderHook(() => useTags({ autoLoad: true }));

            await waitFor(() => {
                expect(result.current.isLoadingTags).toBe(false);
            });

            expect(getTags).toHaveBeenCalled();
            expect(result.current.tags).toEqual(mockTags);
        });

        it('autoLoad 為 false 時不應自動載入', async () => {
            const { result } = renderHook(() => useTags({ autoLoad: false }));

            // 給一點時間確保不會呼叫
            await new Promise((r) => setTimeout(r, 100));

            expect(getTags).not.toHaveBeenCalled();
            expect(result.current.tags).toEqual([]);
        });

        it('提供 songId 時應自動載入歌曲標籤', async () => {
            const { result } = renderHook(() =>
                useTags({ autoLoad: true, songId: 'song123' })
            );

            await waitFor(() => {
                expect(result.current.isLoadingSongTags).toBe(false);
            });

            expect(getSongTags).toHaveBeenCalledWith('song123');
            expect(result.current.songTags).toEqual(mockSongTags);
        });
    });

    describe('loadTags', () => {
        it('應該載入所有標籤', async () => {
            const { result } = renderHook(() => useTags({ autoLoad: false }));

            await act(async () => {
                await result.current.loadTags();
            });

            expect(getTags).toHaveBeenCalled();
            expect(result.current.tags).toEqual(mockTags);
        });

        it('載入失敗時應設定錯誤', async () => {
            (getTags as any).mockRejectedValue(new Error('網路錯誤'));

            const { result } = renderHook(() => useTags({ autoLoad: false }));

            await act(async () => {
                await result.current.loadTags();
            });

            expect(result.current.error).toBe('網路錯誤');
        });
    });

    describe('loadSongTags', () => {
        it('應該載入指定歌曲的標籤', async () => {
            const { result } = renderHook(() => useTags({ autoLoad: false }));

            await act(async () => {
                await result.current.loadSongTags('song456');
            });

            expect(getSongTags).toHaveBeenCalledWith('song456');
            expect(result.current.songTags).toEqual(mockSongTags);
        });
    });

    describe('addTag', () => {
        it('應該新增標籤並重新載入', async () => {
            const { result } = renderHook(() => useTags({ autoLoad: false }));

            let newTagId: string | null = null;
            await act(async () => {
                newTagId = await result.current.addTag('新標籤');
            });

            expect(addTagToFirestore).toHaveBeenCalledWith('新標籤');
            expect(newTagId).toBe('newTagId');
            expect(getTags).toHaveBeenCalled(); // 重新載入
        });

        it('新增失敗時應返回 null', async () => {
            (addTagToFirestore as any).mockRejectedValue(new Error('新增失敗'));

            const { result } = renderHook(() => useTags({ autoLoad: false }));

            let newTagId: string | null = 'placeholder';
            await act(async () => {
                newTagId = await result.current.addTag('新標籤');
            });

            expect(newTagId).toBeNull();
            expect(result.current.error).toBe('新增失敗');
        });
    });

    describe('deleteTag', () => {
        it('應該刪除標籤並重新載入', async () => {
            const { result } = renderHook(() => useTags({ autoLoad: false }));

            let success = false;
            await act(async () => {
                success = await result.current.deleteTag('tag1');
            });

            expect(deleteTagFromFirestore).toHaveBeenCalledWith('tag1');
            expect(success).toBe(true);
            expect(getTags).toHaveBeenCalled(); // 重新載入
        });
    });

    describe('addSongTag', () => {
        it('應該為歌曲新增標籤', async () => {
            const { result } = renderHook(() => useTags({ autoLoad: false }));

            let success = false;
            await act(async () => {
                success = await result.current.addSongTag('song123', 'tag1');
            });

            expect(addSongTagToFirestore).toHaveBeenCalledWith('song123', 'tag1');
            expect(success).toBe(true);
        });
    });

    describe('removeSongTag', () => {
        it('應該移除歌曲的標籤', async () => {
            const { result } = renderHook(() => useTags({ autoLoad: false }));

            let success = false;
            await act(async () => {
                success = await result.current.removeSongTag('song123', 'tag1');
            });

            expect(removeSongTagFromFirestore).toHaveBeenCalledWith('song123', 'tag1');
            expect(success).toBe(true);
        });
    });

    describe('clearError', () => {
        it('應該清除錯誤訊息', async () => {
            (getTags as any).mockRejectedValue(new Error('測試錯誤'));

            const { result } = renderHook(() => useTags({ autoLoad: false }));

            await act(async () => {
                await result.current.loadTags();
            });

            expect(result.current.error).toBe('測試錯誤');

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });
});
