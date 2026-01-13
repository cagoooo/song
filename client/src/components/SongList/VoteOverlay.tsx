// 點播成功全螢幕動畫覆蓋層
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
                        <motion.div
                            animate={{
                                rotate: [0, 10, -10, 0],
                                scale: [1, 1.2, 1]
                            }}
                            transition={{
                                duration: 0.5,
                                repeat: 2
                            }}
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
                        <motion.div
                            className="flex gap-2 mt-1"
                            animate={{
                                scale: [1, 1.1, 1]
                            }}
                            transition={{
                                duration: 0.6,
                                repeat: Infinity
                            }}
                        >
                            {[...Array(3)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{
                                        y: [0, -5, 0],
                                        opacity: [0.5, 1, 0.5]
                                    }}
                                    transition={{
                                        duration: 0.4,
                                        delay: i * 0.1,
                                        repeat: Infinity
                                    }}
                                >
                                    <Sparkles className="h-5 w-5 text-yellow-300" />
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
