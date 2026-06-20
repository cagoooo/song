// 投票邏輯 Hook
import { useState, useCallback, useRef, useEffect } from 'react';
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
    showVoteOverlay: VoteOverlayInfo | null;
    buttonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
    handleVoteStart: (songId: string, song: Song) => Promise<void>;
}

export function useVoting(): UseVotingReturn {
    const { toast } = useToast();
    const { addVote } = useVoteHistory();
    const [votingId, setVotingId] = useState<string | null>(null);
    const [clickCount, setClickCount] = useState<Record<string, number>>({});
    const [showVoteOverlay, setShowVoteOverlay] = useState<VoteOverlayInfo | null>(null);
    const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const lastVoteTimeRef = useRef<Record<string, number>>({});
    const resetTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // 預先建立固定 canvas，避免每次投票動態插入 DOM 造成 layout reflow
    const confettiRef = useRef<ReturnType<typeof confetti.create> | null>(null);
    useEffect(() => {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
        document.body.appendChild(canvas);
        confettiRef.current = confetti.create(canvas, { resize: true, useWorker: true });
        return () => {
            document.body.removeChild(canvas);
            confettiRef.current = null;
        };
    }, []);

    const triggerVoteConfetti = useCallback((buttonElement: HTMLButtonElement | null) => {
        if (!buttonElement || !confettiRef.current) return;

        const rect = buttonElement.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        const isSmallScreen = window.innerWidth < 640;

        confettiRef.current({
            particleCount: isSmallScreen ? 12 : 24,
            spread: isSmallScreen ? 42 : 56,
            origin: { x, y },
            colors: ['#2f55ff', '#ff3b30', '#f5c518'],
            ticks: isSmallScreen ? 54 : 76,
            gravity: 1.2,
            scalar: isSmallScreen ? 0.62 : 0.78,
            shapes: ['circle'],
        });
    }, []);

    const handleVoteStart = useCallback(async (songId: string, song: Song) => {
        const now = Date.now();
        const lastTime = lastVoteTimeRef.current[songId] || 0;

        if (now - lastTime < 300) {
            return;
        }
        lastVoteTimeRef.current[songId] = now;

        try {
            setVotingId(songId);

            await voteSong(songId, getSessionId());

            addVote({ songId, title: song.title, artist: song.artist });
            broadcastVote(songId, song.title, song.artist);

            setClickCount(prev => ({ ...prev, [songId]: (prev[songId] || 0) + 1 }));

            triggerVoteConfetti(buttonRefs.current[songId]);
            setShowVoteOverlay({ songId, title: song.title, artist: song.artist });

            toast({
                title: '🎸 點播成功！',
                description: `${song.title} - ${song.artist}`,
                duration: 1200,
            });

            setTimeout(() => setVotingId(null), 600);

            setTimeout(() => setShowVoteOverlay(null), 1150);

            // 單次重置 — 取代 10 步 setInterval，減少不必要的 re-render
            if (resetTimers.current[songId]) {
                clearTimeout(resetTimers.current[songId]);
            }
            resetTimers.current[songId] = setTimeout(() => {
                setClickCount(prev => ({ ...prev, [songId]: 0 }));
            }, 700);
        } catch (error) {
            setVotingId(null);
            toast({
                title: '錯誤',
                description: '投票失敗，請稍後再試',
                variant: 'destructive'
            });
        }
    }, [toast, triggerVoteConfetti, addVote]);

    return {
        votingId,
        clickCount,
        showVoteOverlay,
        buttonRefs,
        handleVoteStart,
    };
}

