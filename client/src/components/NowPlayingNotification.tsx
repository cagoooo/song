// 正在彈奏中通知元件 - 訪客即時收到通知並可跳轉查看歌曲資訊
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, FileText, X, ExternalLink, Star, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNowPlaying } from '@/hooks/useNowPlaying';
import { useInteractions } from '@/hooks/useInteractions';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { markSongAsPlayed, clearNowPlaying } from '@/lib/firestore';
import { getErrorToast } from '@/lib/error-handler';
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

// 產生 Chordify 搜尋 URL
const generateChordifyUrl = (title: string, artist: string) => {
    const searchQuery = encodeURIComponent(`${title} ${artist}`);
    return `https://chordify.net/search/${searchQuery}`;
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
        <div className="relative flex gap-px">
            {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                    key={star}
                    type="button"
                    disabled={disabled}
                    className="p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    onMouseEnter={() => setHoverValue(star)}
                    onMouseLeave={() => setHoverValue(0)}
                    onClick={() => onChange(star as 1 | 2 | 3 | 4 | 5)}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <Star
                        className={`w-4 h-4 transition-colors ${star <= (hoverValue || value)
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

interface NowPlayingNotificationProps {
    /** 管理員專用：按「吉他譜」時同時打開轉調工具（訪客不傳，故無此行為） */
    onOpenTransposeTool?: () => void;
}

export function NowPlayingNotification({ onOpenTransposeTool }: NowPlayingNotificationProps = {}) {
    const nowPlaying = useNowPlaying();
    const { user } = useUser();
    const { toast } = useToast();
    const [isDismissed, setIsDismissed] = useState(false);
    const [markingPlayed, setMarkingPlayed] = useState(false);
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

    // 管理員一鍵「標記已彈奏」：清除正在彈奏 + 標記已彈奏 + 自動關閉彈窗
    // 省去管理員回排行榜茫茫歌海中找這首歌切換的麻煩
    const handleMarkPlayed = useCallback(async () => {
        if (!user?.id || !songId || markingPlayed) return;
        setMarkingPlayed(true);
        try {
            await clearNowPlaying();
            await markSongAsPlayed(songId, user.id);
            toast({ title: '✓ 已彈奏', description: `「${nowPlaying?.song?.title ?? ''}」` });
            setIsDismissed(true);
        } catch (error) {
            toast(getErrorToast(error));
        } finally {
            setMarkingPlayed(false);
        }
    }, [user?.id, songId, markingPlayed, nowPlaying?.song?.title, toast]);

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

    const notification = (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                data-now-playing-notification="true"
                className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:w-[440px] z-50"
            >
                <div className="now-playing-card relative overflow-hidden rounded-[10px] border-2 border-[#111] bg-[#faf6ee] shadow-[0_18px_42px_-24px_rgba(17,17,17,0.6)]">
                    <div className="now-playing-card-head flex items-center justify-between gap-3 bg-[#111] px-4 py-2 text-white">
                        <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em]">
                            <span className="h-2 w-2 rounded-full bg-[#2f55ff]" />
                            <span className="truncate">Now Playing · Side A</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {/* 管理員一鍵標記已彈奏（精簡膠囊，放標題列右上不佔垂直版面） */}
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={handleMarkPlayed}
                                    disabled={markingPlayed}
                                    className="now-playing-card-played flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    aria-label="標記為已彈奏並關閉"
                                >
                                    <Check className="h-3 w-3" />
                                    <span>{markingPlayed ? '標記中' : '已彈奏'}</span>
                                </button>
                            )}
                            <button
                                onClick={handleDismiss}
                                className="now-playing-card-close grid h-7 w-7 place-items-center rounded-full border border-white/25 text-white/70 transition-colors hover:bg-white hover:text-[#111]"
                                aria-label="關閉通知"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="now-playing-card-body relative px-4 py-3 sm:px-5 sm:py-4">
                        <div className="pointer-events-none absolute inset-x-4 top-0 border-t border-dashed border-[#111]/20" />

                        <div className="now-playing-card-song mb-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                            <div className="now-playing-card-vinyl relative h-11 w-11 rounded-full border-2 border-[#111] bg-[#111] shadow-inner">
                                <span className="absolute inset-3 rounded-full border border-[#faf6ee]/60" />
                                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#faf6ee]" />
                            </div>
                            <div className="min-w-0">
                                <div className="now-playing-card-status mb-1 flex items-center gap-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#2f55ff]">Live take</span>
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#ff3b30]" />
                                    <span className="text-xs font-medium text-[#6f6a60]">正在彈奏中</span>
                                </div>
                                <h3 className="truncate font-serif text-xl font-black italic leading-tight text-[#111] sm:text-2xl">
                                    {song.title}
                                </h3>
                                <p className="truncate text-sm font-medium text-[#6f6a60]">
                                    {song.artist}
                                </p>
                            </div>
                        </div>

                        {/* 快捷按鈕 */}
                        <div className="now-playing-card-actions mb-3 grid grid-cols-3 gap-2">
                            <Button
                                asChild
                                size="sm"
                                className="now-playing-card-action h-10 rounded-md border-2 border-[#111] bg-[#2f55ff] text-white shadow-none transition-transform hover:-translate-y-0.5 hover:bg-[#2446d8]"
                            >
                                <a
                                    href={generateGuitarTabsUrl(song.title, song.artist)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5"
                                    onClick={() => onOpenTransposeTool?.()}
                                >
                                    <Music2 className="w-4 h-4" />
                                    <span>吉他譜</span>
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                            </Button>
                            <Button
                                asChild
                                size="sm"
                                className="now-playing-card-action h-10 rounded-md border-2 border-[#111] bg-white text-[#111] shadow-none transition-transform hover:-translate-y-0.5 hover:bg-[#fff3d0]"
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
                            <Button
                                asChild
                                size="sm"
                                className="now-playing-card-action h-10 rounded-md border-2 border-[#111] bg-white text-[#111] shadow-none transition-transform hover:-translate-y-0.5 hover:bg-[#fff3d0]"
                            >
                                <a
                                    href={generateChordifyUrl(song.title, song.artist)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5"
                                >
                                    <Search className="w-4 h-4 text-[#ff5c00]" />
                                    <span>Chordify</span>
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                            </Button>
                        </div>

                        {/* 互動區域：打賞 + 評分 */}
                        <div className="now-playing-card-signal rounded-md border border-[#111]/15 bg-white/70 p-2.5">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#6f6a60]">
                                    Audience signal
                                </span>
                                <span className="h-px flex-1 bg-[#111]/10" />
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                {/* 打賞按鈕 */}
                                <div className="flex shrink-0 gap-1">
                                    {TIP_TYPES.map(({ type, label }) => (
                                        <motion.button
                                            key={type}
                                            type="button"
                                            disabled={isSending}
                                            onClick={() => onTip(type)}
                                            className="relative grid h-8 w-8 place-items-center rounded-full border border-[#111]/15 bg-[#faf6ee] text-sm transition-colors hover:border-[#2f55ff] hover:bg-white disabled:opacity-50"
                                            whileHover={{ scale: 1.04 }}
                                            whileTap={{ scale: 0.96 }}
                                            title={label}
                                        >
                                            <span>{type}</span>
                                            {showTipSent === type && (
                                                <motion.span
                                                    className="absolute -right-0.5 -top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#2f55ff] text-[9px] text-white"
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
                                <div className="flex shrink-0 items-center gap-1">
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

    return createPortal(notification, document.body);
}
