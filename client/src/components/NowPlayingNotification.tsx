// 正在彈奏中通知元件 - 訪客即時收到通知並可跳轉查看歌曲資訊
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, FileText, X, ExternalLink, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNowPlaying } from '@/hooks/useNowPlaying';
import { useInteractions } from '@/hooks/useInteractions';
import { useUser } from '@/hooks/use-user';
import type { TipType } from '@/lib/firestore';

// 打賞類型列表
const TIP_TYPES: { type: TipType; label: string }[] = [
    { type: '❤️', label: '愛心' },
    { type: '🌟', label: '星星' },
    { type: '🎉', label: '彩帶' },
    { type: '🔥', label: '火焰' },
    { type: '💎', label: '鑽石' },
];

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

// 星星評分元件
function StarRating({
    value,
    onChange,
    disabled,
    showSuccess,
}: {
    value: number;
    onChange: (rating: 1 | 2 | 3 | 4 | 5) => void;
    disabled: boolean;
    showSuccess?: boolean;
}) {
    const [hoverValue, setHoverValue] = useState(0);

    return (
        <div className="relative flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                    key={star}
                    type="button"
                    disabled={disabled}
                    className="p-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    onMouseEnter={() => setHoverValue(star)}
                    onMouseLeave={() => setHoverValue(0)}
                    onClick={() => onChange(star as 1 | 2 | 3 | 4 | 5)}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Star
                        className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${star <= (hoverValue || value)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-slate-300'
                            }`}
                    />
                </motion.button>
            ))}
            {showSuccess && (
                <motion.span
                    className="absolute -top-1 -right-2 text-xs text-green-500 font-medium"
                    initial={{ opacity: 0, y: 5, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                >
                    ✓
                </motion.span>
            )}
        </div>
    );
}

export function NowPlayingNotification() {
    const nowPlaying = useNowPlaying();
    const { user } = useUser();
    const [isDismissed, setIsDismissed] = useState(false);
    const [lastSongId, setLastSongId] = useState<string | null>(null);
    const [showTipSent, setShowTipSent] = useState<TipType | null>(null);
    const [showRatingSent, setShowRatingSent] = useState(false);

    const songId = nowPlaying?.songId || null;
    const isAdmin = !!user?.isAdmin;

    const {
        ratingStats,
        isSending,
        userRating,
        handleSendTip,
        handleSendRating,
    } = useInteractions({ songId, enabled: !!songId });

    // 當歌曲改變時，重新顯示通知
    useEffect(() => {
        if (nowPlaying?.songId && nowPlaying.songId !== lastSongId) {
            setIsDismissed(false);
            setLastSongId(nowPlaying.songId);
            setShowTipSent(null);
        }
    }, [nowPlaying?.songId, lastSongId]);

    // 關閉通知
    const handleDismiss = useCallback(() => {
        setIsDismissed(true);
    }, []);

    // 發送打賞
    const onTip = useCallback(async (tipType: TipType) => {
        await handleSendTip(tipType);
        setShowTipSent(tipType);
        setTimeout(() => setShowTipSent(null), 1500);
    }, [handleSendTip]);

    // 獲送評分
    const onRating = useCallback(async (rating: 1 | 2 | 3 | 4 | 5) => {
        await handleSendRating(rating);
        setShowRatingSent(true);
        setTimeout(() => setShowRatingSent(false), 2000);
    }, [handleSendRating]);

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
                className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[420px] z-50"
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

                    <div className="relative bg-white/95 backdrop-blur-sm rounded-[14px] p-3 sm:p-4">
                        {/* 關閉按鈕 */}
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="關閉通知"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* 標題區域 */}
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                            <motion.div
                                animate={{ rotate: [0, 10, -10, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                                className="flex-shrink-0"
                            >
                                <span className="text-xl sm:text-2xl">🎸</span>
                            </motion.div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm sm:text-base text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-rose-600">
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
                        <div className="mb-2 sm:mb-3">
                            <h3 className="font-bold text-base sm:text-lg text-slate-800 truncate">
                                {song.title}
                            </h3>
                            <p className="text-slate-500 text-sm truncate">
                                {song.artist}
                            </p>
                        </div>

                        {/* 快捷按鈕 */}
                        <div className="flex gap-2 mb-2 sm:mb-3">
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

                        {/* 互動區域：打賞 + 評分 */}
                        <div className="relative py-2 sm:py-3 border-t border-slate-200">
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 bg-white text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">
                                為彈奏者鼓掌
                            </div>

                            {/* 打賞按鈕 + 評分 - 同一行 */}
                            <div className="flex items-center justify-between gap-2">
                                {/* 打賞按鈕 */}
                                <div className="flex gap-0.5 sm:gap-1 shrink-0">
                                    {TIP_TYPES.map(({ type, label }) => (
                                        <motion.button
                                            key={type}
                                            type="button"
                                            disabled={isSending}
                                            onClick={() => onTip(type)}
                                            className="relative p-1 sm:p-1.5 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            title={label}
                                        >
                                            <span className="text-lg sm:text-xl">{type}</span>
                                            {showTipSent === type && (
                                                <motion.span
                                                    className="absolute -top-0.5 -right-0.5 text-[10px] text-green-500"
                                                    initial={{ opacity: 0, y: 3 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                >
                                                    ✓
                                                </motion.span>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>

                                {/* 評分區域 - 管理員和訪客顯示不同 */}
                                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                                    {isAdmin ? (
                                        /* 管理員：顯示平均星等 */
                                        <>
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        className={`w-4 h-4 ${star <= Math.round(ratingStats.average)
                                                            ? 'text-yellow-400 fill-yellow-400'
                                                            : 'text-slate-300'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-xs text-slate-500 whitespace-nowrap">
                                                {ratingStats.count > 0 ? (
                                                    <>
                                                        <span className="font-bold text-amber-600">
                                                            {ratingStats.average.toFixed(1)}
                                                        </span>
                                                        <span className="ml-0.5">({ratingStats.count})</span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-400">尚無</span>
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        /* 訪客：顯示評分功能 */
                                        <>
                                            <StarRating
                                                value={userRating || 0}
                                                onChange={onRating}
                                                disabled={isSending}
                                                showSuccess={showRatingSent}
                                            />
                                            {ratingStats.count > 0 && (
                                                <span className="text-xs text-amber-600 font-medium whitespace-nowrap">
                                                    {ratingStats.average.toFixed(1)}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

