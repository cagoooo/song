// 標籤系統 Firestore Hook
import { useState, useEffect, useCallback } from 'react';
import {
    getTags,
    addTag as addTagToFirestore,
    deleteTag as deleteTagFromFirestore,
    getSongTags,
    addSongTag as addSongTagToFirestore,
    removeSongTag as removeSongTagFromFirestore,
    type Tag,
} from '@/lib/firestore';
import { handleFirestoreError } from '@/lib/error-handler';

interface UseTagsOptions {
    songId?: string;
    autoLoad?: boolean;
}

interface UseTagsReturn {
    // 所有標籤
    tags: Tag[];
    isLoadingTags: boolean;

    // 歌曲標籤
    songTags: Tag[];
    isLoadingSongTags: boolean;

    // 操作
    loadTags: () => Promise<void>;
    loadSongTags: (songId: string) => Promise<void>;
    addTag: (name: string) => Promise<string | null>;
    deleteTag: (tagId: string) => Promise<boolean>;
    addSongTag: (songId: string, tagId: string) => Promise<boolean>;
    removeSongTag: (songId: string, tagId: string) => Promise<boolean>;

    // 錯誤
    error: string | null;
    clearError: () => void;
}

export function useTags(options: UseTagsOptions = {}): UseTagsReturn {
    const { songId, autoLoad = true } = options;

    const [tags, setTags] = useState<Tag[]>([]);
    const [songTags, setSongTags] = useState<Tag[]>([]);
    const [isLoadingTags, setIsLoadingTags] = useState(false);
    const [isLoadingSongTags, setIsLoadingSongTags] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => setError(null), []);

    // 載入所有標籤
    const loadTags = useCallback(async () => {
        setIsLoadingTags(true);
        setError(null);
        try {
            const result = await getTags();
            setTags(result);
        } catch (err) {
            setError(handleFirestoreError(err));
        } finally {
            setIsLoadingTags(false);
        }
    }, []);

    // 載入歌曲標籤
    const loadSongTags = useCallback(async (targetSongId: string) => {
        setIsLoadingSongTags(true);
        setError(null);
        try {
            const result = await getSongTags(targetSongId);
            setSongTags(result);
        } catch (err) {
            setError(handleFirestoreError(err));
        } finally {
            setIsLoadingSongTags(false);
        }
    }, []);

    // 新增標籤
    const addTag = useCallback(async (name: string): Promise<string | null> => {
        setError(null);
        try {
            const id = await addTagToFirestore(name);
            // 重新載入標籤列表
            await loadTags();
            return id;
        } catch (err) {
            setError(handleFirestoreError(err));
            return null;
        }
    }, [loadTags]);

    // 刪除標籤
    const deleteTag = useCallback(async (tagId: string): Promise<boolean> => {
        setError(null);
        try {
            await deleteTagFromFirestore(tagId);
            // 重新載入標籤列表
            await loadTags();
            return true;
        } catch (err) {
            setError(handleFirestoreError(err));
            return false;
        }
    }, [loadTags]);

    // 為歌曲新增標籤
    const addSongTag = useCallback(async (targetSongId: string, tagId: string): Promise<boolean> => {
        setError(null);
        try {
            await addSongTagToFirestore(targetSongId, tagId);
            // 重新載入歌曲標籤
            await loadSongTags(targetSongId);
            return true;
        } catch (err) {
            setError(handleFirestoreError(err));
            return false;
        }
    }, [loadSongTags]);

    // 移除歌曲標籤
    const removeSongTag = useCallback(async (targetSongId: string, tagId: string): Promise<boolean> => {
        setError(null);
        try {
            await removeSongTagFromFirestore(targetSongId, tagId);
            // 重新載入歌曲標籤
            await loadSongTags(targetSongId);
            return true;
        } catch (err) {
            setError(handleFirestoreError(err));
            return false;
        }
    }, [loadSongTags]);

    // 自動載入
    useEffect(() => {
        if (autoLoad) {
            loadTags();
        }
    }, [autoLoad, loadTags]);

    useEffect(() => {
        if (autoLoad && songId) {
            loadSongTags(songId);
        }
    }, [autoLoad, songId, loadSongTags]);

    return {
        tags,
        isLoadingTags,
        songTags,
        isLoadingSongTags,
        loadTags,
        loadSongTags,
        addTag,
        deleteTag,
        addSongTag,
        removeSongTag,
        error,
        clearError,
    };
}
