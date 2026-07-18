import {
    doc, getDoc, setDoc, deleteDoc, onSnapshot, Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS, col, docRef } from '../firebase';
import type { Song, NowPlayingInfo } from './types';
import { mapSongDoc } from './songs';

export async function setNowPlaying(songId: string, adminUid: string): Promise<void> {
    const ref = docRef(COLLECTIONS.nowPlaying, 'current');
    await setDoc(ref, {
        songId,
        startedBy: adminUid,
        startedAt: Timestamp.now(),
    });
}

export async function clearNowPlaying(): Promise<void> {
    const ref = docRef(COLLECTIONS.nowPlaying, 'current');
    await deleteDoc(ref);
}

export function subscribeNowPlaying(callback: (info: NowPlayingInfo | null) => void): Unsubscribe {
    const ref = docRef(COLLECTIONS.nowPlaying, 'current');

    return onSnapshot(ref, async (docSnapshot) => {
        if (!docSnapshot.exists()) {
            callback(null);
            return;
        }
        const data = docSnapshot.data();
        const songId = data.songId;
        let song: Song | null = null;
        try {
            const songRef = docRef(COLLECTIONS.songs, songId);
            const songSnapshot = await getDoc(songRef);
            if (songSnapshot.exists()) {
                // 與主歌單共用同一套欄位轉換，避免正在彈奏浮窗漏掉
                // lyricBlocks / progression，導致已入庫的 AI 譜仍被當成外部搜尋。
                song = mapSongDoc(songSnapshot.id, songSnapshot.data());
            }
        } catch (error) {
            console.error('Failed to fetch song details:', error);
        }
        callback({
            songId,
            song,
            startedAt: data.startedAt?.toDate?.() || new Date(),
            startedBy: data.startedBy,
        });
    });
}
