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
                    <div className="bg-[#faf7f0] rounded-xl shadow-lg border border-[rgba(17,17,17,0.14)] p-4 backdrop-blur-sm relative">
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors"
                            aria-label="關閉"
                        >
                            <X className="w-4 h-4 text-slate-500" />
                        </button>

                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 rounded-md bg-white border border-[rgba(17,17,17,0.14)] flex items-center justify-center">
                                <span className="text-2xl">🎸</span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: 10,
                                        letterSpacing: '0.22em',
                                        textTransform: 'uppercase',
                                        color: 'var(--ed-ink-3)',
                                        marginBottom: 2,
                                    }}
                                >
                                    Install App
                                </div>
                                <h3
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontStyle: 'italic',
                                        fontWeight: 800,
                                        fontSize: 17,
                                        letterSpacing: '-0.015em',
                                        color: 'var(--ed-ink-1)',
                                    }}
                                >
                                    加入主畫面
                                </h3>
                                <p className="text-xs text-slate-600 mt-0.5">
                                    離線也能瀏覽歌單，跟看 App 一樣方便。
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                            <Button
                                onClick={handleInstallClick}
                                size="sm"
                                className="flex-1 bg-[#2b4dff] hover:bg-[#1d3bd8] text-white shadow-sm rounded-full"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 11,
                                    letterSpacing: '0.16em',
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                }}
                            >
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                立即安裝
                            </Button>
                            <Button
                                onClick={handleDismiss}
                                variant="outline"
                                size="sm"
                                className="border-[rgba(17,17,17,0.18)] text-slate-600 hover:bg-white rounded-full"
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
