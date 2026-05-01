import { useCallback, useEffect, useState } from 'react';

export interface VoteHistoryEntry {
    songId: string;
    title: string;
    artist: string;
    timestamp: number; // ms since epoch
}

interface VoteHistoryStore {
    votes: VoteHistoryEntry[];
}

const STORAGE_KEY = 'song_vote_history_v1';
const MAX_ENTRIES = 50;

function readStore(): VoteHistoryStore {
    if (typeof window === 'undefined') return { votes: [] };
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { votes: [] };
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.votes)) return { votes: [] };
        return { votes: parsed.votes };
    } catch {
        return { votes: [] };
    }
}

const SAME_TAB_EVENT = 'votehistory:update';

function writeStore(store: VoteHistoryStore) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
        // 同一分頁內的其他 hook 實例同步：storage event 不會在自己分頁觸發
        window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT));
    } catch {
        // 配額滿了之類的錯誤直接吃掉，不影響投票主流程
    }
}

function isSameLocalDay(ts: number, ref: number): boolean {
    const a = new Date(ts);
    const b = new Date(ref);
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

interface UseVoteHistoryReturn {
    history: VoteHistoryEntry[];
    /** 今日投票次數（同一首多次點播算多次，貼合「點」的直覺） */
    todayCount: number;
    /** 今日不同歌曲數（去重） */
    todayUniqueCount: number;
    addVote: (entry: Omit<VoteHistoryEntry, 'timestamp'>) => void;
    clearHistory: () => void;
    /** 找出某首歌最近一次點播時間，沒點過回傳 null */
    getLastVoteAt: (songId: string) => number | null;
}

export function useVoteHistory(): UseVoteHistoryReturn {
    const [history, setHistory] = useState<VoteHistoryEntry[]>(() => readStore().votes);

    // 同步機制：
    //   - storage 事件：跨分頁（A 投票 → B 即時更新）
    //   - 自訂事件：同分頁內多個 hook 實例（SongList 寫 → Home 顯示更新）
    useEffect(() => {
        const refresh = () => setHistory(readStore().votes);
        const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) refresh(); };
        window.addEventListener('storage', onStorage);
        window.addEventListener(SAME_TAB_EVENT, refresh);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(SAME_TAB_EVENT, refresh);
        };
    }, []);

    const addVote = useCallback((entry: Omit<VoteHistoryEntry, 'timestamp'>) => {
        const next: VoteHistoryEntry = { ...entry, timestamp: Date.now() };
        setHistory((prev) => {
            const merged = [next, ...prev].slice(0, MAX_ENTRIES);
            writeStore({ votes: merged });
            return merged;
        });
    }, []);

    const clearHistory = useCallback(() => {
        writeStore({ votes: [] });
        setHistory([]);
    }, []);

    const now = Date.now();
    const todayVotes = history.filter((v) => isSameLocalDay(v.timestamp, now));
    const todayCount = todayVotes.length;
    const todayUniqueCount = new Set(todayVotes.map((v) => v.songId)).size;

    const getLastVoteAt = useCallback((songId: string): number | null => {
        const found = history.find((v) => v.songId === songId);
        return found ? found.timestamp : null;
    }, [history]);

    return {
        history,
        todayCount,
        todayUniqueCount,
        addVote,
        clearHistory,
        getLastVoteAt,
    };
}
