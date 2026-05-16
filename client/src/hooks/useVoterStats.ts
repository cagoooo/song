// 訪客個人真實統計 — 用本機 sessionId 查 Firestore：
//   firstCallCount: 投過的歌中，自己是「第一位投票者」的數量（首發點播徽章）
//   fiveStarCount:  自己給過 5 顆星評分的次數（評星達人徽章）
//
// 不訂閱即時更新 — 護照 modal 開啟時拉一次即可，避免長期 listener 成本。
import { useEffect, useState } from 'react';
import {
    collection, getDocs, query, where, orderBy, limit,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import { getSessionId } from '@/lib/firestore';

interface UseVoterStatsOptions {
    /** 護照 modal 開啟時才查；關閉時不浪費 quota */
    enabled: boolean;
    /** 使用者投過的不重複歌曲 ID（從 useVoteHistory 推導） */
    votedSongIds: string[];
}

interface UseVoterStatsReturn {
    firstCallCount: number | null;     // 自己是首位投票者的歌曲數
    fiveStarCount: number | null;      // 自己給 5 星的次數
    loading: boolean;
    error: string | null;
}

export function useVoterStats({ enabled, votedSongIds }: UseVoterStatsOptions): UseVoterStatsReturn {
    const [firstCallCount, setFirstCallCount] = useState<number | null>(null);
    const [fiveStarCount, setFiveStarCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;

        async function run() {
            setLoading(true);
            setError(null);
            const sessionId = getSessionId();

            try {
                // V1 · 首發點播 — 對每首歌查最早一票，比對是否為我
                // 為避免一次發太多 query，限制最多 30 首（≥ 30 也算徽章解鎖很久了）
                const songsToCheck = votedSongIds.slice(0, 30);
                let firstCalls = 0;
                if (songsToCheck.length > 0) {
                    const checks: Promise<number>[] = songsToCheck.map(async (songId) => {
                        try {
                            const q = query(
                                collection(db, COLLECTIONS.votes),
                                where('songId', '==', songId),
                                orderBy('createdAt', 'asc'),
                                limit(1),
                            );
                            const snap = await getDocs(q);
                            const firstDoc = snap.docs[0];
                            return firstDoc?.data().sessionId === sessionId ? 1 : 0;
                        } catch {
                            // 個別失敗（如 index 還沒建好）不影響整體
                            return 0;
                        }
                    });
                    const results = await Promise.all(checks);
                    firstCalls = results.reduce((a, b) => a + b, 0);
                }
                if (cancelled) return;
                setFirstCallCount(firstCalls);

                // V2 · 評星達人 — 我的 rating=5 互動數量
                let fiveStar = 0;
                try {
                    const q = query(
                        collection(db, COLLECTIONS.interactions),
                        where('sessionId', '==', sessionId),
                        where('type', '==', 'rating'),
                        where('rating', '==', 5),
                    );
                    const snap = await getDocs(q);
                    fiveStar = snap.size;
                } catch (err) {
                    // 多 where 條件可能需要複合索引；失敗就保留 null
                    console.warn('fiveStarCount query failed (may need composite index):', err);
                }
                if (cancelled) return;
                setFiveStarCount(fiveStar);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => { cancelled = true; };
        // votedSongIds 依字串拼接判斷是否需要重跑（避免每次 modal 開啟都 fire query）
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, votedSongIds.join(',')]);

    return { firstCallCount, fiveStarCount, loading, error };
}
