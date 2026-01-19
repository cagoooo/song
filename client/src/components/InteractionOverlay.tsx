// 互動動畫覆蓋層 - 接收並顯示全螢幕動畫
import { useEffect, useState, useCallback } from 'react';
import { useNowPlaying } from '@/hooks/useNowPlaying';
import { useInteractions } from '@/hooks/useInteractions';
import { useUser } from '@/hooks/use-user';
import TipAnimation from './TipAnimation';
import RatingAnimation from './RatingAnimation';
import type { TipType, Interaction } from '@/lib/firestore';

// 動畫佇列項目
interface AnimationItem {
    id: string;
    type: 'tip' | 'rating';
    tipType?: TipType;
    rating?: 1 | 2 | 3 | 4 | 5;
}

// 最大同時動畫數量
const MAX_ANIMATIONS = 3;

export default function InteractionOverlay() {
    const nowPlaying = useNowPlaying();
    const { user } = useUser();
    const songId = nowPlaying?.songId || null;
    const isAdmin = !!user?.isAdmin;

    const { currentInteraction, clearCurrentInteraction } = useInteractions({
        songId,
        enabled: !!songId,
        isAdmin, // 管理員可以看到所有互動動畫包括評分
    });

    // 動畫佇列
    const [animationQueue, setAnimationQueue] = useState<AnimationItem[]>([]);

    // 處理新的互動事件
    useEffect(() => {
        if (!currentInteraction) return;

        const newItem: AnimationItem = {
            id: currentInteraction.id,
            type: currentInteraction.type,
            tipType: currentInteraction.tipType,
            rating: currentInteraction.rating,
        };

        setAnimationQueue((prev) => {
            // 限制佇列長度
            const updated = [...prev, newItem];
            if (updated.length > MAX_ANIMATIONS) {
                return updated.slice(-MAX_ANIMATIONS);
            }
            return updated;
        });

        // 清除當前互動以便接收下一個
        clearCurrentInteraction();
    }, [currentInteraction, clearCurrentInteraction]);

    // 動畫完成處理
    const handleAnimationComplete = useCallback((id: string) => {
        setAnimationQueue((prev) => prev.filter((item) => item.id !== id));
    }, []);

    // 當歌曲改變時清空佇列
    useEffect(() => {
        setAnimationQueue([]);
    }, [songId]);

    if (!songId || animationQueue.length === 0) {
        return null;
    }

    return (
        <>
            {animationQueue.map((item) => (
                <div key={item.id}>
                    {item.type === 'tip' && item.tipType && (
                        <TipAnimation
                            tipType={item.tipType}
                            isVisible={true}
                            onComplete={() => handleAnimationComplete(item.id)}
                        />
                    )}
                    {item.type === 'rating' && item.rating && (
                        <RatingAnimation
                            rating={item.rating}
                            isVisible={true}
                            onComplete={() => handleAnimationComplete(item.id)}
                        />
                    )}
                </div>
            ))}
        </>
    );
}
