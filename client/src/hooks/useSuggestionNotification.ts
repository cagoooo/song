// 歌曲建議通知 Hook - 監聽訪客建議新歌曲並通知管理員
import { useEffect, useRef } from 'react';
import { useToast } from './use-toast';
import {
    collection,
    query,
    where,
    onSnapshot,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

interface UseSuggestionNotificationOptions {
    isAdmin: boolean;
    enabled?: boolean;
}

export function useSuggestionNotification({
    isAdmin,
    enabled = true,
}: UseSuggestionNotificationOptions) {
    const { toast } = useToast();

    // 追蹤已處理的建議 ID，避免重複通知
    const processedIds = useRef<Set<string>>(new Set());
    const isFirstSnapshot = useRef(true);

    useEffect(() => {
        // 只有管理員才需要收到建議通知
        if (!isAdmin || !enabled) {
            return;
        }

        console.log('[SuggestionNotification] 開始監聽歌曲建議...');

        const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);

        // 簡化查詢 - 只監聽 pending 狀態的建議（避免索引問題）
        const q = query(
            suggestionsRef,
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log('[SuggestionNotification] 收到快照更新，文件數:', snapshot.docs.length);

            // 第一次載入時，記錄所有現有建議但不通知
            if (isFirstSnapshot.current) {
                snapshot.docs.forEach((doc) => {
                    processedIds.current.add(doc.id);
                });
                console.log('[SuggestionNotification] 初始化完成，已記錄', processedIds.current.size, '個現有建議');
                isFirstSnapshot.current = false;
                return;
            }

            // 處理新增的建議
            snapshot.docChanges().forEach((change) => {
                console.log('[SuggestionNotification] 文件變化:', change.type, change.doc.id);

                if (change.type === 'added') {
                    const docId = change.doc.id;

                    // 避免重複通知
                    if (processedIds.current.has(docId)) {
                        console.log('[SuggestionNotification] 已處理過，跳過:', docId);
                        return;
                    }

                    processedIds.current.add(docId);

                    const data = change.doc.data();

                    console.log('[SuggestionNotification] 發送通知:', data.title, data.artist);

                    // 顯示 toast 通知
                    toast({
                        title: '🎵 新歌曲建議！',
                        description: `訪客建議了「${data.title}」- ${data.artist}`,
                        className: 'bg-amber-50 border-amber-200 text-amber-800',
                        duration: 5000, // 5 秒後自動關閉
                    });
                }
            });
        }, (error) => {
            console.error('[SuggestionNotification] 監聽錯誤:', error);
        });

        return () => {
            console.log('[SuggestionNotification] 停止監聯');
            unsubscribe();
        };
    }, [isAdmin, enabled, toast]);
}
