// 打賞動畫元件 - 多種視覺效果
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { TipType } from '@/lib/firestore';

interface TipAnimationProps {
    tipType: TipType;
    isVisible: boolean;
    onComplete?: () => void;
}

// 每種打賞類型的動畫配置
const TIP_CONFIGS: Record<TipType, {
    color: string;
    particleCount: number;
    duration: number;
    effect: 'float' | 'burst' | 'rain' | 'flame' | 'sparkle';
}> = {
    '❤️': {
        color: 'from-pink-400 via-rose-500 to-red-500',
        particleCount: 12,
        duration: 2.5,
        effect: 'float',
    },
    '🌟': {
        color: 'from-yellow-300 via-amber-400 to-orange-500',
        particleCount: 16,
        duration: 2,
        effect: 'burst',
    },
    '🎉': {
        color: 'from-purple-400 via-pink-500 to-indigo-500',
        particleCount: 24,
        duration: 3,
        effect: 'rain',
    },
    '🔥': {
        color: 'from-orange-400 via-red-500 to-yellow-500',
        particleCount: 14,
        duration: 2,
        effect: 'flame',
    },
    '💎': {
        color: 'from-cyan-300 via-blue-400 to-purple-500',
        particleCount: 10,
        duration: 2.5,
        effect: 'sparkle',
    },
};

// 彩色紙片顏色
const CONFETTI_COLORS = [
    'bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400',
    'bg-pink-400', 'bg-purple-400', 'bg-orange-400', 'bg-cyan-400',
];

// 生成隨機位置
const randomPosition = () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
});

// 漂浮效果（愛心）
function FloatEffect({ count, emoji, duration }: { count: number; emoji: string; duration: number }) {
    return (
        <>
            {[...Array(count)].map((_, i) => {
                const startX = 20 + Math.random() * 60;
                const drift = (Math.random() - 0.5) * 40;
                return (
                    <motion.div
                        key={i}
                        className="absolute text-2xl sm:text-3xl"
                        style={{ left: `${startX}%`, bottom: 0 }}
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            y: [0, -150, -300, -450],
                            x: [0, drift * 0.5, drift, drift * 0.8],
                            scale: [0.5, 1, 1.2, 0.8],
                            rotate: [0, 10, -10, 0],
                        }}
                        transition={{
                            duration: duration,
                            delay: i * 0.1,
                            ease: 'easeOut',
                        }}
                    >
                        {emoji}
                    </motion.div>
                );
            })}
        </>
    );
}

// 爆發效果（星星）
function BurstEffect({ count, emoji, duration }: { count: number; emoji: string; duration: number }) {
    return (
        <>
            {[...Array(count)].map((_, i) => {
                const angle = (i / count) * 360;
                const distance = 80 + Math.random() * 60;
                const rad = (angle * Math.PI) / 180;
                return (
                    <motion.div
                        key={i}
                        className="absolute text-xl sm:text-2xl left-1/2 top-1/2"
                        initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            scale: [0, 1.2, 1, 0.5],
                            x: ['-50%', `calc(-50% + ${Math.cos(rad) * distance}px)`],
                            y: ['-50%', `calc(-50% + ${Math.sin(rad) * distance}px)`],
                        }}
                        transition={{
                            duration: duration,
                            delay: i * 0.03,
                            ease: [0.2, 0.8, 0.4, 1],
                        }}
                    >
                        {emoji}
                    </motion.div>
                );
            })}
            {/* 中心閃光 */}
            <motion.div
                className="absolute left-1/2 top-1/2 w-20 h-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-radial from-yellow-200/60 via-amber-300/30 to-transparent"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 3, 4], opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.8 }}
            />
        </>
    );
}

// 雨點效果（彩帶）
function RainEffect({ count, duration }: { count: number; duration: number }) {
    return (
        <>
            {[...Array(count)].map((_, i) => {
                const startX = Math.random() * 100;
                const colorClass = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
                const size = 8 + Math.random() * 12;
                const rotation = Math.random() * 360;
                return (
                    <motion.div
                        key={i}
                        className={`absolute ${colorClass} rounded-sm`}
                        style={{
                            left: `${startX}%`,
                            width: size,
                            height: size * 0.6,
                            transformOrigin: 'center',
                        }}
                        initial={{ opacity: 0, y: -20, rotate: rotation }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            y: [-20, window.innerHeight * 0.8],
                            rotate: rotation + 360 * (Math.random() > 0.5 ? 1 : -1),
                            x: [0, (Math.random() - 0.5) * 100],
                        }}
                        transition={{
                            duration: duration,
                            delay: i * 0.05,
                            ease: 'linear',
                        }}
                    />
                );
            })}
        </>
    );
}

// 火焰效果
function FlameEffect({ count, emoji, duration }: { count: number; emoji: string; duration: number }) {
    return (
        <>
            {[...Array(count)].map((_, i) => {
                const startX = 30 + Math.random() * 40;
                return (
                    <motion.div
                        key={i}
                        className="absolute text-2xl sm:text-3xl"
                        style={{ left: `${startX}%`, bottom: '20%' }}
                        initial={{ opacity: 0, y: 0, scale: 0.3 }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            y: [0, -100, -200, -300],
                            scale: [0.3, 1.5, 1.2, 0.5],
                            x: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 60],
                        }}
                        transition={{
                            duration: duration,
                            delay: i * 0.08,
                            ease: [0.4, 0, 0.2, 1],
                        }}
                    >
                        {emoji}
                    </motion.div>
                );
            })}
            {/* 底部光暈 */}
            <motion.div
                className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-40 h-20 rounded-full bg-gradient-to-t from-orange-500/40 via-red-500/20 to-transparent blur-xl"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 2] }}
                transition={{ duration: duration * 0.8 }}
            />
        </>
    );
}

// 閃耀效果（鑽石）
function SparkleEffect({ count, emoji, duration }: { count: number; emoji: string; duration: number }) {
    return (
        <>
            {[...Array(count)].map((_, i) => {
                const pos = randomPosition();
                return (
                    <motion.div
                        key={i}
                        className="absolute text-xl sm:text-3xl"
                        style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                        initial={{ opacity: 0, scale: 0, rotate: 0 }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            scale: [0, 1.3, 1, 0],
                            rotate: [0, 180, 360],
                        }}
                        transition={{
                            duration: duration,
                            delay: i * 0.15,
                            ease: 'easeInOut',
                        }}
                    >
                        {emoji}
                    </motion.div>
                );
            })}
            {/* 彩虹光暈 */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-cyan-300/10 via-purple-400/10 to-pink-300/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: duration * 0.6 }}
            />
        </>
    );
}

export default function TipAnimation({ tipType, isVisible, onComplete }: TipAnimationProps) {
    const [showAnimation, setShowAnimation] = useState(false);
    const config = TIP_CONFIGS[tipType];

    useEffect(() => {
        if (isVisible) {
            setShowAnimation(true);
            const timer = setTimeout(() => {
                setShowAnimation(false);
                onComplete?.();
            }, config.duration * 1000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isVisible, config.duration, onComplete]);

    if (!showAnimation) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {config.effect === 'float' && (
                    <FloatEffect count={config.particleCount} emoji={tipType} duration={config.duration} />
                )}
                {config.effect === 'burst' && (
                    <BurstEffect count={config.particleCount} emoji={tipType} duration={config.duration} />
                )}
                {config.effect === 'rain' && (
                    <RainEffect count={config.particleCount} duration={config.duration} />
                )}
                {config.effect === 'flame' && (
                    <FlameEffect count={config.particleCount} emoji={tipType} duration={config.duration} />
                )}
                {config.effect === 'sparkle' && (
                    <SparkleEffect count={config.particleCount} emoji={tipType} duration={config.duration} />
                )}
            </motion.div>
        </AnimatePresence>
    );
}
