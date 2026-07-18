import {
    collection, doc, getDocs, addDoc, updateDoc, query, where,
    onSnapshot, Timestamp, writeBatch,
    type DocumentData, type Unsubscribe, type UpdateData,
} from 'firebase/firestore';
import { db, COLLECTIONS, col, docRef } from '../firebase';
import { sanitizeLyricBlocks } from '../lyrics-dsl';
import type { Song, LyricBlock } from './types';

/**
 * Firestore doc data → Song。統一 getSongs / subscribeSongs 的對應，
 * 補讀 T3 樂譜欄位（songKey / progression / lyricBlocks …）與 D5 標記 —
 * 否則存進去的譜在詳情頁讀不到（getSongDetail 會一直走 fallback）。
 */
export function mapSongDoc(
    id: string,
    data: Record<string, any>,
    extra: { voteCount?: number; isPlayed?: boolean; isNowPlaying?: boolean } = {},
): Song {
    return {
        id,
        title: data.title,
        artist: data.artist,
        notes: data.notes,
        lyrics: data.lyrics,
        audioUrl: data.audioUrl,
        difficulty: data.difficulty,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        voteCount: extra.voteCount ?? 0,
        isPlayed: extra.isPlayed,
        isNowPlaying: extra.isNowPlaying,
        // T3 樂譜欄位
        songKey: data.songKey,
        capo: data.capo,
        bpm: data.bpm,
        length: data.length,
        progression: data.progression,
        lyricBlocks: data.lyricBlocks,
        youtubeId: data.youtubeId,
        kaiNote: data.kaiNote,
        // D5 結構化標記
        version: data.version,
        mood: data.mood,
        era: data.era,
        genre: data.genre,
    };
}

async function getVoteCounts(): Promise<Map<string, number>> {
    const votesRef = col(COLLECTIONS.votes);
    const votesSnapshot = await getDocs(votesRef);
    const voteMap = new Map<string, number>();
    votesSnapshot.forEach((doc) => {
        const songId = doc.data().songId;
        voteMap.set(songId, (voteMap.get(songId) || 0) + 1);
    });
    return voteMap;
}

export async function getSongs(): Promise<Song[]> {
    const songsRef = col(COLLECTIONS.songs);
    const songsQuery = query(songsRef, where('isActive', '==', true));
    const songsSnapshot = await getDocs(songsQuery);
    const voteMap = await getVoteCounts();

    const songs: Song[] = [];
    songsSnapshot.forEach((doc) => {
        songs.push(mapSongDoc(doc.id, doc.data(), { voteCount: voteMap.get(doc.id) || 0 }));
    });
    return songs;
}

export function subscribeSongs(callback: (songs: Song[]) => void): Unsubscribe {
    const songsRef = col(COLLECTIONS.songs);
    const songsQuery = query(songsRef, where('isActive', '==', true));

    let songs: Map<string, any> = new Map();
    let votes: Map<string, number> = new Map();
    let playedSongs: Set<string> = new Set();
    let nowPlayingSongId: string | null = null;

    const updateCallback = () => {
        const songList: Song[] = [];
        songs.forEach((data, id) => {
            songList.push(mapSongDoc(id, data, {
                voteCount: votes.get(id) || 0,
                isPlayed: playedSongs.has(id),
                isNowPlaying: nowPlayingSongId === id,
            }));
        });
        callback(songList);
    };

    const unsubSongs = onSnapshot(songsQuery, (snapshot) => {
        songs.clear();
        snapshot.forEach((doc) => songs.set(doc.id, doc.data()));
        updateCallback();
    });

    const votesRef = col(COLLECTIONS.votes);
    const unsubVotes = onSnapshot(votesRef, (snapshot) => {
        votes.clear();
        snapshot.forEach((doc) => {
            const songId = doc.data().songId;
            votes.set(songId, (votes.get(songId) || 0) + 1);
        });
        updateCallback();
    });

    const playedRef = col(COLLECTIONS.playedSongs);
    const unsubPlayed = onSnapshot(playedRef, (snapshot) => {
        playedSongs.clear();
        snapshot.forEach((doc) => playedSongs.add(doc.data().songId));
        updateCallback();
    });

    const nowPlayingRef = docRef(COLLECTIONS.nowPlaying, 'current');
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
    const votesRef = col(COLLECTIONS.votes);
    await addDoc(votesRef, { songId, sessionId, createdAt: Timestamp.now() });
}

export async function addSong(title: string, artist: string, notes?: string): Promise<string> {
    const songsRef = col(COLLECTIONS.songs);
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

export interface SongChartInput {
    title: string;
    artist: string;
    songKey?: string | null;
    capo?: number | null;
    progression?: string[];
    lyricBlocks?: LyricBlock[];
    kaiNote?: string | null;
}

/**
 * 新增「帶完整樂譜」的歌曲（轉調工具一鍵入庫用）。
 * 只寫有值的樂譜欄位，符合 firestore.rules isValidSongPayload 的型別/長度限制。
 * 重複（同名同歌手）會丟錯。需 admin 權限（rules 限制 songs create 為 admin）。
 */
export async function addSongWithChart(input: SongChartInput): Promise<string> {
    const songsRef = col(COLLECTIONS.songs);
    const existingSnapshot = await getDocs(query(songsRef, where('isActive', '==', true)));

    const title = input.title.trim();
    const artist = input.artist.trim() || '不確定';
    let isDuplicate = false;
    existingSnapshot.forEach((d) => {
        const data = d.data();
        if (data.title?.toLowerCase() === title.toLowerCase() &&
            data.artist?.toLowerCase() === artist.toLowerCase()) {
            isDuplicate = true;
        }
    });
    if (isDuplicate) throw new Error(`「${title}」- ${artist} 已存在於歌單中`);

    const payload: Record<string, unknown> = {
        title, artist,
        isActive: true,
        createdAt: Timestamp.now(),
    };
    if (input.songKey) payload.songKey = input.songKey.slice(0, 10);
    if (typeof input.capo === 'number') payload.capo = Math.max(0, Math.min(12, input.capo));
    if (input.progression?.length) payload.progression = input.progression;
    if (input.lyricBlocks?.length) payload.lyricBlocks = sanitizeLyricBlocks(input.lyricBlocks);
    if (input.kaiNote) payload.kaiNote = input.kaiNote.slice(0, 500);

    const newDoc = await addDoc(songsRef, payload);
    return newDoc.id;
}

/**
 * 把轉調工具完成的譜覆寫回歌單既有歌曲。
 * 只更新歌曲基本資料與樂譜欄位，其餘票數、彈奏狀態及結構化標籤均保留。
 */
export async function updateSongChart(songId: string, input: SongChartInput): Promise<void> {
    const songRef = docRef(COLLECTIONS.songs, songId);
    const title = input.title.trim();
    const artist = input.artist.trim() || '不確定';
    const payload: UpdateData<DocumentData> = {
        title,
        artist,
        songKey: input.songKey ? input.songKey.slice(0, 10) : null,
        progression: input.progression?.length ? input.progression : [],
        lyricBlocks: input.lyricBlocks?.length ? sanitizeLyricBlocks(input.lyricBlocks) : [],
        kaiNote: input.kaiNote ? input.kaiNote.slice(0, 500) : null,
    };
    if (typeof input.capo === 'number') {
        payload.capo = Math.max(0, Math.min(12, input.capo));
    }
    await updateDoc(songRef, payload);
}

export async function updateSong(
    songId: string,
    title: string,
    artist: string,
    extra?: { difficulty?: 1 | 2 | 3 | null }
): Promise<void> {
    const songRef = docRef(COLLECTIONS.songs, songId);
    const payload: Record<string, string | number | null> = { title, artist };
    // null 表示「清除」, undefined 表示「不更動」
    if (extra && 'difficulty' in extra) {
        payload.difficulty = extra.difficulty ?? null;
    }
    await updateDoc(songRef, payload);
}

export async function deleteSong(songId: string): Promise<void> {
    const songRef = docRef(COLLECTIONS.songs, songId);
    await updateDoc(songRef, { isActive: false });
}

export async function resetAllVotes(): Promise<number> {
    const votesRef = col(COLLECTIONS.votes);
    const votesSnapshot = await getDocs(votesRef);
    if (votesSnapshot.empty) return 0;

    const batchSize = 450;
    let batch = writeBatch(db);
    let pending = 0;
    let deleted = 0;

    for (const docSnapshot of votesSnapshot.docs) {
        batch.delete(docSnapshot.ref);
        pending += 1;
        deleted += 1;

        if (pending >= batchSize) {
            await batch.commit();
            batch = writeBatch(db);
            pending = 0;
        }
    }

    if (pending > 0) {
        await batch.commit();
    }

    return deleted;
}

export async function batchImportSongs(
    songsList: { title: string; artist: string }[]
): Promise<{ added: number; skipped: number }> {
    const songsRef = col(COLLECTIONS.songs);
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
