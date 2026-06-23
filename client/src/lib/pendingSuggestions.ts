// 點歌建議「離線送出佇列」(本機持久化)
//
// 背景：addSuggestion 採樂觀寫入，現場網路差時 Firebase 的 setDoc 可能長時間
// 無法被伺服器確認。Firestore 雖有自己的離線佇列，但本專案用 memoryLocalCache，
// 重新整理 / 關掉分頁後那個佇列就沒了 → 使用者以為送出成功，結果沒上。
//
// 此模組把「尚未確認送達」的建議存進 localStorage，提供：
//   - 送出時：寫入失敗或離線就 enqueue（持久化、跨重整不丟）
//   - 恢復連線 / 重開 App：flush 重送（用原本的 doc id，重送具冪等性不會重複）
//
// 純儲存層，不碰 firebase，方便測試；實際重送邏輯在 firestore/suggestions.ts。

export interface PendingSuggestion {
    /** 與 Firestore doc 相同的 id（重送沿用，避免產生重複文件） */
    id: string;
    title: string;
    artist: string;
    suggestedBy: string | null;
    notes: string | null;
    /** 建立當下的時間（毫秒），重送時還原為 Firestore Timestamp */
    createdAtMs: number;
}

const KEY = 'pending-suggestions-v1';
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((l) => l());
}

function read(): PendingSuggestion[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as PendingSuggestion[]) : [];
    } catch {
        return [];
    }
}

function write(items: PendingSuggestion[]): void {
    try {
        if (items.length === 0) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
        /* 配額 / 隱私模式 → 放棄持久化（不影響主流程） */
    }
    emit();
}

/** 取得目前佇列（複本）。 */
export function listPendingSuggestions(): PendingSuggestion[] {
    return read();
}

/** 佇列筆數。 */
export function pendingSuggestionCount(): number {
    return read().length;
}

/** 加入佇列（同 id 視為已存在，覆蓋更新，避免重複）。 */
export function enqueuePendingSuggestion(item: PendingSuggestion): void {
    const items = read();
    const idx = items.findIndex((p) => p.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.push(item);
    write(items);
}

/** 從佇列移除（重送成功後呼叫）。 */
export function removePendingSuggestion(id: string): void {
    const items = read().filter((p) => p.id !== id);
    write(items);
}

/** 訂閱佇列變化（給 UI badge / 計數用）。回傳取消訂閱函式。 */
export function subscribePendingSuggestions(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
}
