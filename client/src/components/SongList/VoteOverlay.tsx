// 點播成功全螢幕動畫覆蓋層（效能優化版）
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface VoteOverlayProps {
    show: boolean;
    songTitle: string;
    songArtist: string;
}

export function VoteOverlay({ show, songTitle, songArtist }: VoteOverlayProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
                >
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{
                            scale: [0.5, 1.2, 1],
                            opacity: [0, 1, 1, 0]
                        }}
                        transition={{
                            duration: 1.5,
                            times: [0, 0.3, 0.7, 1]
                        }}
                        className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 
                       text-white px-8 py-6 rounded-2xl shadow-2xl
                       flex flex-col items-center gap-3"
                    >
                        {/* 打勾圖標 - 只播放一次動畫 */}
                        <motion.div
                            initial={{ rotate: 0, scale: 1 }}
                            animate={{
                                rotate: [0, 10, -10, 0],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{ duration: 0.5 }}
                        >
                            <CheckCircle2 className="h-12 w-12 text-white drop-shadow-lg" />
                        </motion.div>

                        <motion.p
                            className="text-xl font-bold"
                            animate={{ y: [10, 0] }}
                        >
                            點播成功！
                        </motion.p>

                        <motion.div
                            className="text-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <p className="text-lg font-semibold">{songTitle}</p>
                            <p className="text-sm opacity-80">{songArtist}</p>
                        </motion.div>

                        {/* 靜態星星裝飾（移除無限循環） */}
                        <div className="flex gap-2 mt-1">
                            {[...Array(3)].map((_, i) => (
                                <Sparkles key={i} className="h-5 w-5 text-yellow-300" />
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
