// 監聽本機投票歷史 → 偵測「剛剛解鎖」的徽章 → 加進 overlay 佇列
// 只處理 4 個本機計算的徽章（灌票王 / 點滿一場 / 連 3 場 / 看完一場）
// firstCall / fiveStar 需要 Firestore queries，使用者開護照時才檢查 + 慶祝
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VoteHistoryEntry } from '@/hooks/useVoteHistory';

export type BadgeKey =
    | 'vote-storm'
    | 'full-deck'
    | 'three-shows'
    | 'final-encore'
    | 'first-call'
    | 'five-star';

export interface BadgeUnlockEvent {
    key: BadgeKey;
    glyph: string;
    name: string;          // 中文
    en: string;            // 英文
    cond: string;          // 解鎖條件（含 HTML <b>）
    meter: string;         // 進度文字
    arc: string;           // SVG textPath 上的弧形字
    tone: 'blue' | 'gold' | 'hot';
}

const CELEBRATED_KEY = 'badges-celebrated-v1';

function readCelebrated(): Set<BadgeKey> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(CELEBRATED_KEY);
        if (!raw) return new Set();
        const arr = JSON.parse(raw) as BadgeKey[];
        return new Set(Array.isArray(arr) ? arr : []);
    } catch {
        return new Set();
    }
}

function writeCelebrated(set: Set<BadgeKey>) {
    try {
        localStorage.setItem(CELEBRATED_KEY, JSON.stringify(Array.from(set)));
    } catch {
        // 配額滿就放棄
    }
}

function dayKey(ts: number) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

interface UseBadgeUnlockQueueOptions {
    history: VoteHistoryEntry[];
    /** 額外傳入 Firestore-derived 徽章狀態（在護照 modal 開啟時提供） */
    extraUnlocked?: Partial<Record<BadgeKey, boolean>>;
}

export function useBadgeUnlockQueue({ history, extraUnlocked }: UseBadgeUnlockQueueOptions) {
    const [queue, setQueue] = useState<BadgeUnlockEvent[]>([]);
    const celebratedRef = useRef<Set<BadgeKey>>(readCelebrated());

    // 計算當前 unlocked 的本機徽章（不含需要 Firestore 的 first-call / five-star）
    const unlocked = useMemo(() => {
        const dayMap = new Map<string, { count: number; unique: Set<string> }>();
        for (const v of history) {
            const k = dayKey(v.timestamp);
            const entry = dayMap.get(k);
            if (entry) {
                entry.count += 1;
                entry.unique.add(v.songId);
            } else {
                dayMap.set(k, { count: 1, unique: new Set([v.songId]) });
            }
        }
        const stats = Array.from(dayMap.values());
        const maxDayCount = stats.reduce((m, d) => Math.max(m, d.count), 0);
        const maxDayUnique = stats.reduce((m, d) => Math.max(m, d.unique.size), 0);
        const distinctDays = stats.length;
        return {
            'vote-storm': maxDayCount >= 50,
            'full-deck': maxDayUnique >= 5,
            'three-shows': distinctDays >= 3,
            'final-encore': maxDayCount >= 16,
        } as Partial<Record<BadgeKey, boolean>>;
    }, [history]);

    useEffect(() => {
        const combined: Partial<Record<BadgeKey, boolean>> = {
            ...unlocked,
            ...(extraUnlocked ?? {}),
        };
        const celebrated = celebratedRef.current;
        const newlyUnlocked: BadgeKey[] = [];

        for (const [k, isUnlocked] of Object.entries(combined)) {
            if (isUnlocked && !celebrated.has(k as BadgeKey)) {
                newlyUnlocked.push(k as BadgeKey);
            }
        }

        if (newlyUnlocked.length === 0) return;

        // 標記為已慶祝（即使 overlay 沒立即播放，至少不會再排）
        newlyUnlocked.forEach((k) => celebrated.add(k));
        writeCelebrated(celebrated);
        celebratedRef.current = celebrated;

        // 加進 queue
        const events = newlyUnlocked.map((k) => BADGE_SPECS[k]).filter(Boolean) as BadgeUnlockEvent[];
        setQueue((prev) => [...prev, ...events]);
    }, [unlocked, extraUnlocked]);

    const consumeFront = useCallback(() => {
        setQueue((prev) => prev.slice(1));
    }, []);

    return { current: queue[0] ?? null, consumeFront, queueLength: queue.length };
}

const BADGE_SPECS: Record<BadgeKey, BadgeUnlockEvent> = {
    'vote-storm': {
        key: 'vote-storm',
        glyph: '🔥',
        name: '灌票王',
        en: 'VOTE STORM',
        cond: '單場累積 <b>50 票</b>！',
        meter: '50 / 50 VOTES · UNLOCKED',
        arc: '★ VOTE · STORM · 50 IN ONE NIGHT ·',
        tone: 'hot',
    },
    'full-deck': {
        key: 'full-deck',
        glyph: '🎸',
        name: '點滿一場',
        en: 'FULL DECK',
        cond: '同一場投到 <b>5 首不同</b>歌！',
        meter: '5 / 5 TRACKS · UNLOCKED',
        arc: '★ FULL DECK · ALL FIVE · COMPLETE ·',
        tone: 'blue',
    },
    'three-shows': {
        key: 'three-shows',
        glyph: '📻',
        name: '連續 3 場',
        en: 'THREE NIGHTS',
        cond: '到場 <b>3 個不同夜晚</b>！',
        meter: '3 / 3 NIGHTS · LOYAL',
        arc: '★ THREE NIGHTS · LOYAL FAN ·',
        tone: 'gold',
    },
    'final-encore': {
        key: 'final-encore',
        glyph: '🎬',
        name: '看完一場',
        en: 'FINAL ENCORE',
        cond: '單場投出 <b>16 首歌</b>！',
        meter: '16 / 16 TRACKS · UNLOCKED',
        arc: '★ FULL SHOW · OPENING TO CURTAIN ·',
        tone: 'blue',
    },
    'first-call': {
        key: 'first-call',
        glyph: '🌟',
        name: '首發點播',
        en: 'OPENING ACT',
        cond: '你是某首歌的 <b>第一位投票者</b>！',
        meter: 'FIRST · YOUR PICK',
        arc: '★ FIRST PICK · OPENING ACT ·',
        tone: 'gold',
    },
    'five-star': {
        key: 'five-star',
        glyph: '⭐',
        name: '評星達人',
        en: 'STAR RATER',
        cond: '累積給出 <b>10 次 5 星</b>評！',
        meter: '10 / 10 RATINGS · UNLOCKED',
        arc: '★ STAR RATER · 10 RATINGS ·',
        tone: 'blue',
    },
};
