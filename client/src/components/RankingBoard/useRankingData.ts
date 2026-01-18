// 排名數據邏輯 Hook
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import type { Song } from '@/lib/firestore';

interface RankChange {
    [key: string]: 'up' | 'down' | null;
}

interface UseRankingDataOptions {
    songs: Song[];
    displayLimit: number;
    reduceMotion: boolean;
    containerRef: React.RefObject<HTMLElement>;
}

// 產生基於 session 的隨機種子（同一瀏覽階段內保持一致）
const getSessionSeed = (): number => {
    const storageKey = 'ranking_shuffle_seed';
    let seed = sessionStorage.getItem(storageKey);
    if (!seed) {
        seed = Math.random().toString();
        sessionStorage.setItem(storageKey, seed);
    }
    return parseFloat(seed);
};

// 使用種子的偽隨機排序函式
const seededShuffle = <T,>(array: T[], seed: number): T[] => {
    const shuffled = [...array];
    let currentSeed = seed;

    // 簡單的偽隨機數生成器 (LCG)
    const random = () => {
        currentSeed = (currentSeed * 1103515245 + 12345) % 2147483648;
        return currentSeed / 2147483648;
    };

    // Fisher-Yates 洗牌
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
};

export function useRankingData({
    songs: propSongs,
    displayLimit,
    reduceMotion,
    containerRef
}: UseRankingDataOptions) {
    // 取得 session 種子（只在客戶端執行）
    const sessionSeed = useMemo(() => {
        if (typeof window !== 'undefined') {
            return getSessionSeed();
        }
        return Math.random();
    }, []);

    // 從 props 傳入的 songs 依投票數排序，0 票歌曲隨機穿插
    const sortedSongs = useMemo(() => {
        // 分離有票和無票的歌曲
        const songsWithVotes = propSongs.filter(s => (s.voteCount || 0) > 0);
        const songsWithoutVotes = propSongs.filter(s => (s.voteCount || 0) === 0);

        // 有票的按票數降序排列
        const sortedWithVotes = [...songsWithVotes].sort(
            (a, b) => (b.voteCount || 0) - (a.voteCount || 0)
        );

        // 無票的使用 session 種子隨機排序
        const shuffledWithoutVotes = seededShuffle(songsWithoutVotes, sessionSeed);

        // 合併：有票的在前，無票的隨機排列在後
        return [...sortedWithVotes, ...shuffledWithoutVotes].slice(0, displayLimit);
    }, [propSongs, displayLimit, sessionSeed]);

    const [showRankChange, setShowRankChange] = useState<RankChange>({});
    const [showFirework, setShowFirework] = useState<Record<string, boolean>>({});
    const rankChangeTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
    const fireWorkTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

    // 使用穩定的 key 來追蹤歌曲變化
    const songsKey = useMemo(() =>
        sortedSongs.map(s => `${s.id}:${s.voteCount || 0}`).join('|'),
        [sortedSongs]
    );

    // 使用 ref 來追蹤前一次的排名和投票
    const prevRanksRef = useRef<{ [key: string]: number }>({});
    const prevVotesRef = useRef<{ [key: string]: number }>({});

    // 觸發首名變更時的煙火效果
    const triggerTopRankConfetti = useCallback(() => {
        if (!containerRef.current || reduceMotion) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = rect.x + rect.width / 2;
        const y = rect.y + 100;

        confetti({
            particleCount: reduceMotion ? 30 : 100,
            spread: 70,
            origin: {
                x: x / window.innerWidth,
                y: y / window.innerHeight
            },
            colors: ['#FFD700', '#FFA500', '#FF4500', '#FF6347'],
            zIndex: 1000,
        });
    }, [containerRef, reduceMotion]);

    useEffect(() => {
        const newRanks: { [key: string]: number } = {};
        const newRankChanges: { [key: string]: 'up' | 'down' | null } = {};
        const newFireworks: { [key: string]: boolean } = {};
        const newVotes: { [key: string]: number } = {};

        let hasTopRankChanged = false;

        const currentPrevRanks = prevRanksRef.current;
        const currentPrevVotes = prevVotesRef.current;

        sortedSongs.forEach((song, index) => {
            const prevRank = currentPrevRanks[song.id] ?? index;
            const currentVotes = song.voteCount || 0;
            const prevVote = currentPrevVotes[song.id] || 0;

            newRanks[song.id] = index;
            newVotes[song.id] = currentVotes;

            // 檢查排名變化
            if (Object.keys(currentPrevRanks).length > 0 && prevRank !== index) {
                newRankChanges[song.id] = prevRank > index ? 'up' : 'down';

                if (index === 0 && prevRank > 0) {
                    hasTopRankChanged = true;
                    newFireworks[song.id] = true;

                    if (fireWorkTimeoutRef.current[song.id]) {
                        clearTimeout(fireWorkTimeoutRef.current[song.id]);
                    }

                    fireWorkTimeoutRef.current[song.id] = setTimeout(() => {
                        setShowFirework(prev => ({ ...prev, [song.id]: false }));
                    }, 3000);
                }

                if (rankChangeTimeoutRef.current[song.id]) {
                    clearTimeout(rankChangeTimeoutRef.current[song.id]);
                }

                rankChangeTimeoutRef.current[song.id] = setTimeout(() => {
                    setShowRankChange(prev => ({ ...prev, [song.id]: null }));
                }, 2000);
            }

            // 檢查投票增加
            if (Object.keys(currentPrevVotes).length > 0 && currentVotes > prevVote && prevVote > 0) {
                newFireworks[song.id] = true;

                if (fireWorkTimeoutRef.current[song.id]) {
                    clearTimeout(fireWorkTimeoutRef.current[song.id]);
                }

                fireWorkTimeoutRef.current[song.id] = setTimeout(() => {
                    setShowFirework(prev => ({ ...prev, [song.id]: false }));
                }, 3000);
            }
        });

        prevRanksRef.current = newRanks;
        prevVotesRef.current = newVotes;

        if (Object.keys(newRankChanges).length > 0) {
            setShowRankChange(newRankChanges);
        }
        if (Object.keys(newFireworks).length > 0) {
            setShowFirework(newFireworks);
        }

        if (hasTopRankChanged) {
            setTimeout(() => {
                triggerTopRankConfetti();
            }, 300);
        }

        return () => {
            Object.values(rankChangeTimeoutRef.current).forEach(clearTimeout);
            Object.values(fireWorkTimeoutRef.current).forEach(clearTimeout);
        };
    }, [songsKey, sortedSongs, triggerTopRankConfetti]);

    const generateGuitarTabsUrl = useCallback((song: Song) => {
        const searchQuery = encodeURIComponent(`${song.title} ${song.artist} 吉他譜 tab`);
        return `https://www.google.com/search?q=${searchQuery}`;
    }, []);

    const generateLyricsUrl = useCallback((song: Song) => {
        const searchQuery = encodeURIComponent(`${song.title} ${song.artist} 歌詞`);
        return `https://www.google.com/search?q=${searchQuery}`;
    }, []);

    return {
        sortedSongs,
        showRankChange,
        showFirework,
        generateGuitarTabsUrl,
        generateLyricsUrl,
    };
}
