// 重構後的排行榜主元件
import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    FileText, Music2, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Song } from '@/lib/firestore';

// 拆分的子元件
import { RankingHeader } from './RankingHeader';
import { RankingBadge } from './RankingBadge';
import { useRankingData } from './useRankingData';

interface RankingBoardProps {
    songs: Song[];
}

export default function RankingBoard({ songs: propSongs }: RankingBoardProps) {
    // 偵測是否為手機裝置，減少動畫
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const reduceMotion = isMobile || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const [isExpanded, setIsExpanded] = useState(false);
    const isLoading = propSongs.length === 0;
    const displayLimit = isExpanded ? 30 : 10;
    const containerRef = useRef<HTMLDivElement>(null);

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
            <RankingHeader reduceMotion={reduceMotion} />

            <div className="space-y-4" ref={containerRef}>
                <AnimatePresence mode="popLayout">
                    {sortedSongs.map((song, index) => (
                        <motion.div
                            key={song.id}
                            layout
                            layoutId={`song-${song.id}`}
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
                flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border relative overflow-hidden
                ${index === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-100 border-yellow-300 shadow-lg shadow-amber-100/50' :
                                    index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-100 border-gray-300 shadow-md shadow-gray-100/50' :
                                        index === 2 ? 'bg-gradient-to-r from-orange-50 to-rose-100 border-orange-300 shadow-md shadow-orange-100/50' :
                                            'bg-gradient-to-r from-white to-gray-50 border-gray-200 hover:shadow-sm hover:shadow-gray-100/30 hover:border-gray-300/50'}
                transform transition-all duration-300
                ${showRankChange[song.id] === 'up' ? 'shadow-lg shadow-green-100 scale-[1.02]' :
                                    showRankChange[song.id] === 'down' ? 'shadow-lg shadow-red-100 scale-[0.98]' : ''}
                ${index === 0 ? 'hover:shadow-xl hover:shadow-amber-200/40 hover:scale-[1.01]' : 'hover:scale-[1.005]'}
              `}
                        >
                            {/* 第一名特效 */}
                            {index === 0 && (
                                <>
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-br from-yellow-400/15 via-amber-300/10 to-yellow-200/15"
                                        animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
                                        transition={{ duration: 8, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                                        style={{ backgroundSize: "200% 200%", opacity: 0.7, filter: "blur(10px)", zIndex: 0, pointerEvents: "none" }}
                                    />
                                    {[...Array(3)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="absolute w-1 h-1 bg-yellow-300 rounded-full pointer-events-none"
                                            style={{ left: `${15 + i * 30}%`, top: `${20 + i * 20}%`, filter: "blur(1px)" }}
                                            animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.4, 1] }}
                                            transition={{ duration: 2 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                                        />
                                    ))}
                                </>
                            )}

                            {/* 排名變化動畫 */}
                            {showRankChange[song.id] === 'up' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.3, 0] }}
                                    transition={{ duration: 1.5, times: [0, 0.5, 1] }}
                                    className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                                    style={{ filter: "blur(8px)", zIndex: 0, pointerEvents: "none" }}
                                />
                            )}
                            {showRankChange[song.id] === 'down' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.3, 0] }}
                                    transition={{ duration: 1.5, times: [0, 0.5, 1] }}
                                    className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-500/20"
                                    style={{ filter: "blur(8px)", zIndex: 0, pointerEvents: "none" }}
                                />
                            )}

                            {/* 煙火效果 */}
                            {showFirework[song.id] && (
                                <motion.div
                                    className="absolute inset-0 pointer-events-none"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.8, 0], scale: [0.9, 1.1, 1] }}
                                    transition={{ duration: 1.5, times: [0, 0.3, 1] }}
                                >
                                    {[...Array(12)].map((_, i) => (
                                        <motion.div
                                            key={i}
                                            className="absolute w-1 h-1 bg-amber-500 rounded-full"
                                            initial={{ x: "50%", y: "50%", opacity: 1 }}
                                            animate={{
                                                x: `${50 + (Math.random() * 100 - 50)}%`,
                                                y: `${50 + (Math.random() * 100 - 50)}%`,
                                                opacity: 0,
                                                scale: [1, 1.5, 0]
                                            }}
                                            transition={{ duration: 0.8 + Math.random() * 0.7, delay: Math.random() * 0.2 }}
                                        />
                                    ))}
                                </motion.div>
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
                                    <h3 className={`font-semibold break-all ${index === 0 ? 'text-amber-900' :
                                        index === 1 ? 'text-gray-800' :
                                            index === 2 ? 'text-orange-900' :
                                                'text-gray-800'
                                        }`}>
                                        {song.title}
                                    </h3>
                                </motion.div>
                                <p className={`text-sm break-all ${index === 0 ? 'text-amber-700' :
                                    index === 1 ? 'text-gray-600' :
                                        index === 2 ? 'text-orange-700' :
                                            'text-gray-500'
                                    }`}>
                                    {song.artist}
                                </p>
                            </div>

                            {/* 投票數 */}
                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                <motion.span
                                    className={`text-lg font-bold min-w-[3rem] text-right ${index === 0 ? 'text-amber-900' :
                                        index === 1 ? 'text-gray-700' :
                                            index === 2 ? 'text-orange-800' :
                                                'text-gray-700'
                                        }`}
                                    animate={showRankChange[song.id] ? { scale: [1, 1.2, 1] } : {}}
                                    transition={{ duration: 0.5 }}
                                >
                                    {song.voteCount || 0}
                                </motion.span>

                                {/* 操作按鈕 */}
                                <div className="flex gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className={`w-10 h-10 sm:w-11 sm:h-11 relative z-10 overflow-hidden
                              border-amber-200 hover:border-amber-400
                              ${index < 2 ? 'bg-gradient-to-br from-amber-50 to-yellow-100' : ''}`}
                                                        asChild
                                                        aria-label={`搜尋「${song.title}」的吉他譜`}
                                                    >
                                                        <a href={generateGuitarTabsUrl(song)} target="_blank" rel="noopener noreferrer">
                                                            <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                                                        </a>
                                                    </Button>
                                                </motion.div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="font-medium text-amber-950 bg-amber-50 border-amber-200">
                                                <p>搜尋「{song.title} - {song.artist}」的吉他譜</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className={`w-10 h-10 sm:w-11 sm:h-11 relative z-10 overflow-hidden
                              border-rose-200 hover:border-rose-400
                              ${index < 2 ? 'bg-gradient-to-br from-rose-50 to-pink-100' : ''}`}
                                                        asChild
                                                        aria-label={`搜尋「${song.title}」的歌詞`}
                                                    >
                                                        <a href={generateLyricsUrl(song)} target="_blank" rel="noopener noreferrer">
                                                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-rose-700" />
                                                        </a>
                                                    </Button>
                                                </motion.div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="font-medium text-rose-950 bg-rose-50 border-rose-200">
                                                <p>搜尋「{song.title} - {song.artist}」的歌詞</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* 展開/收合按鈕 */}
                <div className="flex justify-center pt-4 pb-2">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-full max-w-xs bg-gradient-to-r from-amber-50 to-orange-50 
                         border-amber-200 hover:border-amber-400 
                         hover:from-amber-100 hover:to-orange-100
                         text-amber-700 hover:text-amber-800
                         transition-all duration-300 gap-2"
                        >
                            {isExpanded ? (
                                <>
                                    <ChevronUp className="h-4 w-4" />
                                    收合排行榜（顯示前 10 名）
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-4 w-4" />
                                    查看更多（顯示前 30 名）
                                </>
                            )}
                        </Button>
                    </motion.div>
                </div>
            </div>
        </ScrollArea>
    );
}
