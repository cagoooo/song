// 歌曲建議通知覆蓋層 - 全螢幕中央顯示，管理員專用
import { motion, AnimatePresence } from 'framer-motion';
import { Music, X, Lightbulb, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuggestionNotificationProps {
    isVisible: boolean;
    suggestion: {
        title: string;
        artist: string;
        suggestedBy?: string;
        notes?: string;
    } | null;
    onClose: () => void;
}

export function SuggestionNotificationOverlay({
    isVisible,
    suggestion,
    onClose,
}: SuggestionNotificationProps) {
    if (!suggestion) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    {/* 通知卡片 */}
                    <motion.div
                        initial={{ scale: 0.8, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.8, y: 20, opacity: 0 }}
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 25,
                        }}
                        className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-2xl shadow-2xl border-2 border-amber-200 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 頂部裝飾條 */}
                        <div className="h-2 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

                        {/* 關閉按鈕 */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* 內容區 */}
                        <div className="p-5 sm:p-6">
                            {/* 標題區 */}
                            <div className="flex items-center gap-3 mb-4">
                                <motion.div
                                    initial={{ rotate: -20, scale: 0 }}
                                    animate={{ rotate: 0, scale: 1 }}
                                    transition={{ delay: 0.1, type: 'spring' }}
                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
                                >
                                    <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </motion.div>
                                <div>
                                    <motion.h2
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.15 }}
                                        className="text-lg sm:text-xl font-bold text-amber-700"
                                    >
                                        🎵 新歌曲建議！
                                    </motion.h2>
                                    <motion.p
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="text-sm text-amber-600/80"
                                    >
                                        訪客推薦了一首歌曲
                                    </motion.p>
                                </div>
                            </div>

                            {/* 歌曲資訊卡 */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.25 }}
                                className="bg-white/80 rounded-xl p-4 border border-amber-100 shadow-sm"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0">
                                        <Music className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                                            {suggestion.title}
                                        </h3>
                                        <p className="text-base sm:text-lg text-slate-600 truncate">
                                            {suggestion.artist}
                                        </p>

                                        {/* 推薦者 */}
                                        {suggestion.suggestedBy && (
                                            <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-500">
                                                <User className="w-3.5 h-3.5" />
                                                <span>推薦者：{suggestion.suggestedBy}</span>
                                            </div>
                                        )}

                                        {/* 備註 */}
                                        {suggestion.notes && (
                                            <p className="mt-2 text-sm text-slate-500 line-clamp-2">
                                                💬 {suggestion.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>

                            {/* 操作按鈕 */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.35 }}
                                className="mt-4 flex justify-center"
                            >
                                <Button
                                    onClick={onClose}
                                    className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-lg shadow-md"
                                >
                                    我知道了
                                </Button>
                            </motion.div>
                        </div>

                        {/* 背景裝飾 */}
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-200/30 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute -top-10 -left-10 w-24 h-24 bg-orange-200/30 rounded-full blur-2xl pointer-events-none" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
