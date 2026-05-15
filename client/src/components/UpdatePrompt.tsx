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
                        <div className="rounded-xl border border-[rgba(17,17,17,0.14)] bg-[#faf7f0] shadow-lg p-4 backdrop-blur">
                            <div className="flex items-start gap-3">
                                <motion.div
                                    animate={{ rotate: [0, 12, -12, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    className="shrink-0"
                                >
                                    <div className="w-10 h-10 rounded-md bg-white border border-[rgba(17,17,17,0.14)] flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-[#2b4dff]" />
                                    </div>
                                </motion.div>
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
                                        New Issue
                                    </div>
                                    <div
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                            fontStyle: 'italic',
                                            fontWeight: 800,
                                            fontSize: 17,
                                            letterSpacing: '-0.015em',
                                            color: 'var(--ed-ink-1)',
                                        }}
                                    >
                                        新版本可用
                                    </div>
                                    <div className="text-xs text-slate-600 mt-0.5">
                                        有新功能 / 修正在等你，立刻更新體驗
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDismissed(true)}
                                    aria-label="暫時關閉更新提示"
                                    className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <Button
                                type="button"
                                onClick={applyUpdate}
                                className="w-full mt-3 bg-[#2b4dff] hover:bg-[#1d3bd8] text-white gap-2 shadow-sm rounded-full"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 11,
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    fontWeight: 600,
                                }}
                            >
                                <RefreshCw className="w-4 h-4" />
                                立刻更新 →
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
