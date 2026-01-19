// Firestore 資料層 - 取代原有 API 呼叫
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
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
    isPlayed?: boolean; // 管理員標記已彈奏
    isNowPlaying?: boolean; // 正在彈奏中
}

// 正在彈奏中資訊
export interface NowPlayingInfo {
    songId: string;
    song: Song | null;
    startedAt: Date;
    startedBy: string;
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

// 即時監聽歌曲更新（含彈奏狀態及正在彈奏狀態）
export function subscribeSongs(callback: (songs: Song[]) => void): Unsubscribe {
    const songsRef = collection(db, COLLECTIONS.songs);
    const songsQuery = query(songsRef, where('isActive', '==', true));

    // 同時監聽歌曲、投票、彈奏狀態和正在彈奏狀態
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

    // 監聽彈奏狀態
    const playedRef = collection(db, COLLECTIONS.playedSongs);
    const unsubPlayed = onSnapshot(playedRef, (snapshot) => {
        playedSongs.clear();
        snapshot.forEach((doc) => {
            playedSongs.add(doc.data().songId);
        });
        updateCallback();
    });

    // 監聽正在彈奏狀態（使用固定文件 ID 'current'）
    const nowPlayingRef = doc(db, COLLECTIONS.nowPlaying, 'current');
    const unsubNowPlaying = onSnapshot(nowPlayingRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            nowPlayingSongId = docSnapshot.data().songId;
        } else {
            nowPlayingSongId = null;
        }
        updateCallback();
    });

    return () => {
        unsubSongs();
        unsubVotes();
        unsubPlayed();
        unsubNowPlaying();
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

// ==================== 彈奏標記相關（管理員） ====================

// 標記歌曲為已彈奏
export async function markSongAsPlayed(songId: string, adminUid: string): Promise<void> {
    const playedRef = collection(db, COLLECTIONS.playedSongs);

    // 檢查是否已標記
    const existingQuery = query(playedRef, where('songId', '==', songId));
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
        return; // 已經標記過了
    }

    await addDoc(playedRef, {
        songId,
        playedBy: adminUid,
        playedAt: Timestamp.now(),
    });
}

// 取消標記歌曲為已彈奏
export async function unmarkSongAsPlayed(songId: string): Promise<void> {
    const playedRef = collection(db, COLLECTIONS.playedSongs);
    const deleteQuery = query(playedRef, where('songId', '==', songId));
    const snapshot = await getDocs(deleteQuery);

    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref));
    });

    await Promise.all(deletePromises);
}

// 重置所有彈奏狀態
export async function resetAllPlayedSongs(): Promise<void> {
    const playedRef = collection(db, COLLECTIONS.playedSongs);
    const snapshot = await getDocs(playedRef);

    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((docSnapshot) => {
        deletePromises.push(deleteDoc(docSnapshot.ref));
    });

    await Promise.all(deletePromises);
}

// ==================== 正在彈奏中相關（管理員） ====================

// 設定當前正在彈奏的歌曲（單一歌曲限制）
export async function setNowPlaying(songId: string, adminUid: string): Promise<void> {
    const nowPlayingRef = doc(db, COLLECTIONS.nowPlaying, 'current');
    await setDoc(nowPlayingRef, {
        songId,
        startedBy: adminUid,
        startedAt: Timestamp.now(),
    });
}

// 清除正在彈奏狀態
export async function clearNowPlaying(): Promise<void> {
    const nowPlayingRef = doc(db, COLLECTIONS.nowPlaying, 'current');
    await deleteDoc(nowPlayingRef);
}

// 即時監聽當前正在彈奏的歌曲（供訪客使用）
export function subscribeNowPlaying(callback: (info: NowPlayingInfo | null) => void): Unsubscribe {
    const nowPlayingRef = doc(db, COLLECTIONS.nowPlaying, 'current');

    return onSnapshot(nowPlayingRef, async (docSnapshot) => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const songId = data.songId;

            // 取得歌曲詳細資訊
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
        } else {
            callback(null);
        }
    });
}

// ==================== 互動相關（打賞和評分） ====================

// 打賞類型定義
export type TipType = '❤️' | '🌟' | '🎉' | '🔥' | '💎';

export interface Interaction {
    id: string;
    songId: string;
    type: 'tip' | 'rating';
    tipType?: TipType;
    rating?: 1 | 2 | 3 | 4 | 5;
    sessionId: string;
    createdAt: Date;
}

export interface RatingStats {
    average: number;
    count: number;
    total: number;
}

// 發送打賞
export async function sendTip(
    songId: string,
    tipType: TipType,
    sessionId: string
): Promise<string> {
    const interactionsRef = collection(db, COLLECTIONS.interactions);

    const newDoc = await addDoc(interactionsRef, {
        songId,
        type: 'tip',
        tipType,
        sessionId,
        createdAt: Timestamp.now(),
    });

    return newDoc.id;
}

// 發送評分
export async function sendRating(
    songId: string,
    rating: 1 | 2 | 3 | 4 | 5,
    sessionId: string
): Promise<string> {
    const interactionsRef = collection(db, COLLECTIONS.interactions);

    // 檢查是否已評分過
    const existingQuery = query(
        interactionsRef,
        where('songId', '==', songId),
        where('sessionId', '==', sessionId),
        where('type', '==', 'rating')
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
        // 更新現有評分
        const existingDoc = existingSnapshot.docs[0];
        await updateDoc(existingDoc.ref, {
            rating,
            createdAt: Timestamp.now(),
        });
        return existingDoc.id;
    }

    // 新增評分
    const newDoc = await addDoc(interactionsRef, {
        songId,
        type: 'rating',
        rating,
        sessionId,
        createdAt: Timestamp.now(),
    });

    return newDoc.id;
}

// 即時監聯互動事件（用於觸發動畫）
export function subscribeInteractions(
    songId: string,
    callback: (interaction: Interaction) => void
): Unsubscribe {
    const interactionsRef = collection(db, COLLECTIONS.interactions);

    // 簡化查詢 - 只按 songId 過濾，避免需要複合索引
    const songQuery = query(
        interactionsRef,
        where('songId', '==', songId),
        orderBy('createdAt', 'desc')
    );

    // 追蹤已處理的互動（用 id + timestamp 組合避免重複）
    const processedEvents = new Set<string>();
    let isFirstSnapshot = true;

    return onSnapshot(songQuery, (snapshot) => {
        // 第一次快照時，標記所有現有文件為已處理（避免觸發舊動畫）
        if (isFirstSnapshot) {
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const timestamp = data.createdAt?.toMillis?.() || 0;
                processedEvents.add(`${doc.id}_${timestamp}`);
            });
            isFirstSnapshot = false;
            return;
        }

        snapshot.docChanges().forEach((change) => {
            // 處理新增和更新事件（讓評分更新也能觸發動畫）
            if (change.type === 'added' || change.type === 'modified') {
                const docId = change.doc.id;
                const data = change.doc.data();
                const createdAt = data.createdAt?.toDate?.() || new Date();
                const timestamp = data.createdAt?.toMillis?.() || 0;
                const eventKey = `${docId}_${timestamp}`;

                // 避免重複觸發相同事件
                if (!processedEvents.has(eventKey)) {
                    processedEvents.add(eventKey);

                    // 只觸發最近 60 秒內的互動動畫
                    const ageMs = Date.now() - createdAt.getTime();
                    if (ageMs < 60000) {
                        callback({
                            id: docId,
                            songId: data.songId,
                            type: data.type,
                            tipType: data.tipType,
                            rating: data.rating,
                            sessionId: data.sessionId,
                            createdAt,
                        });
                    }
                }
            }
        });
    });
}

// 取得歌曲評分統計
export async function getSongRatingStats(songId: string): Promise<RatingStats> {
    const interactionsRef = collection(db, COLLECTIONS.interactions);
    const ratingQuery = query(
        interactionsRef,
        where('songId', '==', songId),
        where('type', '==', 'rating')
    );
    const snapshot = await getDocs(ratingQuery);

    if (snapshot.empty) {
        return { average: 0, count: 0, total: 0 };
    }

    let total = 0;
    let count = 0;
    snapshot.forEach((doc) => {
        const rating = doc.data().rating;
        if (rating && rating >= 1 && rating <= 5) {
            total += rating;
            count++;
        }
    });

    return {
        average: count > 0 ? total / count : 0,
        count,
        total,
    };
}

// 即時監聽歌曲評分統計
export function subscribeRatingStats(
    songId: string,
    callback: (stats: RatingStats) => void
): Unsubscribe {
    const interactionsRef = collection(db, COLLECTIONS.interactions);
    const ratingQuery = query(
        interactionsRef,
        where('songId', '==', songId),
        where('type', '==', 'rating')
    );

    return onSnapshot(ratingQuery, (snapshot) => {
        let total = 0;
        let count = 0;
        snapshot.forEach((doc) => {
            const rating = doc.data().rating;
            if (rating && rating >= 1 && rating <= 5) {
                total += rating;
                count++;
            }
        });

        callback({
            average: count > 0 ? total / count : 0,
            count,
            total,
        });
    });
}

