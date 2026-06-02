// 「我的推薦」本機追蹤
//
// 訪客送出推薦後，用 Firestore doc id 在本機（localStorage）記一筆，
// 回站時即可比對歌單即時狀態，看到自己推薦的歌「待審核 / 已採納 🎉 / 已加入 / 未採納」。
// 純本機、無登入、無 server 成本；所有操作包 try/catch，隱私模式靜默失敗不影響主流程。
import { useSyncExternalStore } from 'react';

export interface MySuggestionEntry {
    id: string;        // Firestore 文件 id（與歌單建議比對用）
    title: string;
    artist: string;
    ts: number;        // 送出時間
    seenStatus: string; // 上次已「慶祝/看過」的狀態，用來只在狀態變好時提示一次
}

const KEY = 'song-my-suggestions-v1';
const MAX = 50;

// 記憶體快取 —— useSyncExternalStore 的 getSnapshot 需回傳穩定參考，故只在變更時重建
let cache: MySuggestionEntry[] | null = null;
const listeners = new Set<() => void>();

function read(): MySuggestionEntry[] {
    if (cache) return cache;
    try {
        const raw = localStorage.getItem(KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        cache = Array.isArray(parsed) ? parsed : [];
    } catch {
        cache = [];
    }
    return cache;
}

function persist(next: MySuggestionEntry[]): void {
    cache = next;
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* 配額 / 隱私模式 → 放棄 */
    }
    listeners.forEach((l) => l());
}

/** 送出成功後記錄一筆（同 id 不重複）。 */
export function addMySuggestion(entry: MySuggestionEntry): void {
    const list = read();
    if (list.some((x) => x.id === entry.id)) return;
    persist([entry, ...list].slice(0, MAX));
}

/** 標記某筆的狀態已看過（避免重複慶祝）。 */
export function markSeenStatus(id: string, status: string): void {
    const list = read();
    const next = list.map((x) => (x.id === id ? { ...x, seenStatus: status } : x));
    persist(next);
}

/** 移除某筆（例如使用者手動清除）。 */
export function removeMySuggestion(id: string): void {
    persist(read().filter((x) => x.id !== id));
}

function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

function getSnapshot(): MySuggestionEntry[] {
    return read();
}

/** 取得本機「我的推薦」清單（會隨新增/狀態變更即時更新）。 */
export function useMySuggestions(): MySuggestionEntry[] {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
