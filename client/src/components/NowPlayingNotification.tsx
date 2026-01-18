// 正在彈奏中通知元件 - 訪客即時收到通知並可跳轉查看歌曲資訊
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, FileText, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNowPlaying } from '@/hooks/useNowPlaying';

// 產生吉他譜搜尋 URL
const generateGuitarTabsUrl = (title: string, artist: string) => {
    const searchQuery = encodeURIComponent(`${title} ${artist} 吉他譜 tab`);
    return `https://www.google.com/search?q=${searchQuery}`;
};

// 產生歌詞搜尋 URL
const generateLyricsUrl = (title: string, artist: string) => {
    const searchQuery = encodeURIComponent(`${title} ${artist} 歌詞`);
    return `https://www.google.com/search?q=${searchQuery}`;
};

export function NowPlayingNotification() {
    const nowPlaying = useNowPlaying();
    const [isDismissed, setIsDismissed] = useState(false);
    const [lastSongId, setLastSongId] = useState<string | null>(null);

    // 當歌曲改變時，重新顯示通知
    useEffect(() => {
        if (nowPlaying?.songId && nowPlaying.songId !== lastSongId) {
            setIsDismissed(false);
            setLastSongId(nowPlaying.songId);
        }
    }, [nowPlaying?.songId, lastSongId]);

    // 關閉通知
    const handleDismiss = useCallback(() => {
        setIsDismissed(true);
    }, []);

    // 若無正在彈奏的歌曲或已關閉通知，則不顯示
    if (!nowPlaying?.song || isDismissed) {
        return null;
    }

    const { song } = nowPlaying;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 100, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50"
            >
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-2xl shadow-orange-500/30">
                    {/* 脈動動畫邊框 */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 opacity-75"
                        animate={{
                            opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />

                    <div className="relative bg-white/95 backdrop-blur-sm rounded-[14px] p-4">
                        {/* 關閉按鈕 */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="關閉通知"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* 標題區域 */}
                        <div className="flex items-center gap-2 mb-3">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                                className="flex-shrink-0"
                            >
                                <span className="text-2xl">🎸</span>
                            </motion.div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-rose-600">
                                        正在彈奏中
                                    </span>
                                    <motion.div
                                        className="w-2 h-2 rounded-full bg-red-500"
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 歌曲資訊 */}
                        <div className="mb-4">
                            <h3 className="font-bold text-lg text-slate-800 truncate">
                                {song.title}
                            </h3>
                            <p className="text-slate-500 text-sm truncate">
                                {song.artist}
                            </p>
                        </div>

                        {/* 快捷按鈕 */}
                        <div className="flex gap-2">
                            <Button
                                asChild
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-orange-500/25"
                            >
                                <a
                                    href={generateGuitarTabsUrl(song.title, song.artist)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5"
                                >
                                    <Music2 className="w-4 h-4" />
                                    <span>吉他譜</span>
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                            </Button>
                            <Button
                                asChild
                                size="sm"
                                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white border-0 shadow-lg shadow-rose-500/25"
                            >
                                <a
                                    href={generateLyricsUrl(song.title, song.artist)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>歌詞</span>
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
