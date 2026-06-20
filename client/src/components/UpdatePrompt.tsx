import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { useEffect } from 'react';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import { CassetteScrews } from './CassetteShell';
import { Z } from '@/lib/z';

export function UpdatePrompt() {
    const { updateAvailable, currentVersion, applyUpdate, dismissUpdate } = useServiceWorkerUpdate();

    useEffect(() => {
        document.body.classList.toggle('sw-update-prompt-visible', updateAvailable);
        return () => document.body.classList.remove('sw-update-prompt-visible');
    }, [updateAvailable]);

    return (
        <>
            <AnimatePresence>
                {updateAvailable && (
                    <motion.div
                        initial={{ y: 100, opacity: 0, scale: 0.96 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 100, opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                        className="pointer-events-auto fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto max-w-md sm:left-auto sm:right-4 sm:mx-0"
                        style={{ zIndex: Z.updatePrompt }}
                        role="alert"
                        aria-live="polite"
                    >
                        {/* 卡帶風更新提示 — 黑色外殼 + 雙轉軸 + 磁帶 + accent 藍動作鍵 */}
                        <div className="swu-cassette">
                            <CassetteScrews />

                            {/* 卡帶上標籤 */}
                            <div className="swu-toplabel">
                                <span className="swu-side">
                                    <span className="swu-live-dot" aria-hidden="true" />
                                    SIDE A · NEW VERSION
                                </span>
                                <button
                                    type="button"
                                    onClick={dismissUpdate}
                                    aria-label="暫時關閉更新提醒"
                                    className="swu-close"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>

                            {/* 雙轉軸 + 磁帶（呼應 Hero 卡帶） */}
                            <div className="swu-inner" aria-hidden="true">
                                <div className="swu-reels">
                                    <span className="swu-reel" />
                                    <span className="swu-tape"><i /></span>
                                    <span className="swu-reel" />
                                </div>
                                {currentVersion && <span className="swu-ver">v{currentVersion}</span>}
                            </div>

                            {/* 文案 */}
                            <div className="swu-body">
                                <div className="swu-title">有新版本可以更新</div>
                                <div className="swu-sub">
                                    已偵測到最新功能與修正，點一下即可重新載入並套用新版。
                                </div>
                            </div>

                            {/* 立即更新 */}
                            <button type="button" onClick={applyUpdate} className="swu-action">
                                <RefreshCw aria-hidden="true" />
                                立即更新
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {currentVersion && (
                <div
                    className="pointer-events-none fixed bottom-1 left-1 select-none font-mono text-[9px] tracking-tight text-stone-400/50 transition-colors hover:text-stone-500/80"
                    style={{ zIndex: Z.watermark }}
                >
                    v{currentVersion}
                </div>
            )}
        </>
    );
}
