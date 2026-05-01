import {
    doc, getDoc, setDoc, deleteDoc, onSnapshot, Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import type { Song, NowPlayingInfo } from './types';

export async function setNowPlaying(songId: string, adminUid: string): Promise<void> {
    const ref = doc(db, COLLECTIONS.nowPlaying, 'current');
    await setDoc(ref, {
        songId,
        startedBy: adminUid,
        startedAt: Timestamp.now(),
    });
}

export async function clearNowPlaying(): Promise<void> {
    const ref = doc(db, COLLECTIONS.nowPlaying, 'current');
    await deleteDoc(ref);
}

export function subscribeNowPlaying(callback: (info: NowPlayingInfo | null) => void): Unsubscribe {
    const ref = doc(db, COLLECTIONS.nowPlaying, 'current');

    return onSnapshot(ref, async (docSnapshot) => {
        if (!docSnapshot.exists()) {
            callback(null);
            return;
        }
        const data = docSnapshot.data();
        const songId = data.songId;
        let song: Song | null = null;
        try {
            const songRef = doc(db, COLLECTIONS.songs, songId);
            const songSnapshot = await getDoc(songRef);
            if (songSnapshot.exists()) {
                const songData = songSnapshot.data();
                song = {
                    id: songSnapshot.id,
                    title: songData.title,
                    artist: songData.artist,
                    notes: songData.notes,
                    lyrics: songData.lyrics,
                    audioUrl: songData.audioUrl,
                    isActive: songData.isActive,
                    createdAt: songData.createdAt?.toDate?.() || new Date(),
                    voteCount: 0,
                };
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
