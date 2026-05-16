// 重構後的排行榜主元件（含彈奏標記功能及重置投票）
import { useState, useRef, memo, useCallback, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    FileText, Music2, ChevronUp, Check, RotateCcw, Loader2, RefreshCw, Play, Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Song } from '@/lib/firestore';
import { markSongAsPlayed, unmarkSongAsPlayed, resetAllPlayedSongs, resetAllVotes, setNowPlaying, clearNowPlaying } from '@/lib/firestore';
import type { AppUser } from '@/lib/auth';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useToast } from '@/hooks/use-toast';
import { getErrorToast } from '@/lib/error-handler';

// 拆分的子元件
import { RankingHeader } from './RankingHeader';
import { RankingBadge } from './RankingBadge';
import { useRankingData } from './useRankingData';
import { useVoteSurge, SURGE_META } from '@/hooks/useVoteSurge';
import { SurgeBadge } from '../SurgeBadge';

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
    const [isResettingPlayed, setIsResettingPlayed] = useState(false);
    const [isResettingVotes, setIsResettingVotes] = useState(false);
    const [showResetVotesDialog, setShowResetVotesDialog] = useState(false);
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

    // 偵測票數飆升 (60s 內 5/10/20 票觸發三階等級)
    const surgeMap = useVoteSurge(propSongs);

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

    // 處理彈奏標記切換（標記已彈奏時自動清除正在彈奏狀態）
    const handleTogglePlayed = useCallback(async (song: Song) => {
        if (!user?.id) return;

        try {
            if (song.isPlayed) {
                await unmarkSongAsPlayed(song.id);
                toast({ title: '已取消標記', description: `「${song.title}」` });
            } else {
                // 標記已彈奏時，先清除正在彈奏狀態
                if (song.isNowPlaying) {
                    await clearNowPlaying();
                }
                await markSongAsPlayed(song.id, user.id);
                toast({ title: '✓ 已彈奏', description: `「${song.title}」` });
            }
        } catch (error) {
            toast(getErrorToast(error));
        }
    }, [user?.id, toast]);

    // 處理正在彈奏狀態切換
    // - 已在彈奏 → 直接停止（不用選曲長）
    // - 還沒彈 → 由 dropdown 帶入 durationSec
    const handleSetNowPlaying = useCallback(async (song: Song, durationSec?: number) => {
        if (!user?.id) return;

        try {
            if (song.isNowPlaying) {
                await clearNowPlaying();
                toast({ title: '已停止', description: `「${song.title}」` });
            } else {
                await setNowPlaying(song.id, user.id, durationSec);
                const durLabel = durationSec
                    ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`
                    : '預設 3:30';
                toast({
                    title: '🎸 正在彈奏',
                    description: `「${song.title}」· 預估 ${durLabel}`,
                });
            }
        } catch (error) {
            toast(getErrorToast(error));
        }
    }, [user?.id, toast]);

    // 5 個預設曲長選項（秒）
    const DURATION_PRESETS: { label: string; sec: number }[] = [
        { label: '2:30 · 短歌', sec: 150 },
        { label: '3:00 · 標準', sec: 180 },
        { label: '3:30 · 預設', sec: 210 },
        { label: '4:00 · 長歌', sec: 240 },
        { label: '5:00 · 慢板', sec: 300 },
    ];

    // 重置所有彈奏狀態
    const handleResetAllPlayed = useCallback(async () => {
        if (!user?.isAdmin) return;

        setIsResettingPlayed(true);
        try {
            await resetAllPlayedSongs();
            await clearNowPlaying(); // 同時清除正在彈奏狀態
            toast({ title: '已重置', description: '所有彈奏狀態已清除' });
        } catch (error) {
            toast(getErrorToast(error, '重置失敗'));
        } finally {
            setIsResettingPlayed(false);
        }
    }, [user?.isAdmin, toast]);

    // 重置所有投票（點播次數歸零）
    const handleResetAllVotes = useCallback(async () => {
        if (!user?.isAdmin) return;

        setIsResettingVotes(true);
        try {
            await resetAllVotes();
            toast({ title: '成功', description: '所有點播次數已歸零' });
            setShowResetVotesDialog(false);
        } catch (error) {
            toast(getErrorToast(error, '重置失敗'));
        } finally {
            setIsResettingVotes(false);
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

                {/* 管理員操作按鈕組 */}
                {user?.isAdmin && (
                    <div className="flex items-center gap-1">
                        {/* 重置投票按鈕 */}
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowResetVotesDialog(true)}
                                        disabled={isResettingVotes}
                                        aria-label="重置投票"
                                        className="text-xs text-slate-600 hover:text-[#2b4dff] hover:bg-[#2b4dff]/5 gap-1 px-2 sm:px-3"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${isResettingVotes ? 'animate-spin' : ''}`} />
                                        <span className="hidden sm:inline">重置投票</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="bg-slate-800 text-white border-0 text-xs">
                                    <p>將所有歌曲點播次數歸零</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* 重置彈奏狀態按鈕 - 只在有已彈奏歌曲時顯示 */}
                        {sortedSongs.some(s => s.isPlayed) && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleResetAllPlayed}
                                            disabled={isResettingPlayed}
                                            aria-label="重置彈奏狀態"
                                            className="text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 gap-1 px-2 sm:px-3"
                                        >
                                            <RotateCcw className={`w-3.5 h-3.5 ${isResettingPlayed ? 'animate-spin' : ''}`} />
                                            <span className="hidden sm:inline">重置彈奏</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="bg-slate-800 text-white border-0 text-xs">
                                        <p>重置所有彈奏狀態</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                )}
            </div>

            <ol className="space-y-2" ref={containerRef} role="list" aria-label="人氣點播排行榜">
                <AnimatePresence mode="popLayout" initial={false}>
                    {sortedSongs.map((song, index) => {
                        const surgeLevel = surgeMap.get(song.id) ?? 0;
                        const surgeRing = surgeLevel > 0 ? SURGE_META[surgeLevel as 1 | 2 | 3].ringClass : '';
                        return (
                        <motion.li
                            key={song.id}
                            layout="position"
                            aria-label={`第 ${index + 1} 名：${song.title} - ${song.artist}，${song.voteCount || 0} 票${surgeLevel > 0 ? `（${SURGE_META[surgeLevel as 1 | 2 | 3].label}）` : ''}`}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{
                                opacity: 1,
                                y: 0,
                            }}
                            transition={{
                                layout: {
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 30,
                                },
                                opacity: { duration: 0.2 },
                                y: { duration: 0.2 }
                            }}
                            exit={{
                                opacity: 0,
                                transition: { duration: 0.15 }
                            }}
                            style={{ originX: 0 }} // 確保縮放以左側為基準
                            className={`
                                flex flex-wrap items-center gap-2 p-2.5 sm:p-3 rounded-lg relative overflow-hidden
                                transition-all duration-200
                                ${song.isNowPlaying
                                    ? 'bg-[#2b4dff]/[0.08] border-2 border-[#2b4dff] shadow-md ring-2 ring-[#2b4dff]/20'
                                    : song.isPlayed
                                        ? 'bg-slate-50 border border-slate-200'
                                        : ''}
                                ${!song.isNowPlaying && !song.isPlayed && (index === 0
                                    ? 'bg-[#faf7f0] border-l-4 border-l-[#b8902a] border border-[rgba(17,17,17,0.14)] shadow-sm'
                                    : index === 1
                                        ? 'bg-[#faf7f0] border-l-4 border-l-[#7a7a7a] border border-[rgba(17,17,17,0.14)] shadow-sm'
                                        : index === 2
                                            ? 'bg-[#faf7f0] border-l-4 border-l-[#a25a32] border border-[rgba(17,17,17,0.14)] shadow-sm'
                                            : 'bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-sm')}
                                ${showRankChange[song.id] === 'up' ? 'ring-2 ring-[#2b4dff]/30' :
                                    showRankChange[song.id] === 'down' ? 'ring-2 ring-slate-300' : ''}
                                ${index < 3 && !song.isNowPlaying ? 'hover:shadow-md' : !song.isNowPlaying ? 'hover:bg-slate-50/50' : ''}
                                ${surgeRing}
                            `}
                        >

                            {/* 排名變化動畫 — Editorial 藍 / 中性灰 */}
                            {showRankChange[song.id] === 'up' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.18, 0] }}
                                    transition={{ duration: 1, times: [0, 0.5, 1] }}
                                    className="absolute inset-0 bg-[#2b4dff]/15 rounded-lg"
                                    style={{ pointerEvents: "none" }}
                                />
                            )}
                            {showRankChange[song.id] === 'down' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.18, 0] }}
                                    transition={{ duration: 1, times: [0, 0.5, 1] }}
                                    className="absolute inset-0 bg-slate-300/20 rounded-lg"
                                    style={{ pointerEvents: "none" }}
                                />
                            )}

                            {/* 排名圖標 */}
                            <RankingBadge index={index} showRankChange={showRankChange[song.id]} />

                            {/* 歌曲資訊 - 加大字體 */}
                            <div className="flex-1 min-w-0">
                                <motion.div
                                    className="relative"
                                    animate={{ scale: showRankChange[song.id] ? [1, 1.02, 1] : 1 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <h3
                                        className="text-lg sm:text-base leading-tight truncate text-slate-900"
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                            fontWeight: 800,
                                            letterSpacing: '-0.015em',
                                        }}
                                    >
                                        {song.title}
                                    </h3>
                                </motion.div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-sm truncate text-slate-500">
                                        {song.artist}
                                    </p>
                                    {/* 正在彈奏中標籤 — Editorial 藍 */}
                                    {song.isNowPlaying && (
                                        <motion.span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2b4dff] text-white shrink-0 shadow-sm"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 10,
                                                letterSpacing: '0.14em',
                                                textTransform: 'uppercase',
                                                fontWeight: 600,
                                            }}
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                        >
                                            <Play className="w-3 h-3 fill-current" />
                                            Now Playing
                                        </motion.span>
                                    )}
                                    {/* 已彈奏標籤 */}
                                    {song.isPlayed && !song.isNowPlaying && (
                                        <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0 border border-slate-300"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 10,
                                                letterSpacing: '0.14em',
                                                textTransform: 'uppercase',
                                                fontWeight: 600,
                                            }}
                                        >
                                            <Check className="w-3 h-3" />
                                            已彈奏
                                        </span>
                                    )}
                                    {/* 飆升等級徽章 */}
                                    <SurgeBadge level={surgeLevel} />
                                </div>
                            </div>

                            {/* 票數 — Editorial italic + 藍/銀/銅色 */}
                            <div className="flex items-baseline gap-0.5 px-2 py-1 rounded-md bg-white/80 ml-auto border border-[rgba(17,17,17,0.08)]">
                                <span
                                    className="tabular-nums"
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontStyle: 'italic',
                                        fontWeight: 900,
                                        fontSize: 20,
                                        letterSpacing: '-0.02em',
                                        color: index === 0 ? '#b8902a' :
                                               index === 1 ? '#7a7a7a' :
                                               index === 2 ? '#a25a32' :
                                               '#2b4dff',
                                    }}
                                >
                                    {song.voteCount || 0}
                                </span>
                                <span className="text-xs text-slate-500">票</span>
                            </div>

                            {/* 操作按鈕區 */}
                            <div className="flex items-center gap-1 w-full sm:w-auto justify-end mt-1 sm:mt-0">
                                {/* 管理員「正在彈奏」按鈕
                                    - 彈奏中 → 直接停止
                                    - 未彈奏 → 開 DropdownMenu 選曲長 */}
                                {user?.isAdmin && (
                                    song.isNowPlaying ? (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleSetNowPlaying(song)}
                                                        className="w-10 h-10 sm:w-9 sm:h-9 rounded-md border transition-colors bg-[#2b4dff]/10 hover:bg-[#2b4dff]/20 border-[#2b4dff]/40"
                                                        aria-label="停止彈奏"
                                                    >
                                                        <Square className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#2b4dff] fill-[#2b4dff]" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="bg-slate-800 text-white border-0 text-xs z-[100]">
                                                    <p>停止彈奏</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ) : (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-10 h-10 sm:w-9 sm:h-9 rounded-md border transition-colors hover:bg-[#2b4dff]/5 border-transparent hover:border-[#2b4dff]/30"
                                                    aria-label="開始彈奏（選擇曲長）"
                                                    title="開始彈奏（選擇曲長）"
                                                >
                                                    <Play className="w-5 h-5 sm:w-4 sm:h-4 text-[#2b4dff]" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="z-[100]">
                                                <DropdownMenuLabel className="text-xs text-slate-500 font-normal">
                                                    預估曲長 — 給隊列條進度條同步
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {DURATION_PRESETS.map((p) => (
                                                    <DropdownMenuItem
                                                        key={p.sec}
                                                        onSelect={() => handleSetNowPlaying(song, p.sec)}
                                                        className="cursor-pointer"
                                                    >
                                                        <Play className="w-3.5 h-3.5 mr-2 text-[#2b4dff]" />
                                                        {p.label}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )
                                )}

                                {/* 管理員「已彈奏」標記按鈕 */}
                                {user?.isAdmin && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleTogglePlayed(song)}
                                                    className={`w-10 h-10 sm:w-9 sm:h-9 rounded-md border transition-colors ${song.isPlayed
                                                        ? 'bg-slate-100 hover:bg-slate-200 border-slate-300'
                                                        : 'hover:bg-slate-100 border-transparent hover:border-slate-200'
                                                        }`}
                                                    aria-label={song.isPlayed ? '取消標記已彈奏' : '標記為已彈奏'}
                                                >
                                                    <Check className={`w-5 h-5 sm:w-4 sm:h-4 ${song.isPlayed ? 'text-slate-700' : 'text-slate-400'}`} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="bg-slate-800 text-white border-0 text-xs z-[100]">
                                                <p>{song.isPlayed ? '取消標記' : '標記已彈奏'}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}

                                {/* 吉他譜 / 歌詞 — Editorial 中性灰 + hover 藍 */}
                                <a
                                    href={generateGuitarTabsUrl(song)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-[rgba(17,17,17,0.18)] text-slate-600 hover:border-[#2b4dff] hover:bg-[#2b4dff]/5 hover:text-[#2b4dff] transition-colors"
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: 11,
                                        letterSpacing: '0.08em',
                                        fontWeight: 600,
                                    }}
                                    aria-label={`搜尋「${song.title}」的吉他譜`}
                                >
                                    <Music2 className="w-3.5 h-3.5" />
                                    <span>吉他譜</span>
                                </a>

                                <a
                                    href={generateLyricsUrl(song)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-[rgba(17,17,17,0.18)] text-slate-600 hover:border-[#2b4dff] hover:bg-[#2b4dff]/5 hover:text-[#2b4dff] transition-colors"
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: 11,
                                        letterSpacing: '0.08em',
                                        fontWeight: 600,
                                    }}
                                    aria-label={`搜尋「${song.title}」的歌詞`}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>歌詞</span>
                                </a>
                            </div>
                        </motion.li>
                    );
                    })}
                </AnimatePresence>

                {/* 展開/收合區塊 */}
                <div ref={loadMoreRef} className="flex justify-center pt-4 pb-2">
                    {isExpanded ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExpanded(false)}
                            className="w-full max-w-xs bg-[#faf7f0] border-[rgba(17,17,17,0.18)] hover:border-[#2b4dff] hover:bg-[#2b4dff]/5 text-slate-700 hover:text-[#2b4dff] active:scale-[0.98] transition-all duration-200 gap-2 rounded-full"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                            }}
                        >
                            <ChevronUp className="h-4 w-4" />
                            收合排行榜
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>滾動查看更多...</span>
                        </div>
                    )}
                </div>
            </ol>

            {/* 重置投票確認對話框 */}
            <AlertDialog open={showResetVotesDialog} onOpenChange={setShowResetVotesDialog}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-[#2b4dff]" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 800 }}>
                            <RefreshCw className="w-5 h-5" />
                            確認重置所有投票？
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600">
                            此操作將會把所有歌曲的點播次數歸零。
                            <br />
                            <span className="text-[#2b4dff] font-medium">此操作無法復原，請謹慎執行！</span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isResettingVotes}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResetAllVotes}
                            disabled={isResettingVotes}
                            className="bg-[#2b4dff] hover:bg-[#1d3bd8]"
                        >
                            {isResettingVotes ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    重置中...
                                </>
                            ) : (
                                '確認重置'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ScrollArea>
    );
});
