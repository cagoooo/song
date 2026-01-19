// 投票通知 Hook - 監聽投票變化並發送通知給管理員
import { useEffect, useRef } from 'react';
import { useNotification } from './useNotification';
import type { Song } from '@/lib/firestore';

interface UseVoteNotificationOptions {
    songs: Song[];
    isAdmin: boolean;
    enabled?: boolean;
}

export function useVoteNotification({
    songs,
    isAdmin,
    enabled = true,
}: UseVoteNotificationOptions) {
    const { sendNotification, isEnabled } = useNotification();

    // 追蹤上一次的投票計數
    const prevVotesRef = useRef<Record<string, number>>({});
    const isFirstRender = useRef(true);

    useEffect(() => {
        // 只有管理員才需要收到投票通知
        if (!isAdmin || !enabled || !isEnabled) {
            return;
        }

        // 第一次載入時，記錄當前票數但不發通知
        if (isFirstRender.current) {
            const currentVotes: Record<string, number> = {};
            songs.forEach((song) => {
                currentVotes[song.id] = song.voteCount || 0;
            });
            prevVotesRef.current = currentVotes;
            isFirstRender.current = false;
            return;
        }

        // 比較新舊票數，找出有新投票的歌曲
        songs.forEach((song) => {
            const prevCount = prevVotesRef.current[song.id] || 0;
            const currentCount = song.voteCount || 0;

            if (currentCount > prevCount) {
                const increase = currentCount - prevCount;

                // 發送通知
                sendNotification('🎵 新點播！', {
                    body: `「${song.title}」獲得 +${increase} 票！`,
                    tag: `vote-${song.id}`, // 相同歌曲的通知會合併
                });
            }

            // 更新記錄
            prevVotesRef.current[song.id] = currentCount;
        });

    }, [songs, isAdmin, enabled, isEnabled, sendNotification]);
}
