import {
    collection, doc, getDocs, addDoc, updateDoc, query, where,
    onSnapshot, Timestamp, type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import type { Song } from './types';

async function getVoteCounts(): Promise<Map<string, number>> {
    const votesRef = collection(db, COLLECTIONS.votes);
    const votesSnapshot = await getDocs(votesRef);
    const voteMap = new Map<string, number>();
    votesSnapshot.forEach((doc) => {
        const songId = doc.data().songId;
        voteMap.set(songId, (voteMap.get(songId) || 0) + 1);
    });
    return voteMap;
}

export async function getSongs(): Promise<Song[]> {
    const songsRef = collection(db, COLLECTIONS.songs);
    const songsQuery = query(songsRef, where('isActive', '==', true));
    const songsSnapshot = await getDocs(songsQuery);
    const voteMap = await getVoteCounts();

    const songs: Song[] = [];
    songsSnapshot.forEach((doc) => {
        const data = doc.data();
        songs.push({
            id: doc.id,
            title: data.title,
            artist: data.artist,
            notes: data.notes,
            lyrics: data.lyrics,
            audioUrl: data.audioUrl,
            difficulty: data.difficulty,
            isActive: data.isActive,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            voteCount: voteMap.get(doc.id) || 0,
        });
    });
    return songs;
}

export function subscribeSongs(callback: (songs: Song[]) => void): Unsubscribe {
    const songsRef = collection(db, COLLECTIONS.songs);
    const songsQuery = query(songsRef, where('isActive', '==', true));

    let songs: Map<string, any> = new Map();
    let votes: Map<string, number> = new Map();
    let playedSongs: Set<string> = new Set();
    let nowPlayingSongId: string | null = null;

    const updateCallback = () => {
        const songList: Song[] = [];
        songs.forEach((data, id) => {
            songList.push({
                id,
                title: data.title,
                artist: data.artist,
                notes: data.notes,
                lyrics: data.lyrics,
                audioUrl: data.audioUrl,
                isActive: data.isActive,
                createdAt: data.createdAt?.toDate?.() || new Date(),
                voteCount: votes.get(id) || 0,
                isPlayed: playedSongs.has(id),
                isNowPlaying: nowPlayingSongId === id,
            });
        });
        callback(songList);
    };

    const unsubSongs = onSnapshot(songsQuery, (snapshot) => {
        songs.clear();
        snapshot.forEach((doc) => songs.set(doc.id, doc.data()));
        updateCallback();
    });

    const votesRef = collection(db, COLLECTIONS.votes);
    const unsubVotes = onSnapshot(votesRef, (snapshot) => {
        votes.clear();
        snapshot.forEach((doc) => {
            const songId = doc.data().songId;
            votes.set(songId, (votes.get(songId) || 0) + 1);
        });
        updateCallback();
    });

    const playedRef = collection(db, COLLECTIONS.playedSongs);
    const unsubPlayed = onSnapshot(playedRef, (snapshot) => {
        playedSongs.clear();
        snapshot.forEach((doc) => playedSongs.add(doc.data().songId));
        updateCallback();
    });

    const nowPlayingRef = doc(db, COLLECTIONS.nowPlaying, 'current');
    const unsubNowPlaying = onSnapshot(nowPlayingRef, (docSnapshot) => {
        nowPlayingSongId = docSnapshot.exists() ? docSnapshot.data().songId : null;
        updateCallback();
    });

    return () => {
        unsubSongs();
        unsubVotes();
        unsubPlayed();
        unsubNowPlaying();
    };
}

export async function voteSong(songId: string, sessionId: string): Promise<void> {
    const votesRef = collection(db, COLLECTIONS.votes);
    await addDoc(votesRef, { songId, sessionId, createdAt: Timestamp.now() });
}

export async function addSong(title: string, artist: string, notes?: string): Promise<string> {
    const songsRef = collection(db, COLLECTIONS.songs);
    const existingQuery = query(songsRef, where('isActive', '==', true));
    const existingSnapshot = await getDocs(existingQuery);

    let isDuplicate = false;
    existingSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.title.toLowerCase() === title.toLowerCase() &&
            data.artist.toLowerCase() === artist.toLowerCase()) {
            isDuplicate = true;
        }
    });
    if (isDuplicate) throw new Error(`「${title}」- ${artist} 已存在於歌單中`);

    const newDoc = await addDoc(songsRef, {
        title, artist,
        notes: notes || null,
        isActive: true,
        createdAt: Timestamp.now(),
    });
    return newDoc.id;
}

export async function updateSong(
    songId: string,
    title: string,
    artist: string,
    extra?: { difficulty?: 1 | 2 | 3 | null }
): Promise<void> {
    const songRef = doc(db, COLLECTIONS.songs, songId);
    const payload: Record<string, string | number | null> = { title, artist };
    // null 表示「清除」, undefined 表示「不更動」
    if (extra && 'difficulty' in extra) {
        payload.difficulty = extra.difficulty ?? null;
    }
    await updateDoc(songRef, payload);
}

export async function deleteSong(songId: string): Promise<void> {
    const songRef = doc(db, COLLECTIONS.songs, songId);
    await updateDoc(songRef, { isActive: false });
}

export async function resetAllVotes(): Promise<void> {
    const { deleteDoc } = await import('firebase/firestore');
    const votesRef = collection(db, COLLECTIONS.votes);
    const votesSnapshot = await getDocs(votesRef);
    const deletePromises: Promise<void>[] = [];
    votesSnapshot.forEach((docSnapshot) => deletePromises.push(deleteDoc(docSnapshot.ref)));
    await Promise.all(deletePromises);
}

export async function batchImportSongs(
    songsList: { title: string; artist: string }[]
): Promise<{ added: number; skipped: number }> {
    const songsRef = collection(db, COLLECTIONS.songs);
    const existingSnapshot = await getDocs(songsRef);
    const existingSongs = new Set<string>();
    existingSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive !== false) {
            existingSongs.add(`${data.title.toLowerCase()}|${data.artist.toLowerCase()}`);
        }
    });

    const newSongs = songsList.filter((song) => {
        const key = `${song.title.toLowerCase()}|${song.artist.toLowerCase()}`;
        return !existingSongs.has(key);
    });

    const addPromises = newSongs.map((song) =>
        addDoc(songsRef, {
            title: song.title,
            artist: song.artist,
            isActive: true,
            createdAt: Timestamp.now(),
        })
    );
    await Promise.all(addPromises);

    return { added: newSongs.length, skipped: songsList.length - newSongs.length };
}
