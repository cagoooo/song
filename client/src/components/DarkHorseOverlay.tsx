import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { DarkHorseEvent } from '@/hooks/useDarkHorse';

interface DarkHorseOverlayProps {
    event: DarkHorseEvent | null;
}

/**
 * 黑馬時刻全螢幕慶祝 — Editorial 雜誌風
 * 黑底 + BREAKING badge + 大義式藍襯線歌名 + ★ DARK HORSE ★ 上下跑馬燈
 */
export function DarkHorseOverlay({ event }: DarkHorseOverlayProps) {
    const lastTriggerKey = useRef<string>('');

    useEffect(() => {
        if (!event) return;
        const key = `${event.songId}_${event.triggeredAt}`;
        if (lastTriggerKey.current === key) return;
        lastTriggerKey.current = key;

        // 兩波 confetti — 左右兩側對噴
        const fireSide = (originX: number, angle: number) => {
            confetti({
                particleCount: 80,
                angle,
                spread: 60,
                origin: { x: originX, y: 0.7 },
                colors: ['#2b4dff', '#ffffff', '#0ea5e9', '#1d4ed8'],
                ticks: 120,
                scalar: 1.2,
                shapes: ['star', 'circle'],
                zIndex: 10001,
            });
        };
        fireSide(0.1, 60);
        fireSide(0.9, 120);
        setTimeout(() => {
            fireSide(0.2, 70);
            fireSide(0.8, 110);
        }, 400);
    }, [event]);

    const marqueeItems = Array.from({ length: 8 }, (_, i) => i);

    return (
        <AnimatePresence>
            {event && (
                <motion.div
                    key={`${event.songId}_${event.triggeredAt}`}
                    className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
                    style={{ background: '#000' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* 上 ★ DARK HORSE ★ 跑馬燈 */}
                    <div className="editorial-overlay-marquee top" aria-hidden="true">
                        <div className="track">
                            {marqueeItems.map((i) => (
                                <span key={`t-${i}`}>★ DARK HORSE</span>
                            ))}
                        </div>
                    </div>

                    {/* 下 ★ DARK HORSE ★ 跑馬燈 */}
                    <div className="editorial-overlay-marquee bottom" aria-hidden="true">
                        <div className="track">
                            {marqueeItems.map((i) => (
                                <span key={`b-${i}`}>★ DARK HORSE</span>
                            ))}
                        </div>
                    </div>

                    <motion.div
                        className="relative text-center px-6"
                        initial={{ scale: 0.92, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: -20 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                    >
                        {/* BREAKING badge */}
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                        >
                            <span className="editorial-breaking-badge">
                                BREAKING · 黑馬時刻
                            </span>
                        </motion.div>

                        {/* 主標題 — 義式襯線藍 */}
                        <motion.h2
                            className="mt-12 mb-4"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 900,
                                fontSize: 'clamp(56px, 9vw, 140px)',
                                letterSpacing: '-0.035em',
                                lineHeight: 0.95,
                                color: 'var(--ed-accent)',
                            }}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            {event.songTitle}
                        </motion.h2>

                        {/* 藝人 */}
                        <motion.div
                            className="text-white/80"
                            style={{
                                fontFamily: 'var(--font-body)',
                                fontWeight: 400,
                                fontSize: 'clamp(20px, 2.4vw, 32px)',
                                letterSpacing: '0.02em',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                        >
                            {event.songArtist}
                        </motion.div>

                        {/* 義式引語 */}
                        <motion.p
                            className="mt-12 mx-auto text-white/70"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 500,
                                fontSize: 'clamp(15px, 1.6vw, 20px)',
                                lineHeight: 1.5,
                                maxWidth: 620,
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.55 }}
                        >
                            這首歌十分鐘前還排在第 {event.fromRank} 名。<br />
                            現在它衝上來了——觀眾的耳朵會給答案。
                        </motion.p>

                        {/* +N 票 · 暴衝 */}
                        <motion.div
                            className="mt-10"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 14,
                                letterSpacing: '0.22em',
                                textTransform: 'uppercase',
                                color: 'var(--ed-accent)',
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                        >
                            +{event.fromRank - event.toRank} 名 · {event.voteCount} 票 · 暴衝
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
