import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import { getSessionId } from '@/lib/firestore';

export interface VoterStat {
    sessionId: string;
    /** 總票數 */
    count: number;
    /** 是否為當前訪客 */
    isYou: boolean;
    /** 從 sessionId 推算的匿名 avatar emoji */
    avatar: string;
    /** 顯示用名稱（投票者-XX） */
    displayName: string;
}

const AVATARS = ['🦊', '🐻', '🐼', '🦁', '🐯', '🦄', '🐸', '🐷', '🐵', '🐧', '🐙', '🦋', '🐳', '🦉', '🦊', '🐺'];

function avatarFor(sessionId: string): string {
    let h = 0;
    for (let i = 0; i < sessionId.length; i++) h = sessionId.charCodeAt(i) + ((h << 5) - h);
    return AVATARS[Math.abs(h) % AVATARS.length];
}

function displayNameFor(sessionId: string, isYou: boolean): string {
    if (isYou) return '你 (本機)';
    // 取 sessionId 後 3 字當編號（足夠區分但不洩漏完整 session）
    const tail = sessionId.slice(-3).toUpperCase();
    return `投票者-${tail}`;
}

/**
 * 投票領袖板 — 訂閱 votes 集合按 sessionId 聚合排名。
 * 純讀取（沒寫 Firestore），訪客匿名（顯示 emoji + 後 3 字編號）。
 *
 * @param topN 顯示前 N 名（預設 10）
 * @returns { topVoters, totalVotes, totalVoters, yourRank }
 */
export function useVoterLeaderboard(topN = 10) {
    const [counts, setCounts] = useState<Map<string, number>>(new Map());
    const mySessionId = useMemo(() => getSessionId(), []);

    useEffect(() => {
        const ref = collection(db, COLLECTIONS.votes);
        const unsub = onSnapshot(ref, (snap) => {
            const map = new Map<string, number>();
            snap.forEach((d) => {
                const sid = d.data().sessionId as string | undefined;
                if (!sid) return;
                map.set(sid, (map.get(sid) ?? 0) + 1);
            });
            setCounts(map);
        });
        return unsub;
    }, []);

    return useMemo(() => {
        const sorted = Array.from(counts.entries())
            .map(([sid, count]): VoterStat => ({
                sessionId: sid,
                count,
                isYou: sid === mySessionId,
                avatar: avatarFor(sid),
                displayName: displayNameFor(sid, sid === mySessionId),
            }))
            .sort((a, b) => b.count - a.count);

        const topVoters = sorted.slice(0, topN);
        const totalVotes = sorted.reduce((s, v) => s + v.count, 0);
        const totalVoters = sorted.length;
        const yourIndex = sorted.findIndex((v) => v.isYou);
        const yourRank = yourIndex >= 0 ? yourIndex + 1 : null;
        const yourCount = yourIndex >= 0 ? sorted[yourIndex].count : 0;

        return { topVoters, totalVotes, totalVoters, yourRank, yourCount };
    }, [counts, mySessionId, topN]);
}
