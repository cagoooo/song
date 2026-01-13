// 排行榜頂部標題裝飾區
import { motion } from 'framer-motion';
import {
    Trophy, Flame, Music2, Music, Mic, Headphones,
    Sparkles, Heart
} from 'lucide-react';

interface RankingHeaderProps {
    reduceMotion: boolean;
}

export function RankingHeader({ reduceMotion }: RankingHeaderProps) {
    return (
        <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.5 }}
            className="mb-4 relative overflow-hidden rounded-xl p-3 sm:p-4 
                 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 
                 border-2 border-amber-300/70 shadow-md"
        >
            {/* 背景光效 */}
            <motion.div
                className="absolute inset-0 z-0 bg-gradient-to-br from-yellow-400/10 via-amber-300/5 to-orange-200/10"
                animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                    scale: [1, 1.05, 1],
                }}
                transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                }}
                style={{
                    backgroundSize: "200% 200%",
                    filter: "blur(6px)",
                    borderRadius: "inherit",
                    transformOrigin: "center",
                }}
            />

            {/* 標題部分 */}
            <div className="text-center relative z-10 flex flex-col items-center">
                {/* 上部的裝飾性圖標 */}
                <div className="flex items-center gap-4 mb-1">
                    <motion.div
                        animate={{
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 1],
                            y: [0, -2, 0],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            times: [0, 0.25, 0.75, 1]
                        }}
                        className="relative"
                    >
                        <Music2 className="h-5 w-5 text-amber-500" />
                        <motion.div
                            className="absolute inset-0 bg-amber-400 rounded-full opacity-30"
                            animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 0, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            style={{ filter: "blur(4px)" }}
                        />
                    </motion.div>

                    <motion.div
                        animate={{
                            rotate: [0, -5, 5, 0],
                            scale: [1, 1.05, 1],
                            y: [0, -1, 0],
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.3,
                            times: [0, 0.35, 0.65, 1]
                        }}
                        className="relative"
                    >
                        <Trophy className="h-6 w-6 text-yellow-500" />
                        <motion.div
                            className="absolute inset-0 bg-yellow-400 rounded-full opacity-30"
                            animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 0, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                            style={{ filter: "blur(4px)" }}
                        />
                    </motion.div>

                    <motion.div
                        animate={{
                            rotate: [0, 5, -5, 0],
                            scale: [1, 1.08, 1],
                            y: [0, -2, 0],
                        }}
                        transition={{
                            duration: 3.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5,
                            times: [0, 0.4, 0.7, 1]
                        }}
                        className="relative"
                    >
                        <Flame className="h-5 w-5 text-orange-500" />
                        <motion.div
                            className="absolute inset-0 bg-orange-400 rounded-full opacity-30"
                            animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 0, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                            style={{ filter: "blur(4px)" }}
                        />
                    </motion.div>
                </div>

                {/* 主標題 */}
                <motion.div
                    className="relative z-10 mt-1 mb-1"
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <motion.h2
                        className="inline-block font-bold text-lg sm:text-xl text-transparent bg-clip-text 
                       bg-gradient-to-r from-amber-800 via-yellow-600 to-amber-700 px-1"
                        animate={{
                            backgroundPosition: ['0% center', '100% center', '0% center'],
                            scale: [1, 1.02, 1],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "linear",
                            times: [0, 0.5, 1]
                        }}
                        style={{ backgroundSize: '200% auto' }}
                    >
                        🔥 熱門歌曲排行榜 🔥
                    </motion.h2>

                    {/* 下劃線裝飾 */}
                    <motion.div
                        className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full 
                       bg-gradient-to-r from-transparent via-amber-500 to-transparent"
                        animate={{
                            scaleX: [0.3, 1, 0.3],
                            opacity: [0.3, 0.8, 0.3],
                            x: [-5, 5, -5]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut",
                            times: [0, 0.5, 1]
                        }}
                    />
                </motion.div>

                {/* 副標題 */}
                <motion.p
                    className="text-xs sm:text-sm text-amber-800/80 mt-1 mb-0.5 italic font-medium"
                    animate={{ opacity: [0.7, 0.9, 0.7] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                    最受歡迎的點播歌曲實時排名
                </motion.p>
            </div>

            {/* 裝飾性音符泡泡 */}
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute pointer-events-none"
                    initial={{
                        x: `${10 + (i * 15)}%`,
                        y: "100%",
                        scale: 0.3 + (i % 3 * 0.1),
                        opacity: 0
                    }}
                    animate={{
                        y: ["100%", "10%", "-20%"],
                        opacity: [0, i % 2 === 0 ? 0.4 : 0.3, 0],
                        rotate: [0, 10 * (i % 2 ? 1 : -1), 0],
                        x: [`${10 + (i * 15)}%`, `${8 + (i * 15) + (i % 3 - 1) * 5}%`, `${10 + (i * 15) + (i % 2 ? 3 : -3)}%`]
                    }}
                    transition={{
                        duration: 3 + (i % 3),
                        repeat: Infinity,
                        delay: i * 0.5,
                        ease: "easeInOut"
                    }}
                >
                    {i % 6 === 0 ? <Music className="text-amber-400/60" size={13} /> :
                        i % 6 === 1 ? <Mic className="text-orange-400/60" size={12} /> :
                            i % 6 === 2 ? <Music2 className="text-yellow-500/60" size={14} /> :
                                i % 6 === 3 ? <Headphones className="text-amber-500/60" size={12} /> :
                                    i % 6 === 4 ? <Sparkles className="text-yellow-600/60" size={11} /> :
                                        <Heart className="text-orange-500/60" size={11} />}
                </motion.div>
            ))}

            {/* 裝飾性光芒 */}
            <motion.div
                className="absolute top-1/2 left-0 w-24 h-24 -translate-y-1/2 pointer-events-none"
                animate={{ opacity: [0.1, 0.3, 0.1], rotate: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    background: "radial-gradient(circle, rgba(251, 191, 36, 0.2), transparent 70%)",
                    filter: "blur(12px)",
                    borderRadius: "50%"
                }}
            />

            <motion.div
                className="absolute top-1/2 right-0 w-24 h-24 -translate-y-1/2 pointer-events-none"
                animate={{ opacity: [0.1, 0.25, 0.1], rotate: [0, -20, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                style={{
                    background: "radial-gradient(circle, rgba(251, 191, 36, 0.2), transparent 70%)",
                    filter: "blur(12px)",
                    borderRadius: "50%"
                }}
            />
        </motion.div>
    );
}
