import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getMilestone, type ComboState } from '@/hooks/useComboCounter';

interface ComboOverlayProps {
    combo: ComboState | null;
}

/**
 * 全螢幕中央連擊大字效果。只在 count >= 3 時顯示，
 * 每次 combo 增加 / 升級都會重播動畫並噴 confetti。
 */
export function ComboOverlay({ combo }: ComboOverlayProps) {
    const lastConfettiKey = useRef<string>('');
    const milestone = combo ? getMilestone(combo.count) : null;

    // 升級時噴 confetti（同 key 不重複）
    useEffect(() => {
        if (!combo || !milestone) return;
        const key = `${combo.songId}_${combo.count}`;
        if (lastConfettiKey.current === key) return;
        lastConfettiKey.current = key;
        confetti({
            particleCount: milestone.confettiCount,
            spread: 80,
            origin: { x: 0.5, y: 0.4 },
            colors: ['#fbbf24', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'],
            ticks: 80,
            scalar: combo.count >= 20 ? 1.4 : 1,
            shapes: ['circle', 'square', 'star'],
            zIndex: 10000,
        });
    }, [combo, milestone]);

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
                        className="text-center"
                        initial={{ scale: 0.4, rotate: -15 }}
                        animate={{
                            scale: [0.4, 1.4, 1],
                            rotate: [-15, 8, 0],
                        }}
                        exit={{ scale: 1.6, opacity: 0, rotate: 8 }}
                        transition={{
                            duration: 0.6,
                            times: [0, 0.5, 1],
                            type: 'spring',
                            stiffness: 200,
                        }}
                    >
                        {/* 主標籤 */}
                        <motion.div
                            className={`bg-gradient-to-r ${milestone.gradient} bg-clip-text text-transparent font-black tracking-tight drop-shadow-2xl`}
                            style={{
                                fontSize: combo.count >= 50 ? '14rem' : combo.count >= 20 ? '11rem' : combo.count >= 10 ? '9rem' : '7rem',
                                lineHeight: 0.9,
                                WebkitTextStroke: '3px rgba(255,255,255,0.3)',
                            }}
                            animate={{
                                textShadow: [
                                    '0 0 20px rgba(251,191,36,0.4)',
                                    '0 0 40px rgba(239,68,68,0.6)',
                                    '0 0 20px rgba(251,191,36,0.4)',
                                ],
                            }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                        >
                            {milestone.emoji} ×{combo.count}
                        </motion.div>

                        {/* 副標籤 */}
                        <motion.div
                            className={`mt-4 inline-block px-8 py-2 rounded-full bg-gradient-to-r ${milestone.gradient} text-white font-extrabold text-2xl md:text-3xl shadow-2xl`}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {milestone.label} COMBO
                        </motion.div>

                        {/* 歌名 (小) */}
                        <motion.div
                            className="mt-3 text-white/90 text-base md:text-lg font-bold drop-shadow-lg"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            {combo.songTitle} · {combo.songArtist}
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
