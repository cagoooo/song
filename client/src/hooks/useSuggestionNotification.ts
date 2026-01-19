// 歌曲建議通知 Hook - 監聽訪客建議新歌曲並通知管理員
import { useEffect, useRef } from 'react';
import { useToast } from './use-toast';
import {
    collection,
    query,
    where,
    orderBy,
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

        const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);

        // 監聽 pending 狀態的建議（新建議）
        const q = query(
            suggestionsRef,
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // 第一次載入時，記錄所有現有建議但不通知
            if (isFirstSnapshot.current) {
                snapshot.docs.forEach((doc) => {
                    processedIds.current.add(doc.id);
                });
                isFirstSnapshot.current = false;
                return;
            }

            // 處理新增的建議
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const docId = change.doc.id;

                    // 避免重複通知
                    if (processedIds.current.has(docId)) {
                        return;
                    }

                    processedIds.current.add(docId);

                    const data = change.doc.data();

                    // 顯示 toast 通知
                    toast({
                        title: '🎵 新歌曲建議！',
                        description: `訪客建議了「${data.title}」- ${data.artist}`,
                        className: 'bg-amber-50 border-amber-200 text-amber-800',
                        duration: 5000, // 5 秒後自動關閉
                    });
                }
            });
        });

        return () => unsubscribe();
    }, [isAdmin, enabled, toast]);
}
