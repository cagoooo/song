// 評分動畫元件 - 星星評分視覺效果
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface RatingAnimationProps {
    rating: 1 | 2 | 3 | 4 | 5;
    isVisible: boolean;
    onComplete?: () => void;
}

// 五星特殊慶祝效果
function FiveStarCelebration() {
    const starCount = 12;

    return (
        <>
            {/* 環繞星星 */}
            {[...Array(starCount)].map((_, i) => {
                const angle = (i / starCount) * 360;
                const distance = 100 + Math.random() * 50;
                const rad = (angle * Math.PI) / 180;
                return (
                    <motion.div
                        key={i}
                        className="absolute left-1/2 top-1/2 text-yellow-400"
                        initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            scale: [0, 1.5, 1, 0.5],
                            x: ['-50%', `calc(-50% + ${Math.cos(rad) * distance}px)`],
                            y: ['-50%', `calc(-50% + ${Math.sin(rad) * distance}px)`],
                        }}
                        transition={{
                            duration: 1.5,
                            delay: i * 0.05,
                            ease: [0.2, 0.8, 0.4, 1],
                        }}
                    >
                        <Star className="w-6 h-6 fill-current" />
                    </motion.div>
                );
            })}

            {/* 中心金色光環 */}
            <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, rgba(251,191,36,0.2) 50%, transparent 70%)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 3, 4], opacity: [0, 0.8, 0] }}
                transition={{ duration: 1.2 }}
            />

            {/* 煙火粒子 */}
            {[...Array(20)].map((_, i) => {
                const angle = Math.random() * 360;
                const distance = 60 + Math.random() * 80;
                const rad = (angle * Math.PI) / 180;
                const colors = ['bg-yellow-400', 'bg-amber-400', 'bg-orange-400', 'bg-red-400'];
                return (
                    <motion.div
                        key={`particle-${i}`}
                        className={`absolute left-1/2 top-1/2 w-2 h-2 rounded-full ${colors[i % colors.length]}`}
                        initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
                        animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1, 0.5],
                            x: ['-50%', `calc(-50% + ${Math.cos(rad) * distance}px)`],
                            y: ['-50%', `calc(-50% + ${Math.sin(rad) * distance}px)`],
                        }}
                        transition={{
                            duration: 1,
                            delay: 0.3 + i * 0.02,
                            ease: 'easeOut',
                        }}
                    />
                );
            })}
        </>
    );
}

// 普通評分效果（1-4 星）
function NormalRatingEffect({ rating }: { rating: number }) {
    return (
        <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 300 }}
        >
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, rotate: -180 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        rotate: 0,
                    }}
                    transition={{
                        delay: i * 0.1,
                        duration: 0.4,
                        type: 'spring',
                        stiffness: 400,
                    }}
                >
                    <Star
                        className={`w-8 h-8 sm:w-10 sm:h-10 ${i < rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                    />
                </motion.div>
            ))}
        </motion.div>
    );
}

export default function RatingAnimation({ rating, isVisible, onComplete }: RatingAnimationProps) {
    const [showAnimation, setShowAnimation] = useState(false);
    const isFiveStar = rating === 5;
    const duration = isFiveStar ? 2000 : 1500;

    useEffect(() => {
        if (isVisible) {
            setShowAnimation(true);
            const timer = setTimeout(() => {
                setShowAnimation(false);
                onComplete?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onComplete]);

    if (!showAnimation) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* 背景光暈 */}
                {isFiveStar && (
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-orange-500/10"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5 }}
                    />
                )}

                {/* 評分顯示 */}
                <NormalRatingEffect rating={rating} />

                {/* 五星慶祝特效 */}
                {isFiveStar && <FiveStarCelebration />}

                {/* 評分文字 */}
                <motion.div
                    className="absolute left-1/2 top-[60%] -translate-x-1/2 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <span className={`text-2xl sm:text-3xl font-bold ${isFiveStar
                            ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500'
                            : 'text-yellow-500'
                        }`}>
                        {isFiveStar ? '✨ 滿分好評！✨' : `${rating} 星評價`}
                    </span>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
