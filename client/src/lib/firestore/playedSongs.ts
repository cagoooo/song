import {
    collection, getDocs, addDoc, deleteDoc, query, where, Timestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';

export async function markSongAsPlayed(songId: string, adminUid: string): Promise<void> {
    const playedRef = collection(db, COLLECTIONS.playedSongs);
    const existingQuery = query(playedRef, where('songId', '==', songId));
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) return;
    await addDoc(playedRef, {
        songId,
        playedBy: adminUid,
        playedAt: Timestamp.now(),
    });
}

export async function unmarkSongAsPlayed(songId: string): Promise<void> {
    const playedRef = collection(db, COLLECTIONS.playedSongs);
    const deleteQuery = query(playedRef, where('songId', '==', songId));
    const snapshot = await getDocs(deleteQuery);
    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((d) => deletePromises.push(deleteDoc(d.ref)));
    await Promise.all(deletePromises);
}

export async function resetAllPlayedSongs(): Promise<void> {
    const playedRef = collection(db, COLLECTIONS.playedSongs);
    const snapshot = await getDocs(playedRef);
    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((d) => deletePromises.push(deleteDoc(d.ref)));
    await Promise.all(deletePromises);
}
