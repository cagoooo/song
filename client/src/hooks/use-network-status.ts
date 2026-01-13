// 網路狀態監控 Hook
import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
    isOnline: boolean;
    isSlowConnection: boolean;
    connectionType: string;
    lastOnlineAt: Date | null;
}

interface Connection {
    effectiveType: string;
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
}

declare global {
    interface Navigator {
        connection?: Connection;
    }
}

export function useNetworkStatus(): NetworkStatus {
    const [status, setStatus] = useState<NetworkStatus>({
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
        isSlowConnection: false,
        connectionType: 'unknown',
        lastOnlineAt: null,
    });

    const updateNetworkStatus = useCallback(() => {
        const connection = navigator.connection;
        const isOnline = navigator.onLine;

        setStatus(prev => ({
            isOnline,
            isSlowConnection: connection?.effectiveType === '2g' ||
                connection?.effectiveType === 'slow-2g',
            connectionType: connection?.effectiveType || 'unknown',
            lastOnlineAt: isOnline && !prev.isOnline ? new Date() : prev.lastOnlineAt,
        }));
    }, []);

    useEffect(() => {
        // 初始化
        updateNetworkStatus();

        // 監聽網路狀態變化
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        // 監聽連線品質變化
        const connection = navigator.connection;
        if (connection) {
            connection.addEventListener('change', updateNetworkStatus);
        }

        return () => {
            window.removeEventListener('online', updateNetworkStatus);
            window.removeEventListener('offline', updateNetworkStatus);
            if (connection) {
                connection.removeEventListener('change', updateNetworkStatus);
            }
        };
    }, [updateNetworkStatus]);

    return status;
}
