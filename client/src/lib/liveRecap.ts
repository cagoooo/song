// 「現場回顧」即時亮點 store
//
// 累積最近的現場高潮（黑馬時刻、全站熱度），讓使用者（尤其剛打完字錯過的人）
// 可點開時間軸快速補看。純記憶體（session 內），重整即清空 —— 這是「剛剛現場」，
// 不需跨 session 保存。標記哪些是「打字時（hard 防干擾）錯過」的。
import { useSyncExternalStore } from 'react';

export type RecapKind = 'darkhorse' | 'hype';

export interface RecapItem {
    id: string;
    kind: RecapKind;
    title: string;
    detail: string;
    ts: number;
    missed: boolean; // 是否在使用者打字（hard 防干擾）時發生 → 被暫停沒看到
}

const MAX = 20;
const WINDOW_MS = 30 * 60 * 1000; // 只保留近 30 分鐘

let items: RecapItem[] = [];
let unseen = 0;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((l) => l());
}

/** 記錄一個現場亮點（依 id 去重）。 */
export function recordHighlight(item: Omit<RecapItem, 'ts'> & { ts?: number }): void {
    const ts = item.ts ?? Date.now();
    if (items.some((x) => x.id === item.id)) return;
    items = [{ ...item, ts }, ...items]
        .filter((x) => ts - x.ts < WINDOW_MS)
        .slice(0, MAX);
    unseen += 1;
    emit();
}

/** 標記全部已看過（開啟回顧面板時呼叫）。 */
export function markAllSeen(): void {
    if (unseen === 0) return;
    unseen = 0;
    emit();
}

/** 測試用：清空。 */
export function resetRecap(): void {
    items = [];
    unseen = 0;
    emit();
}

function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

// getSnapshot 需回傳穩定參考 —— 只在 items/unseen 變動時重建快照物件
let snap: { items: RecapItem[]; unseen: number } = { items, unseen };
function getSnapshot() {
    if (snap.items !== items || snap.unseen !== unseen) {
        snap = { items, unseen };
    }
    return snap;
}

/** 取得即時回顧（items 時間軸 + 未讀數）。 */
export function useLiveRecap() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
