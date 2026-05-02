import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { TrendingUp } from 'lucide-react';
import type { DarkHorseEvent } from '@/hooks/useDarkHorse';

interface DarkHorseOverlayProps {
    event: DarkHorseEvent | null;
}

/**
 * 黑馬時刻全螢幕慶祝動畫。
 * 設計：上方旋轉的 emoji + "黑馬時刻" 標題，下方歌名與排名箭頭。
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
                colors: ['#fbbf24', '#a855f7', '#ec4899', '#10b981', '#3b82f6'],
                ticks: 120,
                scalar: 1.2,
                shapes: ['star', 'circle'],
                zIndex: 10001,
            });
        };
        fireSide(0.1, 60);
        fireSide(0.9, 120);
        // 0.4s 後再來一波
        setTimeout(() => {
            fireSide(0.2, 70);
            fireSide(0.8, 110);
        }, 400);
    }, [event]);

    return (
        <AnimatePresence>
            {event && (
                <motion.div
                    key={`${event.songId}_${event.triggeredAt}`}
                    className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* 背景柔光罩 */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-radial from-purple-900/40 via-amber-900/20 to-transparent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 0.7, 0.5] }}
                        transition={{ duration: 1 }}
                        style={{
                            background: 'radial-gradient(circle at center, rgba(168,85,247,0.4) 0%, rgba(245,158,11,0.2) 40%, transparent 70%)',
                        }}
                    />

                    <motion.div
                        className="relative text-center"
                        initial={{ scale: 0.5, y: 50 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -30 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                    >
                        {/* 上方旋轉跑馬 emoji */}
                        <motion.div
                            className="text-9xl md:text-[12rem] mb-2 inline-block"
                            animate={{
                                rotate: [0, -15, 15, -10, 0],
                                y: [0, -20, 0, -10, 0],
                            }}
                            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.6))' }}
                        >
                            🐴
                        </motion.div>

                        {/* 主標題 */}
                        <motion.div
                            className="bg-gradient-to-r from-yellow-300 via-amber-400 to-purple-400 bg-clip-text text-transparent font-black text-7xl md:text-8xl tracking-tight drop-shadow-2xl"
                            style={{ WebkitTextStroke: '2px rgba(255,255,255,0.4)' }}
                            animate={{
                                textShadow: [
                                    '0 0 30px rgba(251,191,36,0.6)',
                                    '0 0 60px rgba(168,85,247,0.7)',
                                    '0 0 30px rgba(251,191,36,0.6)',
                                ],
                            }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                        >
                            黑馬時刻
                        </motion.div>

                        {/* 排名跳升動畫 */}
                        <motion.div
                            className="mt-6 inline-flex items-center gap-4 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-amber-500 shadow-2xl"
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <span className="text-3xl md:text-4xl font-black text-white/70 line-through">
                                第 {event.fromRank} 名
                            </span>
                            <motion.div
                                animate={{ x: [0, 8, 0] }}
                                transition={{ duration: 0.6, repeat: Infinity }}
                            >
                                <TrendingUp className="w-12 h-12 text-yellow-300" strokeWidth={3} />
                            </motion.div>
                            <span className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">
                                第 {event.toRank} 名 🎉
                            </span>
                        </motion.div>

                        {/* 歌曲資訊 */}
                        <motion.div
                            className="mt-4 text-2xl md:text-3xl text-white font-extrabold drop-shadow-2xl"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                        >
                            {event.songTitle}
                            <span className="opacity-70 mx-2">·</span>
                            {event.songArtist}
                        </motion.div>
                        <motion.div
                            className="mt-2 text-lg text-amber-200 font-bold"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                        >
                            🚀 飆升 {event.fromRank - event.toRank} 名 · {event.voteCount} 票
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
