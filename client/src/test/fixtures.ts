// 測試 fixtures — 5 件套 ritual modal 共用的 mock 資料工廠
// 📐 設計文件：docs/design/T2-ritual-modal-tests.md

import type { Song } from '@/lib/firestore';
import type { VoteHistoryEntry } from '@/hooks/useVoteHistory';

/** 建立一筆 VoteHistoryEntry。timestamp 可帶 ms 數字或 Date 物件 */
export function makeVote(
    songId: string,
    title: string,
    artist: string,
    timestamp: number | Date,
): VoteHistoryEntry {
    return {
        songId,
        title,
        artist,
        timestamp: typeof timestamp === 'number' ? timestamp : timestamp.getTime(),
    };
}

/** 取得 N 天前的 timestamp（依本地時鐘） */
export function daysAgo(n: number): number {
    return Date.now() - n * 86_400_000;
}

/** 取得 N 小時前的 timestamp */
export function hoursAgo(n: number): number {
    return Date.now() - n * 3_600_000;
}

/** 建立一首 Song，可帶 overrides 覆蓋預設值 */
export function makeSong(overrides?: Partial<Song>): Song {
    return {
        id: 's1',
        title: '晴天',
        artist: '周杰倫',
        voteCount: 0,
        isActive: true,
        createdAt: new Date(),
        ...overrides,
    };
}

/** 批次建立同一首歌的 N 筆投票（用來測單場 ≥ 50 票之類條件） */
export function manyVotesOf(
    songId: string,
    count: number,
    timestamp: number | Date = Date.now(),
): VoteHistoryEntry[] {
    const ts = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
    return Array.from({ length: count }, () => makeVote(songId, '_', '_', ts));
}

/** 批次建立 N 首不同歌曲的投票（用來測 unique songs） */
export function uniqueVotes(
    count: number,
    timestamp: number | Date = Date.now(),
): VoteHistoryEntry[] {
    const ts = typeof timestamp === 'number' ? timestamp : timestamp.getTime();
    return Array.from({ length: count }, (_, i) =>
        makeVote(`s${i}`, `Song ${i}`, `Artist ${i}`, ts),
    );
}
