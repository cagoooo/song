// 通知鈴鐺元件 - 管理員專用，用於開啟/關閉通知
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotification } from '@/hooks/useNotification';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function NotificationBell() {
    const { permission, isSupported, isEnabled, requestPermission, setEnabled } = useNotification();
    const [showTooltip, setShowTooltip] = useState(false);

    // 不支援通知的瀏覽器不顯示
    if (!isSupported) {
        return null;
    }

    // 處理點擊
    const handleClick = async () => {
        if (permission === 'denied') {
            // 權限被拒絕，顯示提示
            setShowTooltip(true);
            setTimeout(() => setShowTooltip(false), 3000);
            return;
        }

        if (permission === 'default') {
            // 尚未授權，請求權限
            await requestPermission();
            return;
        }

        // 已授權，切換開關
        setEnabled(!isEnabled);
    };

    // 根據狀態決定圖示和顏色
    const getIconAndStyle = () => {
        if (permission === 'denied') {
            return {
                icon: <BellOff className="h-5 w-5" />,
                className: 'text-slate-400 hover:text-slate-500',
                title: '通知已被封鎖',
            };
        }

        if (!isEnabled) {
            return {
                icon: <Bell className="h-5 w-5" />,
                className: 'text-slate-500 hover:text-slate-700',
                title: '開啟投票通知',
            };
        }

        return {
            icon: <BellRing className="h-5 w-5" />,
            className: 'text-amber-500 hover:text-amber-600',
            title: '通知已開啟',
        };
    };

    const { icon, className, title } = getIconAndStyle();

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                onClick={handleClick}
                className={`relative ${className} transition-colors`}
                title={title}
            >
                {icon}

                {/* 已開啟時顯示小綠點 */}
                {isEnabled && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"
                    />
                )}
            </Button>

            {/* 權限被拒絕時的提示 */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute top-full right-0 mt-2 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50"
                    >
                        <p className="font-medium mb-1">通知已被封鎖</p>
                        <p className="text-slate-300">請在瀏覽器設定中允許通知</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
