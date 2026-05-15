import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { HYPE_META, type HypeEvent } from '@/hooks/useGlobalHype';

interface GlobalHypeOverlayProps {
    event: HypeEvent | null;
}

// 散落星星位置（vw / vh 百分比）
const STAR_POSITIONS = [
    { top: '12%', left: '8%', size: 'small' as const, delay: 0 },
    { top: '18%', right: '12%', size: '' as const, delay: 0.15 },
    { top: '32%', left: '18%', size: 'tiny' as const, delay: 0.3 },
    { top: '46%', right: '8%', size: 'small' as const, delay: 0.05 },
    { top: '58%', left: '12%', size: '' as const, delay: 0.4 },
    { top: '68%', right: '18%', size: 'tiny' as const, delay: 0.2 },
    { top: '76%', left: '24%', size: 'small' as const, delay: 0.55 },
    { top: '82%', right: '28%', size: '' as const, delay: 0.35 },
];

/**
 * 全站熱度 banner — Editorial 雜誌風
 * 半透明黑底 + 散落星星 + 義式藍大字「{count}」 + 襯線「票」
 */
export function GlobalHypeOverlay({ event }: GlobalHypeOverlayProps) {
    const lastKey = useRef('');
    const meta = event ? HYPE_META[event.level] : null;

    useEffect(() => {
        if (!event || !meta) return;
        const key = `${event.triggeredAt}`;
        if (lastKey.current === key) return;
        lastKey.current = key;
        const positions = [0.1, 0.3, 0.5, 0.7, 0.9];
        positions.forEach((x, i) => {
            setTimeout(() => {
                confetti({
                    particleCount: event.level * 30,
                    spread: 60,
                    origin: { x, y: 0.3 },
                    colors: ['#2b4dff', '#ffffff', '#0ea5e9'],
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
                    style={{ background: 'rgba(8, 8, 12, 0.78)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* 散落星星 */}
                    {STAR_POSITIONS.map((s, i) => (
                        <motion.span
                            key={i}
                            aria-hidden="true"
                            className={`editorial-overlay-star ${s.size}`}
                            style={{
                                top: s.top,
                                left: 'left' in s ? s.left : undefined,
                                right: 'right' in s ? s.right : undefined,
                                animationDelay: `${s.delay}s`,
                            }}
                            initial={{ opacity: 0, scale: 0.4 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: s.delay, duration: 0.4 }}
                        >
                            ★
                        </motion.span>
                    ))}

                    {/* 中央內容 */}
                    <motion.div
                        className="text-center px-6 relative z-10"
                        initial={{ scale: 0.6, y: -30 }}
                        animate={{ scale: [0.6, 1.08, 1], y: 0 }}
                        exit={{ scale: 1.2, opacity: 0, y: -50 }}
                        transition={{ duration: 0.7, type: 'spring', stiffness: 220 }}
                    >
                        {/* 眉標 */}
                        <div
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 14,
                                letterSpacing: '0.32em',
                                textTransform: 'uppercase',
                                color: 'rgba(255, 255, 255, 0.7)',
                                marginBottom: 14,
                            }}
                        >
                            {meta.label}
                        </div>

                        {/* 大字 {count} 票 — 義式藍 + 白襯線「票」 */}
                        <div className="flex items-baseline justify-center gap-3 leading-none">
                            <span
                                style={{
                                    fontFamily: 'var(--font-display)',
                                    fontStyle: 'italic',
                                    fontWeight: 900,
                                    fontSize: 'clamp(110px, 16vw, 240px)',
                                    color: 'var(--ed-accent)',
                                    letterSpacing: '-0.04em',
                                    fontVariantNumeric: 'tabular-nums',
                                }}
                            >
                                {event.count}
                            </span>
                            <span
                                style={{
                                    fontFamily: 'var(--font-display)',
                                    fontWeight: 900,
                                    fontSize: 'clamp(56px, 8vw, 120px)',
                                    color: '#ffffff',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                票
                            </span>
                        </div>

                        {/* 副標 */}
                        <motion.div
                            className="mt-6 text-white/85"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 500,
                                fontSize: 'clamp(16px, 2vw, 22px)',
                                letterSpacing: '-0.005em',
                            }}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.25 }}
                        >
                            一分鐘湧進 · 點下去就是催歌
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
