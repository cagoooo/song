import { useEffect, useState, useMemo } from 'react';
import { subscribeAllTagData, type Tag } from '@/lib/firestore';

interface AllSongTagsState {
    allTags: Tag[];
    songTagsMap: Map<string, string[]>;
    isLoading: boolean;
}

/**
 * 即時訂閱所有標籤 + songTags 關聯。
 * 一次性訂閱，整個 App 共用，避免每張 SongCard 各自拉一次。
 */
export function useAllSongTags(): AllSongTagsState & {
    /** 給定 songId 回傳掛在它上面的 Tag 物件陣列 */
    getTagsForSong: (songId: string) => Tag[];
    /** 計算各 tag 在曲庫中被掛的歌曲數 */
    tagSongCount: Map<string, number>;
} {
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [songTagsMap, setSongTagsMap] = useState<Map<string, string[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsub = subscribeAllTagData((data) => {
            setAllTags(data.allTags);
            setSongTagsMap(data.songTagsMap);
            setIsLoading(false);
        });
        return unsub;
    }, []);

    const tagsById = useMemo(() => {
        const m = new Map<string, Tag>();
        allTags.forEach((t) => m.set(t.id, t));
        return m;
    }, [allTags]);

    const getTagsForSong = useMemo(() => {
        return (songId: string): Tag[] => {
            const ids = songTagsMap.get(songId) ?? [];
            return ids
                .map((id) => tagsById.get(id))
                .filter((t): t is Tag => !!t);
        };
    }, [songTagsMap, tagsById]);

    const tagSongCount = useMemo(() => {
        const counts = new Map<string, number>();
        songTagsMap.forEach((tagIds) => {
            tagIds.forEach((tid) => counts.set(tid, (counts.get(tid) ?? 0) + 1));
        });
        return counts;
    }, [songTagsMap]);

    return { allTags, songTagsMap, isLoading, getTagsForSong, tagSongCount };
}
