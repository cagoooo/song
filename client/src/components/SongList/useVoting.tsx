// 投票邏輯 Hook
import { useState, useCallback, useRef } from 'react';
import { voteSong, getSessionId, type Song } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { useVoteHistory } from '@/hooks/useVoteHistory';
import { broadcastVote } from '@/hooks/useComboCounter';
import confetti from 'canvas-confetti';

interface VoteOverlayInfo {
    songId: string;
    title: string;
    artist: string;
}

interface UseVotingReturn {
    votingId: string | null;
    clickCount: Record<string, number>;
    voteSuccess: Record<string, boolean>;
    showVoteOverlay: VoteOverlayInfo | null;
    buttonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
    handleVoteStart: (songId: string, song: Song) => Promise<void>;
}

export function useVoting(): UseVotingReturn {
    const { toast } = useToast();
    const { addVote } = useVoteHistory();
    const [votingId, setVotingId] = useState<string | null>(null);
    const [clickCount, setClickCount] = useState<Record<string, number>>({});
    const [lastVoteTime, setLastVoteTime] = useState<Record<string, number>>({});
    const [voteSuccess, setVoteSuccess] = useState<Record<string, boolean>>({});
    const [showVoteOverlay, setShowVoteOverlay] = useState<VoteOverlayInfo | null>(null);
    const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

    const triggerVoteConfetti = useCallback((buttonElement: HTMLButtonElement | null) => {
        if (!buttonElement) return;

        const rect = buttonElement.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;

        confetti({
            particleCount: 30,
            spread: 60,
            origin: { x, y },
            colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'],
            ticks: 100,
            gravity: 1.2,
            scalar: 0.8,
            shapes: ['circle', 'square'],
            zIndex: 9999,
        });
    }, []);

    const handleVoteStart = useCallback(async (songId: string, song: Song) => {
        const now = Date.now();
        const lastTime = lastVoteTime[songId] || 0;
        const timeDiff = now - lastTime;

        if (timeDiff < 300) {
            return;
        }

        try {
            setVotingId(songId);

            // 使用 Firestore 投票
            await voteSong(songId, getSessionId());

            // 寫進本機點播歷史（不影響投票成功訊息）
            addVote({ songId, title: song.title, artist: song.artist });

            // 廣播 combo 事件給 ComboOverlay 計數
            broadcastVote(songId, song.title, song.artist);

            setClickCount(prev => ({
                ...prev,
                [songId]: (prev[songId] || 0) + 1
            }));

            setLastVoteTime(prev => ({
                ...prev,
                [songId]: now
            }));

            setVoteSuccess(prev => ({ ...prev, [songId]: true }));

            triggerVoteConfetti(buttonRefs.current[songId]);

            setShowVoteOverlay({ songId, title: song.title, artist: song.artist });

            toast({
                title: '🎸 點播成功！',
                description: `${song.title} - ${song.artist}`,
                duration: 2000,
            });

            setTimeout(() => {
                setVotingId(null);
                setVoteSuccess(prev => ({ ...prev, [songId]: false }));
            }, 800);

            setTimeout(() => {
                setShowVoteOverlay(null);
            }, 1500);

            // 漸進式重置點擊計數
            const timeoutKey = `timeout_${songId}`;
            const globalWindow = window as unknown as Record<string, ReturnType<typeof setTimeout>>;

            if (globalWindow[timeoutKey]) {
                clearTimeout(globalWindow[timeoutKey]);
                clearInterval(globalWindow[`interval_${songId}`]);
            }

            globalWindow[timeoutKey] = setTimeout(() => {
                const currentCount = clickCount[songId] || 0;
                const steps = 10;
                const decrementPerStep = Math.ceil(currentCount / steps);

                globalWindow[`interval_${songId}`] = setInterval(() => {
                    setClickCount(prev => {
                        const newCount = Math.max((prev[songId] || 0) - decrementPerStep, 0);
                        if (newCount === 0) {
                            clearInterval(globalWindow[`interval_${songId}`]);
                        }
                        return {
                            ...prev,
                            [songId]: newCount
                        };
                    });
                }, 100);
            }, 2000);
        } catch (error) {
            setVotingId(null);
            toast({
                title: '錯誤',
                description: '投票失敗，請稍後再試',
                variant: 'destructive'
            });
        }
    }, [clickCount, lastVoteTime, toast, triggerVoteConfetti, addVote]);

    return {
        votingId,
        clickCount,
        voteSuccess,
        showVoteOverlay,
        buttonRefs,
        handleVoteStart,
    };
}
