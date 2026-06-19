import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';

export function UpdatePrompt() {
    const { updateAvailable, currentVersion, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();

    return (
        <>
            <AnimatePresence>
                {updateAvailable && (
                    <motion.div
                        initial={{ y: 100, opacity: 0, scale: 0.96 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 100, opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                        className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[90] mx-auto max-w-md sm:left-auto sm:right-4 sm:mx-0"
                        role="alert"
                        aria-live="polite"
                    >
                        <div className="rounded-xl border-2 border-amber-300 bg-white shadow-2xl shadow-amber-500/20 p-4">
                            <div className="flex items-start gap-3">
                                <div className="shrink-0">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                                        <Sparkles className="h-5 w-5 text-white" />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-bold text-stone-950">
                                        有新版本可以更新
                                    </div>
                                    <div className="mt-1 text-xs leading-relaxed text-stone-600">
                                        已偵測到最新功能與修正，點一下即可重新載入並套用新版。
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={dismissUpdate}
                                    aria-label="暫時關閉更新提醒"
                                    className="shrink-0 rounded-md p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <Button
                                type="button"
                                onClick={applyUpdate}
                                className="mt-3 w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-white shadow-md transition-all hover:from-amber-600 hover:to-orange-700 hover:shadow-lg"
                            >
                                <RefreshCw className="h-4 w-4" />
                                立即更新
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {currentVersion && (
                <div className="pointer-events-none fixed bottom-1 left-1 z-[55] select-none font-mono text-[9px] tracking-tight text-stone-400/50 transition-colors hover:text-stone-500/80">
                    v{currentVersion}
                </div>
            )}
        </>
    );
}
