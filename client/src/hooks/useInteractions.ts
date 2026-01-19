// 互動功能 Hook - 管理打賞和評分
import { useState, useEffect, useCallback } from 'react';
import {
    sendTip,
    sendRating,
    subscribeInteractions,
    subscribeRatingStats,
    getSessionId,
    type TipType,
    type Interaction,
    type RatingStats,
} from '@/lib/firestore';

interface UseInteractionsOptions {
    songId: string | null;
    enabled?: boolean;
    isAdmin?: boolean; // 管理員可以看到所有互動動畫
}

interface UseInteractionsReturn {
    // 狀態
    ratingStats: RatingStats;
    currentInteraction: Interaction | null;
    isSending: boolean;
    userRating: number | null;
    // 操作
    handleSendTip: (tipType: TipType) => Promise<void>;
    handleSendRating: (rating: 1 | 2 | 3 | 4 | 5) => Promise<void>;
    clearCurrentInteraction: () => void;
}

export function useInteractions({ songId, enabled = true, isAdmin = false }: UseInteractionsOptions): UseInteractionsReturn {
    const [ratingStats, setRatingStats] = useState<RatingStats>({ average: 0, count: 0, total: 0 });
    const [currentInteraction, setCurrentInteraction] = useState<Interaction | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [userRating, setUserRating] = useState<number | null>(null);

    // 從 localStorage 讀取用戶評分
    useEffect(() => {
        if (!songId) {
            setUserRating(null);
            return;
        }
        const saved = localStorage.getItem(`rating_${songId}`);
        if (saved) {
            setUserRating(parseInt(saved, 10));
        } else {
            setUserRating(null);
        }
    }, [songId]);

    // 監聽評分統計
    useEffect(() => {
        if (!songId || !enabled) {
            setRatingStats({ average: 0, count: 0, total: 0 });
            return;
        }

        const unsubscribe = subscribeRatingStats(songId, setRatingStats);
        return () => unsubscribe();
    }, [songId, enabled]);

    // 監聽互動事件（用於觸發動畫）
    useEffect(() => {
        if (!songId || !enabled) return;

        const unsubscribe = subscribeInteractions(songId, (interaction) => {
            // 管理員可以看到所有互動動畫（包括評分）
            // 訪客只能看到打賞動畫（評分保護隱私）
            if (interaction.type === 'rating' && !isAdmin) {
                return; // 訪客不觸發評分動畫
            }
            setCurrentInteraction(interaction);
        });

        return () => unsubscribe();
    }, [songId, enabled, isAdmin]);

    // 發送打賞
    const handleSendTip = useCallback(async (tipType: TipType) => {
        if (!songId || isSending) return;

        setIsSending(true);
        try {
            const sessionId = getSessionId();
            await sendTip(songId, tipType, sessionId);
        } catch (error) {
            console.error('Failed to send tip:', error);
        } finally {
            setIsSending(false);
        }
    }, [songId, isSending]);

    // 發送評分
    const handleSendRating = useCallback(async (rating: 1 | 2 | 3 | 4 | 5) => {
        if (!songId || isSending) return;

        setIsSending(true);
        try {
            const sessionId = getSessionId();
            await sendRating(songId, rating, sessionId);
            // 保存到 localStorage 確保星星保持顯示
            localStorage.setItem(`rating_${songId}`, rating.toString());
            setUserRating(rating);
        } catch (error) {
            console.error('Failed to send rating:', error);
        } finally {
            setIsSending(false);
        }
    }, [songId, isSending]);

    // 清除當前互動（動畫完成後調用）
    const clearCurrentInteraction = useCallback(() => {
        setCurrentInteraction(null);
    }, []);

    return {
        ratingStats,
        currentInteraction,
        isSending,
        userRating,
        handleSendTip,
        handleSendRating,
        clearCurrentInteraction,
    };
}
