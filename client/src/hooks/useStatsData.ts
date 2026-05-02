import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, type Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import type { Song } from '@/lib/firestore';

interface VoteRecord {
    songId: string;
    sessionId: string;
    createdAt: Date;
}

export interface SongStat {
    song: Song;
    voteCount: number;
}

export interface DailyTrendPoint {
    /** 2026-04-30 */
    date: string;
    /** 顯示用 4/30 */
    label: string;
    count: number;
}

export interface HourlyPoint {
    hour: number; // 0-23
    label: string; // 00 / 01 / ...
    count: number;
}

export interface ArtistSlice {
    name: string;
    value: number; // 票數
}

export interface TagBarPoint {
    name: string;
    songs: number;   // 掛了該標籤的歌曲數
    votes: number;   // 該標籤所有歌曲累積票數
}

export interface StatsData {
    /** Loading 中 */
    isLoading: boolean;
    /** KPI */
    totalVotes: number;
    totalSongs: number;
    totalVoters: number;
    todayVotes: number;
    /** 熱門歌曲 Top N */
    topSongs: SongStat[];
    /** 過去 N 天每日投票趨勢 */
    dailyTrend: DailyTrendPoint[];
    /** 24 小時時段分布 */
    hourlyDistribution: HourlyPoint[];
    /** 歌手票數分布 (Top N + 其他) */
    artistSlices: ArtistSlice[];
    /** 標籤使用分布 */
    tagBars: TagBarPoint[];
    /** 投票者匿名動物清單 (前 N 名) */
    topVoters: { sessionId: string; count: number }[];
}

interface UseStatsDataOptions {
    songs: Song[];
    songTagsMap: Map<string, string[]>;
    allTags: { id: string; name: string }[];
    /** 統計過去幾天的趨勢 */
    daysBack?: number;
    /** Top N 歌曲 / 歌手 */
    topN?: number;
}

function formatDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatDateLabel(d: Date): string {
    return `${d.getMonth() + 1}/${d.getDate()}`;
}
function isSameLocalDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

/**
 * 統計資料聚合 — 訂閱 votes 集合，搭配 songs 計算各種圖表所需資料。
 * 純客戶端聚合，不寫 Firestore。資料量大時 (10k+ votes) 可能略卡，
 * 但典型使用情境（單場演出 ~500 票）非常輕量。
 */
export function useStatsData({
    songs,
    songTagsMap,
    allTags,
    daysBack = 14,
    topN = 10,
}: UseStatsDataOptions): StatsData {
    const [votes, setVotes] = useState<VoteRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const ref = collection(db, COLLECTIONS.votes);
        const unsub = onSnapshot(ref, (snap) => {
            const list: VoteRecord[] = [];
            snap.forEach((d) => {
                const data = d.data() as { songId?: string; sessionId?: string; createdAt?: Timestamp };
                if (!data.songId || !data.sessionId) return;
                const t = data.createdAt?.toDate?.() ?? new Date();
                list.push({ songId: data.songId, sessionId: data.sessionId, createdAt: t });
            });
            setVotes(list);
            setIsLoading(false);
        });
        return unsub;
    }, []);

    return useMemo<StatsData>(() => {
        const songsById = new Map<string, Song>();
        songs.forEach((s) => songsById.set(s.id, s));

        // 累加票數 per song
        const voteCountBySong = new Map<string, number>();
        const sessionSet = new Set<string>();
        votes.forEach((v) => {
            voteCountBySong.set(v.songId, (voteCountBySong.get(v.songId) ?? 0) + 1);
            sessionSet.add(v.sessionId);
        });

        // 今日票數
        const now = new Date();
        const todayVotes = votes.filter((v) => isSameLocalDay(v.createdAt, now)).length;

        // Top N 歌曲
        const topSongs: SongStat[] = Array.from(voteCountBySong.entries())
            .map(([songId, voteCount]) => {
                const s = songsById.get(songId);
                if (!s) return null;
                return { song: s, voteCount };
            })
            .filter((x): x is SongStat => x !== null)
            .sort((a, b) => b.voteCount - a.voteCount)
            .slice(0, topN);

        // 每日趨勢 — 過去 daysBack 天
        const trendBuckets = new Map<string, number>();
        for (let i = daysBack - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            d.setHours(0, 0, 0, 0);
            trendBuckets.set(formatDateKey(d), 0);
        }
        votes.forEach((v) => {
            const key = formatDateKey(v.createdAt);
            if (trendBuckets.has(key)) {
                trendBuckets.set(key, (trendBuckets.get(key) ?? 0) + 1);
            }
        });
        const dailyTrend: DailyTrendPoint[] = Array.from(trendBuckets.entries()).map(([date, count]) => ({
            date,
            label: formatDateLabel(new Date(date)),
            count,
        }));

        // 24h 時段分布
        const hourlyBuckets = Array.from({ length: 24 }, () => 0);
        votes.forEach((v) => {
            hourlyBuckets[v.createdAt.getHours()]++;
        });
        const hourlyDistribution: HourlyPoint[] = hourlyBuckets.map((count, hour) => ({
            hour,
            label: String(hour).padStart(2, '0'),
            count,
        }));

        // 歌手分布 (Top N + 其他)
        const artistMap = new Map<string, number>();
        votes.forEach((v) => {
            const s = songsById.get(v.songId);
            if (!s) return;
            artistMap.set(s.artist, (artistMap.get(s.artist) ?? 0) + 1);
        });
        const artistSorted = Array.from(artistMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
        const artistSlices: ArtistSlice[] = artistSorted.slice(0, topN);
        const otherSum = artistSorted.slice(topN).reduce((s, a) => s + a.value, 0);
        if (otherSum > 0) artistSlices.push({ name: '其他', value: otherSum });

        // 標籤使用分布
        const tagSongCount = new Map<string, number>();
        const tagVoteCount = new Map<string, number>();
        songTagsMap.forEach((tagIds, songId) => {
            const songVotes = voteCountBySong.get(songId) ?? 0;
            tagIds.forEach((tid) => {
                tagSongCount.set(tid, (tagSongCount.get(tid) ?? 0) + 1);
                tagVoteCount.set(tid, (tagVoteCount.get(tid) ?? 0) + songVotes);
            });
        });
        const tagBars: TagBarPoint[] = allTags
            .map((t) => ({
                name: t.name,
                songs: tagSongCount.get(t.id) ?? 0,
                votes: tagVoteCount.get(t.id) ?? 0,
            }))
            .filter((t) => t.songs > 0)
            .sort((a, b) => b.votes - a.votes);

        // 投票者排名 (給 leaderboard 共用)
        const sessionCount = new Map<string, number>();
        votes.forEach((v) => {
            sessionCount.set(v.sessionId, (sessionCount.get(v.sessionId) ?? 0) + 1);
        });
        const topVoters = Array.from(sessionCount.entries())
            .map(([sessionId, count]) => ({ sessionId, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, topN);

        return {
            isLoading,
            totalVotes: votes.length,
            totalSongs: songs.length,
            totalVoters: sessionSet.size,
            todayVotes,
            topSongs,
            dailyTrend,
            hourlyDistribution,
            artistSlices,
            tagBars,
            topVoters,
        };
    }, [votes, songs, songTagsMap, allTags, daysBack, topN, isLoading]);
}
