// 重構後的排行榜主元件（含彈奏標記功能）
import { useState, useRef, memo, useCallback, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    FileText, Music2, ChevronUp, Check, RotateCcw, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Song } from '@/lib/firestore';
import { markSongAsPlayed, unmarkSongAsPlayed, resetAllPlayedSongs } from '@/lib/firestore';
import type { AppUser } from '@/lib/auth';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useToast } from '@/hooks/use-toast';

// 拆分的子元件
import { RankingHeader } from './RankingHeader';
import { RankingBadge } from './RankingBadge';
import { useRankingData } from './useRankingData';

interface RankingBoardProps {
    songs: Song[];
    user?: AppUser | null;
}

// 使用 memo 避免不必要的重渲染
export default memo(function RankingBoard({ songs: propSongs, user }: RankingBoardProps) {
    // 使用全局 Hook 檢測是否應減少動畫
    const reduceMotion = useReduceMotion();
    const { toast } = useToast();

    const [isExpanded, setIsExpanded] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const isLoading = propSongs.length === 0;
    const displayLimit = isExpanded ? 30 : 10;
    const containerRef = useRef<HTMLOListElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Intersection Observer 自動展開
    useEffect(() => {
        if (isExpanded || isLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setIsExpanded(true);
                }
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [isExpanded, isLoading]);

    // 使用拆分的 Hook
    const {
        sortedSongs,
        showRankChange,
        showFirework,
        generateGuitarTabsUrl,
        generateLyricsUrl,
    } = useRankingData({
        songs: propSongs,
        displayLimit,
        reduceMotion,
        containerRef,
    });

    // 處理彈奏標記切換
    const handleTogglePlayed = useCallback(async (song: Song) => {
        if (!user?.id) return;

        try {
            if (song.isPlayed) {
                await unmarkSongAsPlayed(song.id);
                toast({ title: '已取消標記', description: `「${song.title}」` });
            } else {
                await markSongAsPlayed(song.id, user.id);
                toast({ title: '✓ 已彈奏', description: `「${song.title}」` });
            }
        } catch (error) {
            toast({ title: '操作失敗', description: '請稍後再試', variant: 'destructive' });
        }
    }, [user?.id, toast]);

    // 重置所有彈奏狀態
    const handleResetAllPlayed = useCallback(async () => {
        if (!user?.isAdmin) return;

        setIsResetting(true);
        try {
            await resetAllPlayedSongs();
            toast({ title: '已重置', description: '所有彈奏狀態已清除' });
        } catch (error) {
            toast({ title: '重置失敗', description: '請稍後再試', variant: 'destructive' });
        } finally {
            setIsResetting(false);
        }
    }, [user?.isAdmin, toast]);

    // 載入中顯示骨架
    if (isLoading && propSongs.length === 0) {
        return (
            <div className="space-y-3 p-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1">
                            <Skeleton className="h-5 w-3/4 mb-1" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <Skeleton className="w-12 h-6" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <ScrollArea className="h-[400px] sm:h-[500px] w-full pr-4">
            {/* 頂部標題裝飾區 */}
            <div className="flex items-center justify-between mb-3">
                <RankingHeader reduceMotion={reduceMotion} />

                {/* 管理員重置按鈕 */}
                {user?.isAdmin && sortedSongs.some(s => s.isPlayed) && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleResetAllPlayed}
                                    disabled={isResetting}
                                    className="text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 gap-1"
                                >
                                    <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                                    重置
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-slate-800 text-white border-0 text-xs">
                                <p>重置所有彈奏狀態</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>

            <ol className="space-y-2" ref={containerRef} role="list" aria-label="人氣點播排行榜">
                <AnimatePresence mode="popLayout">
                    {sortedSongs.map((song, index) => (
                        <motion.li
                            key={song.id}
                            layout
                            layoutId={`song-${song.id}`}
                            aria-label={`第 ${index + 1} 名：${song.title} - ${song.artist}，${song.voteCount || 0} 票`}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                                scale: 1,
                                transition: {
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 25
                                }
                            }}
                            exit={{
                                opacity: 0,
                                scale: 0.8,
                                transition: { duration: 0.2 }
                            }}
                            className={`
                                flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl relative overflow-hidden
                                transition-all duration-200
                                ${song.isPlayed ? 'bg-emerald-50/50 border-emerald-200' : ''}
                                ${index === 0
                                    ? 'bg-gradient-to-r from-amber-50/90 via-yellow-50/80 to-amber-50/70 border-l-4 border-l-amber-400 border border-amber-200/60 shadow-lg shadow-amber-100/40'
                                    : index === 1
                                        ? 'bg-gradient-to-r from-slate-50/90 via-gray-50/80 to-slate-50/70 border-l-4 border-l-slate-400 border border-slate-200/60 shadow-md shadow-slate-100/40'
                                        : index === 2
                                            ? 'bg-gradient-to-r from-orange-50/90 via-amber-50/80 to-orange-50/70 border-l-4 border-l-orange-400 border border-orange-200/60 shadow-md shadow-orange-100/40'
                                            : 'bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-sm'}
                                ${showRankChange[song.id] === 'up' ? 'ring-2 ring-emerald-200 shadow-lg shadow-emerald-100/50' :
                                    showRankChange[song.id] === 'down' ? 'ring-2 ring-rose-200 shadow-lg shadow-rose-100/50' : ''}
                                ${index < 3 ? 'hover:shadow-xl hover:scale-[1.01]' : 'hover:bg-slate-50/50'}
                            `}
                        >
                            {/* 前三名微光效果 */}
                            {index < 3 && (
                                <div
                                    className={`absolute inset-0 opacity-30 pointer-events-none rounded-xl
                                        ${index === 0 ? 'bg-gradient-to-br from-amber-200/20 via-transparent to-yellow-100/10' :
                                            index === 1 ? 'bg-gradient-to-br from-slate-200/20 via-transparent to-gray-100/10' :
                                                'bg-gradient-to-br from-orange-200/20 via-transparent to-amber-100/10'}`}
                                />
                            )}

                            {/* 排名變化動畫 - 簡化版 */}
                            {showRankChange[song.id] === 'up' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.2, 0] }}
                                    transition={{ duration: 1, times: [0, 0.5, 1] }}
                                    className="absolute inset-0 bg-gradient-to-r from-emerald-400/15 to-green-400/15 rounded-xl"
                                    style={{ pointerEvents: "none" }}
                                />
                            )}
                            {showRankChange[song.id] === 'down' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.2, 0] }}
                                    transition={{ duration: 1, times: [0, 0.5, 1] }}
                                    className="absolute inset-0 bg-gradient-to-r from-rose-400/15 to-red-400/15 rounded-xl"
                                    style={{ pointerEvents: "none" }}
                                />
                            )}

                            {/* 排名圖標 */}
                            <RankingBadge index={index} showRankChange={showRankChange[song.id]} />

                            {/* 歌曲資訊 */}
                            <div className="flex-1 min-w-0 w-full sm:w-auto">
                                <motion.div
                                    className="relative"
                                    animate={{ scale: showRankChange[song.id] ? [1, 1.02, 1] : 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h3 className={`font-bold text-base sm:text-lg leading-tight truncate ${index === 0 ? 'text-amber-900' :
                                            index === 1 ? 'text-slate-800' :
                                                index === 2 ? 'text-orange-900' :
                                                    'text-slate-800'
                                        }`}>
                                        {song.title}
                                    </h3>
                                </motion.div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className={`text-sm truncate ${index === 0 ? 'text-amber-700/80' :
                                            index === 1 ? 'text-slate-600/80' :
                                                index === 2 ? 'text-orange-700/80' :
                                                    'text-slate-500'
                                        }`}>
                                        {song.artist}
                                    </p>
                                    {song.isPlayed && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium shrink-0">
                                            <Check className="w-3 h-3" />
                                            已完成
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 票數區塊 */}
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="flex items-baseline gap-0.5 px-2 py-1 rounded-md bg-slate-100/70">
                                    <span
                                        className={`text-lg font-bold tabular-nums ${index === 0 ? 'text-amber-700' :
                                            index === 1 ? 'text-slate-600' :
                                                index === 2 ? 'text-orange-700' :
                                                    'text-slate-600'
                                            }`}
                                    >
                                        {song.voteCount || 0}
                                    </span>
                                    <span className="text-xs text-slate-500">票</span>
                                </div>

                                {/* 操作按鈕 */}
                                <div className="flex gap-1.5">
                                    {/* 管理員彈奏標記按鈕 */}
                                    {user?.isAdmin && (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleTogglePlayed(song)}
                                                        className={`w-9 h-9 rounded-lg border border-transparent transition-colors ${song.isPlayed
                                                            ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300'
                                                            : 'hover:bg-slate-100 hover:border-slate-200'
                                                            }`}
                                                        aria-label={song.isPlayed ? '取消標記已彈奏' : '標記為已彈奏'}
                                                    >
                                                        <Check className={`w-4 h-4 ${song.isPlayed ? 'text-emerald-600' : 'text-slate-400'}`} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="bg-slate-800 text-white border-0 text-xs">
                                                    <p>{song.isPlayed ? '取消標記' : '標記已彈奏'}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    )}

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-9 h-9 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-200"
                                                    asChild
                                                    aria-label={`搜尋「${song.title}」的吉他譜`}
                                                >
                                                    <a href={generateGuitarTabsUrl(song)} target="_blank" rel="noopener noreferrer">
                                                        <Music2 className="w-4 h-4 text-amber-600" />
                                                    </a>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-slate-800 text-white border-0 text-xs">
                                                <p>搜尋吉他譜</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-9 h-9 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200"
                                                    asChild
                                                    aria-label={`搜尋「${song.title}」的歌詞`}
                                                >
                                                    <a href={generateLyricsUrl(song)} target="_blank" rel="noopener noreferrer">
                                                        <FileText className="w-4 h-4 text-rose-600" />
                                                    </a>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-slate-800 text-white border-0 text-xs">
                                                <p>搜尋歌詞</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </motion.li>
                    ))}
                </AnimatePresence>

                {/* 展開/收合區塊 */}
                <div ref={loadMoreRef} className="flex justify-center pt-4 pb-2">
                    {isExpanded ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExpanded(false)}
                            className="w-full max-w-xs bg-gradient-to-r from-amber-50 to-orange-50 
                                border-amber-200 hover:border-amber-400 
                                hover:from-amber-100 hover:to-orange-100
                                text-amber-700 hover:text-amber-800
                                hover:scale-[1.02] active:scale-[0.98]
                                transition-all duration-200 gap-2"
                        >
                            <ChevronUp className="h-4 w-4" />
                            收合排行榜（顯示前 10 名）
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 text-amber-600 text-sm py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>滾動查看更多...</span>
                        </div>
                    )}
                </div>
            </ol>
        </ScrollArea>
    );
});
