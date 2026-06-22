import {
    collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
    onSnapshot, Timestamp, increment, type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import type { SongSuggestion } from './types';
import { addSong } from './songs';

export async function getSuggestions(): Promise<SongSuggestion[]> {
    const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);
    const snapshot = await getDocs(suggestionsRef);
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
            upvotes: data.upvotes || 0,
        });
    });
    suggestions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return suggestions;
}

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
                upvotes: data.upvotes || 0,
            });
        });
        suggestions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(suggestions);
    });
}

export async function addSuggestion(
    title: string, artist: string, suggestedBy?: string, notes?: string
): Promise<string> {
    const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);
    // 先在本地產生 doc id（同步、不需連線），再寫入。
    const ref = doc(suggestionsRef);
    const write = setDoc(ref, {
        title: title.trim(),
        artist: artist?.trim() || '不確定',
        suggestedBy: suggestedBy?.trim() || null,
        notes: notes?.trim() || null,
        status: 'pending',
        createdAt: Timestamp.now(),
    });

    // ⚠️ 防卡死：Firebase 的 setDoc/addDoc Promise 只有在「伺服器確認寫入」後才會 resolve。
    // 現場掃 QR 點歌時網路常常很差，這個 Promise 可能一直 pending，導致送出按鈕永遠停在
    // 「送出中…」而卡住。Firestore 離線優先機制保證排入佇列的寫入連線恢復後會自動同步，
    // onSnapshot 也會立刻在本地反映這筆資料，所以這裡用 timeout 競速：寫入若在短時間內
    // 沒被伺服器確認就樂觀視為成功讓 UI 往下走；真正的即時錯誤（如線上時被規則擋下）仍會丟出。
    write.catch((err) => console.error('[addSuggestion] 寫入失敗', err));
    await Promise.race([
        write,
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]);
    return ref.id;
}

export async function updateSuggestionStatus(
    suggestionId: string, status: SongSuggestion['status']
): Promise<void> {
    const ref = doc(db, COLLECTIONS.songSuggestions, suggestionId);
    await updateDoc(ref, { status });
}

/** A2「+1 我也想聽」附議 — 對待審核建議的 upvotes +1（rules 只允許 upvotes 欄位 +1）。 */
export async function upvoteSuggestion(suggestionId: string): Promise<void> {
    const ref = doc(db, COLLECTIONS.songSuggestions, suggestionId);
    await updateDoc(ref, { upvotes: increment(1) });
}

export async function deleteSuggestion(suggestionId: string): Promise<void> {
    const ref = doc(db, COLLECTIONS.songSuggestions, suggestionId);
    await deleteDoc(ref);
}

export async function addSuggestionToPlaylist(
    suggestionId: string, title: string, artist: string
): Promise<string> {
    const songId = await addSong(title, artist);
    const ref = doc(db, COLLECTIONS.songSuggestions, suggestionId);
    await updateDoc(ref, {
        status: 'added_to_playlist',
        processedAt: Timestamp.now(),
    });
    return songId;
}
