// 排名圖標元件 (前三名特殊顯示)
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Crown, Award, Trophy } from 'lucide-react';

interface RankingBadgeProps {
    index: number;
    showRankChange: 'up' | 'down' | null;
}

export const RankingBadge = memo(function RankingBadge({
    index,
    showRankChange
}: RankingBadgeProps) {
    return (
        <motion.div
            className="relative flex items-center justify-center w-10 h-10"
            animate={{ scale: showRankChange ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.3 }}
        >
            {index === 0 && (
                <motion.div
                    className="relative"
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0],
                        y: [0, -2, 0]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    {/* 光環效果 */}
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        animate={{
                            boxShadow: [
                                "0 0 0 0 rgba(251, 191, 36, 0)",
                                "0 0 0 4px rgba(251, 191, 36, 0.1)",
                                "0 0 0 0 rgba(251, 191, 36, 0)"
                            ],
                            scale: [0.8, 1.2, 0.8]
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* 發光效果 */}
                    <motion.div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-300/30 pointer-events-none"
                        animate={{
                            opacity: [0.2, 0.7, 0.2],
                            scale: [1, 1.5, 1]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{ filter: "blur(3px)" }}
                    />

                    <Crown className="w-7 h-7 text-amber-500 relative z-10" />

                    {/* 小閃光點 */}
                    <motion.div
                        className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-amber-200 rounded-full"
                        animate={{
                            opacity: [0.6, 1, 0.6],
                            scale: [0.8, 1.2, 0.8],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5
                        }}
                        style={{ filter: "blur(0.5px)" }}
                    />
                </motion.div>
            )}

            {index === 1 && (
                <motion.div
                    className="relative"
                    animate={{
                        y: [0, -2, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-300/20 pointer-events-none"
                        animate={{
                            opacity: [0.2, 0.5, 0.2],
                            scale: [0.8, 1.3, 0.8]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{ filter: "blur(2px)" }}
                    />

                    <Award className="w-5 h-5 text-gray-500 relative z-10" />

                    <motion.div
                        className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-gray-200 rounded-full pointer-events-none"
                        animate={{ opacity: [0.5, 0.9, 0.5] }}
                        transition={{
                            duration: 1.8,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{ filter: "blur(0.5px)" }}
                    />
                </motion.div>
            )}

            {index === 2 && (
                <motion.div
                    className="relative"
                    animate={{
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-orange-300/20 pointer-events-none"
                        animate={{
                            opacity: [0.1, 0.4, 0.1],
                            scale: [0.8, 1.2, 0.8]
                        }}
                        transition={{
                            duration: 2.2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{ filter: "blur(2px)" }}
                    />

                    <Trophy className="w-5 h-5 text-orange-500 relative z-10" />
                </motion.div>
            )}

            {index > 2 && (
                <motion.span
                    className="text-sm font-medium text-gray-600"
                    animate={{
                        scale: showRankChange ? [1, 1.2, 1] : 1,
                        y: showRankChange ? [-2, 0] : 0
                    }}
                    transition={{ duration: 0.3 }}
                >
                    {index + 1}
                </motion.span>
            )}

            {/* 排名變化指示器 */}
            {showRankChange && (
                <motion.div
                    initial={{ opacity: 0, x: showRankChange === 'up' ? -20 : 20, scale: 0.5 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 25
                    }}
                    className={`
            absolute -left-6 text-sm font-bold
            ${showRankChange === 'up'
                            ? 'text-green-500 bg-green-100/50 px-1.5 py-0.5 rounded-full'
                            : 'text-red-500 bg-red-100/50 px-1.5 py-0.5 rounded-full'}
          `}
                >
                    {showRankChange === 'up' ? '↑' : '↓'}
                </motion.div>
            )}
        </motion.div>
    );
});
