import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';

/**
 * 右下角彈出新版本通知 banner。
 * 使用者點「立刻更新」→ SW 切換新版 + reload；點 X 暫時關閉 (下次 SW 再 update 還會出現)。
 */
export function UpdatePrompt() {
    const { updateAvailable, currentVersion, applyUpdate } = useServiceWorkerUpdate();
    const [dismissed, setDismissed] = useState(false);
    const visible = updateAvailable && !dismissed;

    return (
        <>
            <AnimatePresence>
                {visible && (
                    <motion.div
                        initial={{ y: 100, opacity: 0, scale: 0.9 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 100, opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                        className="fixed bottom-4 right-4 z-[60] max-w-[calc(100vw-2rem)] sm:max-w-sm"
                        role="alert"
                        aria-live="polite"
                    >
                        <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-white via-amber-50 to-orange-50 dark:from-stone-900 dark:via-stone-900 dark:to-amber-950/40 dark:border-amber-700 shadow-2xl shadow-amber-500/20 p-4 backdrop-blur">
                            <div className="flex items-start gap-3">
                                <motion.div
                                    animate={{ rotate: [0, 15, -15, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="shrink-0"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                </motion.div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                                        🎸 新版本可用
                                    </div>
                                    <div className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                                        有新功能 / 修正在等你, 立刻更新體驗
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDismissed(true)}
                                    aria-label="暫時關閉更新提示"
                                    className="shrink-0 p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <Button
                                type="button"
                                onClick={applyUpdate}
                                className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold gap-2 shadow-md hover:shadow-lg transition-all"
                            >
                                <RefreshCw className="w-4 h-4" />
                                立刻更新
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 左下角小型版本徽章 — 提供使用者驗證自己跑的是哪版本, hover 才顯示, 不擾動視覺 */}
            {currentVersion && (
                <div className="fixed bottom-1 left-1 z-[55] text-[9px] text-stone-400/40 hover:text-stone-500/80 dark:text-stone-600/40 dark:hover:text-stone-400/80 font-mono tracking-tight pointer-events-none select-none transition-colors">
                    v{currentVersion}
                </div>
            )}
        </>
    );
}
