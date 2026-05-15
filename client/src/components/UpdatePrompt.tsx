import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';

/**
 * 右下角彈出新版本通知 banner + 左下角版本徽章。
 * 使用者點「立刻更新」→ SW 切換新版 + reload；
 * 點 X 暫時關閉（左下角徽章變藍色 pulse 提示，點擊可重開 banner）。
 */
export function UpdatePrompt() {
    const { updateAvailable, currentVersion, applyUpdate } = useServiceWorkerUpdate();
    const [dismissed, setDismissed] = useState(false);
    const visible = updateAvailable && !dismissed;

    // 短版本字串：去掉 git hash 後綴讓徽章不要太長
    // e.g. "4.2.0-ac1f138-wdxq" → "4.2.0"
    const shortVersion = currentVersion?.split('-')[0] ?? null;

    return (
        <>
            {/* Banner — 新版可用時跳出 */}
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

            {/* 左下角版本徽章 —
                · 一般狀態：米色 pill 顯示版本號 v4.2.0（中性灰，清楚可讀）
                · 有新版可用（banner 被關掉時）：變藍色 + pulse + 點擊可重開 banner */}
            {shortVersion && (
                updateAvailable && dismissed ? (
                    /* 有新版被忽略 — 顯眼藍色 pulse pill，點擊重開 banner */
                    <motion.button
                        type="button"
                        onClick={() => setDismissed(false)}
                        className="fixed bottom-3 left-3 z-[55] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2b4dff] text-white shadow-md hover:shadow-lg active:scale-95 transition-all"
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                        }}
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                        aria-label="有新版本可用，點擊重開更新通知"
                        title="點擊重開更新通知"
                    >
                        <RefreshCw className="w-3 h-3" />
                        新版可用 · v{shortVersion}
                    </motion.button>
                ) : (
                    /* 一般狀態 — 米色 pill，清楚可讀但不搶眼；hover 顯示完整 git hash */
                    <button
                        type="button"
                        onClick={() => {
                            if (currentVersion && navigator.clipboard) {
                                navigator.clipboard.writeText(currentVersion).catch(() => {});
                            }
                        }}
                        className="fixed bottom-3 left-3 z-[55] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#faf7f0] border border-[rgba(17,17,17,0.14)] text-slate-500 hover:text-[#2b4dff] hover:border-[#2b4dff] transition-colors cursor-pointer"
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.14em',
                            fontWeight: 500,
                        }}
                        title={`完整版本：${currentVersion}\n點擊複製`}
                        aria-label={`目前版本 ${currentVersion}，點擊複製完整版本字串`}
                    >
                        v{shortVersion}
                    </button>
                )
            )}
        </>
    );
}
