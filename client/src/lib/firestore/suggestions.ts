import {
    collection, doc, getDocs, setDoc, updateDoc, deleteDoc,
    onSnapshot, Timestamp, increment, type Unsubscribe,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import type { SongSuggestion } from './types';
import { addSong } from './songs';
import {
    enqueuePendingSuggestion,
    listPendingSuggestions,
    removePendingSuggestion,
    type PendingSuggestion,
} from '../pendingSuggestions';

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

/** 由本機持久化欄位組出 Firestore doc payload（送出與重送共用，確保格式一致）。 */
function buildSuggestionDoc(p: Omit<PendingSuggestion, 'id'>) {
    return {
        title: p.title,
        artist: p.artist || '不確定',
        suggestedBy: p.suggestedBy || null,
        notes: p.notes || null,
        status: 'pending' as const,
        createdAt: Timestamp.fromMillis(p.createdAtMs),
    };
}

/** 送出狀態：normal=已（樂觀）送出；queued=離線/失敗已暫存，待恢復連線重送。 */
export interface AddSuggestionResult {
    id: string;
    queued: boolean;
}

export async function addSuggestion(
    title: string, artist: string, suggestedBy?: string, notes?: string
): Promise<AddSuggestionResult> {
    const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);
    // 先在本地產生 doc id（同步、不需連線），重送時沿用同一 id → 冪等不重複。
    const ref = doc(suggestionsRef);
    const fields: Omit<PendingSuggestion, 'id'> = {
        title: title.trim(),
        artist: artist?.trim() || '不確定',
        suggestedBy: suggestedBy?.trim() || null,
        notes: notes?.trim() || null,
        createdAtMs: Date.now(),
    };

    // 離線時先持久化到本機佇列：memoryLocalCache 的離線寫入重整就沒了，
    // 自帶佇列才能跨重整／關分頁保住這筆，恢復連線後重送。
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline) enqueuePendingSuggestion({ id: ref.id, ...fields });

    const write = setDoc(ref, buildSuggestionDoc(fields));
    // 成功 → 確認送達，從佇列移除；失敗 → 入佇列等重送。
    write
        .then(() => removePendingSuggestion(ref.id))
        .catch((err) => {
            console.error('[addSuggestion] 寫入失敗，已暫存待重送', err);
            enqueuePendingSuggestion({ id: ref.id, ...fields });
        });

    // ⚠️ 防卡死：Firebase 的 setDoc/addDoc Promise 只有在「伺服器確認寫入」後才會 resolve。
    // 現場網路差時可能一直 pending，導致送出鈕卡在「送出中…」。用 timeout 競速：
    // 短時間內沒被伺服器確認就樂觀往下走（已寫入本地，onSnapshot 立即反映，背景續傳）。
    await Promise.race([
        write,
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]);

    return { id: ref.id, queued: offline };
}

/**
 * 重送本機佇列中尚未送達的建議（恢復連線 / App 啟動時呼叫）。
 * 用原本的 doc id 重寫，成功才移除；回傳成功/失敗筆數。
 */
export async function flushPendingSuggestions(): Promise<{ ok: number; fail: number }> {
    const pending = listPendingSuggestions();
    if (pending.length === 0) return { ok: 0, fail: 0 };

    let ok = 0;
    let fail = 0;
    await Promise.all(
        pending.map(async ({ id, ...fields }) => {
            try {
                await setDoc(doc(db, COLLECTIONS.songSuggestions, id), buildSuggestionDoc(fields));
                removePendingSuggestion(id);
                ok += 1;
            } catch (err) {
                console.error('[flushPendingSuggestions] 重送失敗，保留待下次', err);
                fail += 1;
            }
        }),
    );
    return { ok, fail };
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
