// PWA 安裝提示元件
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // 檢查是否已經安裝
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // 監聽 beforeinstallprompt 事件
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // 延遲顯示提示，避免打擾用戶
            setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
        };

        // 監聽 appinstalled 事件
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                console.log('[PWA] 用戶接受安裝');
            } else {
                console.log('[PWA] 用戶拒絕安裝');
            }
        } catch (error) {
            console.error('[PWA] 安裝提示失敗:', error);
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // 記住用戶選擇，24 小時內不再提示
        localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    };

    // 檢查是否最近關閉過提示
    useEffect(() => {
        const dismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed, 10);
            const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
            if (hoursSinceDismissed < 24) {
                setShowPrompt(false);
            }
        }
    }, []);

    if (isInstalled || !deferredPrompt) {
        return null;
    }

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50"
                >
                    <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl shadow-xl border border-amber-200 p-4 backdrop-blur-sm">
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-amber-100 transition-colors"
                            aria-label="關閉"
                        >
                            <X className="w-4 h-4 text-amber-600" />
                        </button>

                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                <span className="text-2xl">🎸</span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-amber-900 text-sm">
                                    安裝吉他點歌 App
                                </h3>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    加入主畫面，離線也能瀏覽歌單！
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                            <Button
                                onClick={handleInstallClick}
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
                            >
                                <Download className="w-4 h-4 mr-1.5" />
                                立即安裝
                            </Button>
                            <Button
                                onClick={handleDismiss}
                                variant="outline"
                                size="sm"
                                className="border-amber-200 text-amber-700 hover:bg-amber-50"
                            >
                                稍後
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
