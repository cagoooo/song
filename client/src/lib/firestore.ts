// Firestore 資料層 - 取代原有 API 呼叫
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';

// ==================== 類型定義 ====================

export interface Song {
    id: string;
    title: string;
    artist: string;
    notes?: string;
    lyrics?: string;
    audioUrl?: string;
    isActive: boolean;
    createdAt: Date;
    voteCount: number;
}

export interface SongSuggestion {
    id: string;
    title: string;
    artist: string;
    suggestedBy?: string;
    notes?: string;
    status: 'pending' | 'approved' | 'rejected' | 'added_to_playlist';
    createdAt: Date;
    processedAt?: Date;
}

export interface Tag {
    id: string;
    name: string;
}

// ==================== 歌曲相關 ====================

// 計算歌曲投票數
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

// 取得所有歌曲（含投票數）
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
            isActive: data.isActive,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            voteCount: voteMap.get(doc.id) || 0,
        });
    });

    return songs;
}

// 即時監聽歌曲更新
export function subscribeSongs(callback: (songs: Song[]) => void): Unsubscribe {
    const songsRef = collection(db, COLLECTIONS.songs);
    const songsQuery = query(songsRef, where('isActive', '==', true));

    // 同時監聽歌曲和投票
    let songs: Map<string, any> = new Map();
    let votes: Map<string, number> = new Map();

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
            });
        });
        callback(songList);
    };

    const unsubSongs = onSnapshot(songsQuery, (snapshot) => {
        songs.clear();
        snapshot.forEach((doc) => {
            songs.set(doc.id, doc.data());
        });
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

    return () => {
        unsubSongs();
        unsubVotes();
    };
}

// 投票給歌曲
export async function voteSong(songId: string, sessionId: string): Promise<void> {
    const votesRef = collection(db, COLLECTIONS.votes);
    await addDoc(votesRef, {
        songId,
        sessionId,
        createdAt: Timestamp.now(),
    });
}

// 新增歌曲（管理員）
export async function addSong(title: string, artist: string, notes?: string): Promise<string> {
    const songsRef = collection(db, COLLECTIONS.songs);

    // 檢查是否重複
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

    if (isDuplicate) {
        throw new Error(`「${title}」- ${artist} 已存在於歌單中`);
    }

    const newDoc = await addDoc(songsRef, {
        title,
        artist,
        notes: notes || null,
        isActive: true,
        createdAt: Timestamp.now(),
    });

    return newDoc.id;
}

// 更新歌曲（管理員）
export async function updateSong(songId: string, title: string, artist: string): Promise<void> {
    const songRef = doc(db, COLLECTIONS.songs, songId);
    await updateDoc(songRef, { title, artist });
}

// 刪除歌曲（軟刪除，管理員）
export async function deleteSong(songId: string): Promise<void> {
    const songRef = doc(db, COLLECTIONS.songs, songId);
    await updateDoc(songRef, { isActive: false });
}

// 重置所有投票（管理員）
export async function resetAllVotes(): Promise<void> {
    const votesRef = collection(db, COLLECTIONS.votes);
    const votesSnapshot = await getDocs(votesRef);

    const deletePromises: Promise<void>[] = [];
    votesSnapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref));
    });

    await Promise.all(deletePromises);
}

// 批次匯入歌曲（管理員）
export async function batchImportSongs(
    songsList: { title: string; artist: string }[]
): Promise<{ added: number; skipped: number }> {
    const songsRef = collection(db, COLLECTIONS.songs);

    // 取得現有歌曲
    const existingSnapshot = await getDocs(songsRef);
    const existingSongs = new Set<string>();
    existingSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive !== false) {
            existingSongs.add(`${data.title.toLowerCase()}|${data.artist.toLowerCase()}`);
        }
    });

    // 過濾重複
    const newSongs = songsList.filter((song) => {
        const key = `${song.title.toLowerCase()}|${song.artist.toLowerCase()}`;
        return !existingSongs.has(key);
    });

    // 新增歌曲
    const addPromises = newSongs.map((song) =>
        addDoc(songsRef, {
            title: song.title,
            artist: song.artist,
            isActive: true,
            createdAt: Timestamp.now(),
        })
    );

    await Promise.all(addPromises);

    return {
        added: newSongs.length,
        skipped: songsList.length - newSongs.length,
    };
}

// ==================== 歌曲建議相關 ====================

// 取得所有建議
export async function getSuggestions(): Promise<SongSuggestion[]> {
    const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);
    const suggestionsSnapshot = await getDocs(suggestionsRef);

    const suggestions: SongSuggestion[] = [];
    suggestionsSnapshot.forEach((doc) => {
        const data = doc.data();
        suggestions.push({
            id: doc.id,
            title: data.title,
            artist: data.artist,
            suggestedBy: data.suggestedBy,
            notes: data.notes,
            status: data.status,
            createdAt: data.createdAt?.toDate?.() || new Date(),
        });
    });

    // 按時間排序
    suggestions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return suggestions;
}

// 即時監聽建議更新
export function subscribeSuggestions(callback: (suggestions: SongSuggestion[]) => void): Unsubscribe {
    const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);

    return onSnapshot(suggestionsRef, (snapshot) => {
        const suggestions: SongSuggestion[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            suggestions.push({
                id: doc.id,
                title: data.title,
                artist: data.artist,
                suggestedBy: data.suggestedBy,
                notes: data.notes,
                status: data.status,
                createdAt: data.createdAt?.toDate?.() || new Date(),
            });
        });

        suggestions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(suggestions);
    });
}

// 新增建議
export async function addSuggestion(
    title: string,
    artist: string,
    suggestedBy?: string,
    notes?: string
): Promise<string> {
    const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);

    const newDoc = await addDoc(suggestionsRef, {
        title: title.trim(),
        artist: artist?.trim() || '不確定',
        suggestedBy: suggestedBy?.trim() || null,
        notes: notes?.trim() || null,
        status: 'pending',
        createdAt: Timestamp.now(),
    });

    return newDoc.id;
}

// 更新建議狀態（管理員）
export async function updateSuggestionStatus(
    suggestionId: string,
    status: SongSuggestion['status']
): Promise<void> {
    const suggestionRef = doc(db, COLLECTIONS.songSuggestions, suggestionId);
    await updateDoc(suggestionRef, { status });
}

// 刪除建議（管理員）
export async function deleteSuggestion(suggestionId: string): Promise<void> {
    const suggestionRef = doc(db, COLLECTIONS.songSuggestions, suggestionId);
    await deleteDoc(suggestionRef);
}

// 將建議加入歌單（管理員）
export async function addSuggestionToPlaylist(
    suggestionId: string,
    title: string,
    artist: string
): Promise<string> {
    // 新增歌曲
    const songId = await addSong(title, artist);

    // 更新建議狀態
    const suggestionRef = doc(db, COLLECTIONS.songSuggestions, suggestionId);
    await updateDoc(suggestionRef, {
        status: 'added_to_playlist',
        processedAt: Timestamp.now(),
    });

    return songId;
}

// ==================== 標籤相關 ====================

// 取得所有標籤
export async function getTags(): Promise<Tag[]> {
    const tagsRef = collection(db, COLLECTIONS.tags);
    const tagsSnapshot = await getDocs(tagsRef);

    const tags: Tag[] = [];
    tagsSnapshot.forEach((doc) => {
        tags.push({
            id: doc.id,
            name: doc.data().name,
        });
    });

    return tags;
}

// 取得歌曲的標籤
export async function getSongTags(songId: string): Promise<Tag[]> {
    const songTagsRef = collection(db, COLLECTIONS.songTags);
    const songTagsQuery = query(songTagsRef, where('songId', '==', songId));
    const songTagsSnapshot = await getDocs(songTagsQuery);

    const tagIds: string[] = [];
    songTagsSnapshot.forEach((doc) => {
        tagIds.push(doc.data().tagId);
    });

    if (tagIds.length === 0) return [];

    const tags = await getTags();
    return tags.filter((tag) => tagIds.includes(tag.id));
}

// 新增標籤（管理員）
export async function addTag(name: string): Promise<string> {
    const tagsRef = collection(db, COLLECTIONS.tags);

    // 檢查是否存在
    const existingQuery = query(tagsRef, where('name', '==', name.trim()));
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
        throw new Error('標籤已存在');
    }

    const newDoc = await addDoc(tagsRef, {
        name: name.trim(),
        createdAt: Timestamp.now(),
    });

    return newDoc.id;
}

// 為歌曲新增標籤（管理員）
export async function addSongTag(songId: string, tagId: string): Promise<void> {
    const songTagsRef = collection(db, COLLECTIONS.songTags);

    // 檢查是否已存在
    const existingQuery = query(
        songTagsRef,
        where('songId', '==', songId),
        where('tagId', '==', tagId)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
        throw new Error('標籤已存在');
    }

    await addDoc(songTagsRef, {
        songId,
        tagId,
        createdAt: Timestamp.now(),
    });
}

// 移除歌曲標籤（管理員）
export async function removeSongTag(songId: string, tagId: string): Promise<void> {
    const songTagsRef = collection(db, COLLECTIONS.songTags);
    const deleteQuery = query(
        songTagsRef,
        where('songId', '==', songId),
        where('tagId', '==', tagId)
    );
    const snapshot = await getDocs(deleteQuery);

    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref));
    });

    await Promise.all(deletePromises);
}

// 刪除標籤（管理員）
export async function deleteTag(tagId: string): Promise<void> {
    // 先刪除所有關聯的 songTags
    const songTagsRef = collection(db, COLLECTIONS.songTags);
    const songTagsQuery = query(songTagsRef, where('tagId', '==', tagId));
    const songTagsSnapshot = await getDocs(songTagsQuery);

    const deletePromises: Promise<void>[] = [];
    songTagsSnapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref));
    });
    await Promise.all(deletePromises);

    // 再刪除標籤本身
    const tagRef = doc(db, COLLECTIONS.tags, tagId);
    await deleteDoc(tagRef);
}

// ==================== 工具函式 ====================

// 產生 Session ID
export function getSessionId(): string {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
}

// 記錄 QR Code 掃描
export async function recordQRScan(songId: string): Promise<void> {
    const scansRef = collection(db, COLLECTIONS.qrCodeScans);
    await addDoc(scansRef, {
        songId,
        sessionId: getSessionId(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || null,
        createdAt: Timestamp.now(),
    });
}
