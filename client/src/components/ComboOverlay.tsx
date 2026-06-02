import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getMilestone, type ComboState } from '@/hooks/useComboCounter';

interface ComboOverlayProps {
    combo: ComboState | null;
    /** soft 防干擾模式：仍顯示卡片但不放彩帶（避免搜尋時彩帶亂噴干擾） */
    suppressConfetti?: boolean;
}

/**
 * 連擊覆蓋層 — Editorial 雜誌風拍立得
 * 白色卡片旋轉 -3° + ★ COMBO ×N ★ 黑色頂條 + 大義式藍 N× + 副標「連發點播 · 別停下來」
 */
export function ComboOverlay({ combo, suppressConfetti = false }: ComboOverlayProps) {
    const lastConfettiKey = useRef<string>('');
    const milestone = combo ? getMilestone(combo.count) : null;

    useEffect(() => {
        if (!combo || !milestone || suppressConfetti) return;
        const key = `${combo.songId}_${combo.count}`;
        if (lastConfettiKey.current === key) return;
        lastConfettiKey.current = key;
        confetti({
            particleCount: milestone.confettiCount,
            spread: 80,
            origin: { x: 0.5, y: 0.4 },
            colors: ['#2b4dff', '#ffffff', '#0ea5e9', '#1d4ed8'],
            ticks: 80,
            scalar: combo.count >= 20 ? 1.4 : 1,
            shapes: ['circle', 'square', 'star'],
            zIndex: 10000,
        });
    }, [combo, milestone, suppressConfetti]);

    return (
        <AnimatePresence>
            {combo && milestone && (
                <motion.div
                    key={`${combo.songId}_${combo.count}`}
                    className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <motion.div
                        className="editorial-polaroid"
                        style={{ minWidth: 320 }}
                        initial={{ scale: 0.5, rotate: -10, y: 30 }}
                        animate={{ scale: 1, rotate: -3, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, rotate: 4, y: -20 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                    >
                        {/* ★ COMBO ×N ★ 眉標 */}
                        <div className="editorial-polaroid-eyebrow">
                            <span>★</span>
                            <span>COMBO × {combo.count}</span>
                            <span>★</span>
                        </div>

                        {/* 大字 N× */}
                        <div className="text-center">
                            <motion.div
                                className="editorial-polaroid-num"
                                animate={{
                                    scale: [1, 1.04, 1],
                                }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                            >
                                {combo.count}
                                <span
                                    style={{
                                        fontSize: '0.55em',
                                        marginLeft: 8,
                                        fontStyle: 'italic',
                                        verticalAlign: '0.18em',
                                    }}
                                >
                                    ×
                                </span>
                            </motion.div>

                            {/* 副標 — 連發點播 · 別停下來 */}
                            <div className="editorial-polaroid-sub text-center">
                                連發點播 · 別停下來
                            </div>

                            {/* 歌名（小） */}
                            <motion.div
                                className="mt-3 text-slate-500"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.16em',
                                    textTransform: 'uppercase',
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {combo.songTitle} · {combo.songArtist}
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
