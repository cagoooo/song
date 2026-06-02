// A2「+1 我也想聽」本機去重 —— 每台裝置對同一建議只 +1 一次。
// 純 localStorage（rules 無法用 sessionId 嚴格擋重複，學校場景以本機去重為主，
// rules 另已限制只能對 upvotes 欄位 +1，不能竄改其他欄位）。
import { useSyncExternalStore } from 'react';

const KEY = 'song-upvoted-v1';

let upvoted: Set<string> = new Set();
let loaded = false;
const listeners = new Set<() => void>();

function ensure() {
    if (loaded) return;
    try {
        const raw = localStorage.getItem(KEY);
        upvoted = new Set(raw ? JSON.parse(raw) : []);
    } catch {
        upvoted = new Set();
    }
    loaded = true;
}

function emit() {
    listeners.forEach((l) => l());
}

export function hasUpvoted(id: string): boolean {
    ensure();
    return upvoted.has(id);
}

/** 標記某建議本機已 +1（已存在則 no-op）。 */
export function markUpvoted(id: string): void {
    ensure();
    if (upvoted.has(id)) return;
    upvoted.add(id);
    try {
        localStorage.setItem(KEY, JSON.stringify(Array.from(upvoted)));
    } catch {
        /* 配額 / 隱私模式 → 放棄 */
    }
    emit();
}

function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

/** 反應式：此建議本機是否已 +1。 */
export function useHasUpvoted(id: string): boolean {
    return useSyncExternalStore(
        subscribe,
        () => {
            ensure();
            return upvoted.has(id);
        },
        () => false,
    );
}
