// 網路狀態提示橫幅
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, AlertTriangle, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useEffect, useState } from 'react';

export function NetworkStatusBanner() {
    const { isOnline, isSlowConnection, lastOnlineAt } = useNetworkStatus();
    const [showReconnected, setShowReconnected] = useState(false);

    // 當網路恢復時顯示提示
    useEffect(() => {
        if (isOnline && lastOnlineAt) {
            setShowReconnected(true);
            const timer = setTimeout(() => setShowReconnected(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, lastOnlineAt]);

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 px-4 shadow-lg"
                >
                    <div className="flex items-center justify-center gap-3 max-w-screen-xl mx-auto">
                        <WifiOff className="h-5 w-5 animate-pulse" />
                        <span className="font-medium">網路連線中斷，部分功能無法使用</span>
                    </div>
                </motion.div>
            )}

            {isOnline && isSlowConnection && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-yellow-500 to-amber-500 text-black py-3 px-4 shadow-lg"
                >
                    <div className="flex items-center justify-center gap-3 max-w-screen-xl mx-auto">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">網路連線緩慢，載入可能較久</span>
                    </div>
                </motion.div>
            )}

            {showReconnected && isOnline && !isSlowConnection && (
                <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 px-4 shadow-lg"
                >
                    <div className="flex items-center justify-center gap-3 max-w-screen-xl mx-auto">
                        <Wifi className="h-5 w-5" />
                        <span className="font-medium">網路已恢復連線</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
