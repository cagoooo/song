// 歌曲建議通知 Hook - 監聽訪客建議新歌曲並通知管理員
import { useEffect, useRef, useState, useCallback } from 'react';
import {
    collection,
    query,
    where,
    onSnapshot,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

interface SuggestionData {
    title: string;
    artist: string;
    suggestedBy?: string;
    notes?: string;
}

interface UseSuggestionNotificationOptions {
    isAdmin: boolean;
    enabled?: boolean;
}

interface UseSuggestionNotificationReturn {
    // 當前要顯示的建議通知
    currentSuggestion: SuggestionData | null;
    isVisible: boolean;
    // 關閉通知
    dismiss: () => void;
}

export function useSuggestionNotification({
    isAdmin,
    enabled = true,
}: UseSuggestionNotificationOptions): UseSuggestionNotificationReturn {
    const [currentSuggestion, setCurrentSuggestion] = useState<SuggestionData | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    // 通知佇列（多個建議時依序顯示）
    const notificationQueue = useRef<SuggestionData[]>([]);

    // 追蹤已處理的建議 ID，避免重複通知
    const processedIds = useRef<Set<string>>(new Set());
    const isFirstSnapshot = useRef(true);

    // 顯示下一個通知
    const showNextNotification = useCallback(() => {
        if (notificationQueue.current.length > 0) {
            const next = notificationQueue.current.shift()!;
            setCurrentSuggestion(next);
            setIsVisible(true);
        }
    }, []);

    // 關閉通知
    const dismiss = useCallback(() => {
        setIsVisible(false);
        // 延遲清除內容，讓動畫完成
        setTimeout(() => {
            setCurrentSuggestion(null);
            // 顯示下一個（如果有的話）
            showNextNotification();
        }, 300);
    }, [showNextNotification]);

    useEffect(() => {
        // 只有管理員才需要收到建議通知
        if (!isAdmin || !enabled) {
            return;
        }

        console.log('[SuggestionNotification] 開始監聽歌曲建議...');

        const suggestionsRef = collection(db, COLLECTIONS.songSuggestions);

        // 簡化查詢 - 只監聽 pending 狀態的建議
        const q = query(
            suggestionsRef,
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
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
                if (change.type === 'added') {
                    const docId = change.doc.id;

                    // 避免重複通知
                    if (processedIds.current.has(docId)) {
                        return;
                    }

                    processedIds.current.add(docId);

                    const data = change.doc.data();

                    console.log('[SuggestionNotification] 新建議:', data.title, data.artist);

                    const suggestionData: SuggestionData = {
                        title: data.title,
                        artist: data.artist,
                        suggestedBy: data.suggestedBy,
                        notes: data.notes,
                    };

                    // 如果目前沒有顯示通知，直接顯示
                    if (!isVisible && notificationQueue.current.length === 0) {
                        setCurrentSuggestion(suggestionData);
                        setIsVisible(true);
                    } else {
                        // 否則加入佇列
                        notificationQueue.current.push(suggestionData);
                    }
                }
            });
        }, (error) => {
            console.error('[SuggestionNotification] 監聽錯誤:', error);
        });

        return () => {
            console.log('[SuggestionNotification] 停止監聯');
            unsubscribe();
        };
    }, [isAdmin, enabled, isVisible]);

    return {
        currentSuggestion,
        isVisible,
        dismiss,
    };
}
