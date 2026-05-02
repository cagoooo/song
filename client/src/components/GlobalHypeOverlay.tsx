import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { HYPE_META, type HypeEvent } from '@/hooks/useGlobalHype';

interface GlobalHypeOverlayProps {
    event: HypeEvent | null;
}

/**
 * 全站熱度 banner — 上下兩條漸層長條 + 中央大字。
 * 與 ComboOverlay 不衝突 (z 9997 < 9999)。
 */
export function GlobalHypeOverlay({ event }: GlobalHypeOverlayProps) {
    const lastKey = useRef('');
    const meta = event ? HYPE_META[event.level] : null;

    useEffect(() => {
        if (!event || !meta) return;
        const key = `${event.triggeredAt}`;
        if (lastKey.current === key) return;
        lastKey.current = key;
        // 全站歡呼用 5 個射擊位置同時噴
        const positions = [0.1, 0.3, 0.5, 0.7, 0.9];
        positions.forEach((x, i) => {
            setTimeout(() => {
                confetti({
                    particleCount: event.level * 30,
                    spread: 60,
                    origin: { x, y: 0.3 },
                    colors: ['#fbbf24', '#ef4444', '#a855f7', '#ec4899', '#06b6d4', '#10b981'],
                    ticks: 100,
                    scalar: 1.1,
                    shapes: ['circle', 'star'],
                    zIndex: 9997,
                });
            }, i * 80);
        });
    }, [event, meta]);

    return (
        <AnimatePresence>
            {event && meta && (
                <motion.div
                    key={event.triggeredAt}
                    className="fixed inset-0 z-[9997] pointer-events-none flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* 上方掃光長條 */}
                    <motion.div
                        className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${meta.barGradient}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        style={{ originX: 0 }}
                        transition={{ duration: 0.5 }}
                    />
                    {/* 下方掃光長條 */}
                    <motion.div
                        className={`absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r ${meta.barGradient}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        style={{ originX: 1 }}
                        transition={{ duration: 0.5 }}
                    />

                    {/* 中央大字 */}
                    <motion.div
                        className="text-center"
                        initial={{ scale: 0.6, y: -30 }}
                        animate={{
                            scale: [0.6, 1.2, 1],
                            y: 0,
                        }}
                        exit={{ scale: 1.4, opacity: 0, y: -50 }}
                        transition={{ duration: 0.7, type: 'spring', stiffness: 220 }}
                    >
                        <motion.div
                            className="text-7xl md:text-9xl mb-2"
                            animate={{
                                rotate: [0, -8, 8, -8, 0],
                                scale: [1, 1.1, 1, 1.1, 1],
                            }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                        >
                            {meta.emoji}
                        </motion.div>
                        <div
                            className={`bg-gradient-to-r ${meta.gradient} bg-clip-text text-transparent font-black text-6xl md:text-8xl tracking-tight drop-shadow-2xl`}
                            style={{ WebkitTextStroke: '2px rgba(255,255,255,0.4)' }}
                        >
                            {meta.label}
                        </div>
                        <motion.div
                            className="mt-3 inline-block px-6 py-2 rounded-full bg-black/70 backdrop-blur text-white font-extrabold text-xl md:text-2xl shadow-2xl"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            最近 1 分鐘 · {event.count} 票！
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
