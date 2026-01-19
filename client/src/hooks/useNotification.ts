// 通知功能 Hook - 管理桌面通知權限和發送
import { useState, useEffect, useCallback } from 'react';

interface NotificationOptions {
    body?: string;
    icon?: string;
    tag?: string;
    requireInteraction?: boolean;
    silent?: boolean;
}

interface UseNotificationReturn {
    // 狀態
    permission: NotificationPermission;
    isSupported: boolean;
    isEnabled: boolean;
    // 操作
    requestPermission: () => Promise<boolean>;
    sendNotification: (title: string, options?: NotificationOptions) => void;
    setEnabled: (enabled: boolean) => void;
}

// localStorage 鍵名
const NOTIFICATION_ENABLED_KEY = 'notification_enabled';

export function useNotification(): UseNotificationReturn {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isEnabled, setIsEnabledState] = useState(false);

    // 檢查瀏覽器是否支援通知
    const isSupported = typeof window !== 'undefined' && 'Notification' in window;

    // 初始化：檢查權限狀態和用戶設定
    useEffect(() => {
        if (!isSupported) return;

        // 取得當前通知權限
        setPermission(Notification.permission);

        // 從 localStorage 讀取用戶是否啟用通知
        const savedEnabled = localStorage.getItem(NOTIFICATION_ENABLED_KEY);
        if (savedEnabled === 'true' && Notification.permission === 'granted') {
            setIsEnabledState(true);
        }
    }, [isSupported]);

    // 請求通知權限
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            console.warn('[Notification] 瀏覽器不支援通知');
            return false;
        }

        if (Notification.permission === 'granted') {
            setPermission('granted');
            setIsEnabledState(true);
            localStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');
            return true;
        }

        if (Notification.permission === 'denied') {
            console.warn('[Notification] 通知權限已被拒絕');
            setPermission('denied');
            return false;
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                setIsEnabledState(true);
                localStorage.setItem(NOTIFICATION_ENABLED_KEY, 'true');
                return true;
            }

            return false;
        } catch (error) {
            console.error('[Notification] 請求權限失敗:', error);
            return false;
        }
    }, [isSupported]);

    // 設定通知開關
    const setEnabled = useCallback((enabled: boolean) => {
        if (enabled && Notification.permission !== 'granted') {
            // 如果要開啟但還沒授權，先請求權限
            requestPermission();
            return;
        }

        setIsEnabledState(enabled);
        localStorage.setItem(NOTIFICATION_ENABLED_KEY, enabled ? 'true' : 'false');
    }, [requestPermission]);

    // 發送通知
    const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
        if (!isSupported) {
            console.warn('[Notification] 瀏覽器不支援通知');
            return;
        }

        if (!isEnabled) {
            console.log('[Notification] 通知已關閉');
            return;
        }

        if (Notification.permission !== 'granted') {
            console.warn('[Notification] 沒有通知權限');
            return;
        }

        try {
            const notification = new Notification(title, {
                icon: '/song/playground.png',
                badge: '/song/favicon.ico',
                ...options,
            });

            // 點擊通知時聚焦視窗
            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // 5 秒後自動關閉
            setTimeout(() => {
                notification.close();
            }, 5000);

        } catch (error) {
            console.error('[Notification] 發送通知失敗:', error);
        }
    }, [isSupported, isEnabled]);

    return {
        permission,
        isSupported,
        isEnabled,
        requestPermission,
        sendNotification,
        setEnabled,
    };
}
