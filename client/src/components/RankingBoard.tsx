import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Crown, Award, FileText, Music2, Sparkles, Star, TrendingUp, Flame } from "lucide-react";
import type { Song } from "@db/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RankingBoardProps {
  songs: Song[];
}

export default function RankingBoard({ songs }: RankingBoardProps) {
  const [prevRanks, setPrevRanks] = useState<{[key: number]: number}>({});
  const [showRankChange, setShowRankChange] = useState<{[key: number]: 'up' | 'down' | null}>({});
  const [prevVotes, setPrevVotes] = useState<{[key: number]: number}>({});
  const [showFirework, setShowFirework] = useState<{[key: number]: boolean}>({});
  const rankChangeTimeoutRef = useRef<{[key: number]: NodeJS.Timeout}>({});
  const fireWorkTimeoutRef = useRef<{[key: number]: NodeJS.Timeout}>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // 排序歌曲並追蹤排名變化
  const sortedSongs = [...songs].sort((a, b) => 
    ((b as any).voteCount || 0) - ((a as any).voteCount || 0)
  );

  // 觸發首名變更時的煙火效果
  const triggerTopRankConfetti = () => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + 100; // 對準第一名位置
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { 
        x: x / window.innerWidth, 
        y: y / window.innerHeight 
      },
      colors: ['#FFD700', '#FFA500', '#FF4500', '#FF6347'],
      zIndex: 1000,
    });
  };

  useEffect(() => {
    const newRanks: {[key: number]: number} = {};
    const newRankChanges: {[key: number]: 'up' | 'down' | null} = {};
    const newFireworks: {[key: number]: boolean} = {};
    const newVotes: {[key: number]: number} = {};

    let hasTopRankChanged = false;
    let previousTopSongId: number | null = null;

    // 找出前一個第一名
    if (Object.keys(prevRanks).length > 0) {
      const prevTopEntry = Object.entries(prevRanks).find(([_, rank]) => rank === 0);
      if (prevTopEntry) {
        previousTopSongId = Number(prevTopEntry[0]);
      }
    }

    sortedSongs.forEach((song, index) => {
      const prevRank = prevRanks[song.id] ?? index;
      const currentVotes = (song as any).voteCount || 0;
      const prevVote = prevVotes[song.id] || 0;
      
      newRanks[song.id] = index;
      newVotes[song.id] = currentVotes;

      // 檢查排名變化
      if (prevRank !== index) {
        newRankChanges[song.id] = prevRank > index ? 'up' : 'down';
        
        // 如果是升至第一名，觸發特效
        if (index === 0 && prevRank > 0) {
          hasTopRankChanged = true;
          newFireworks[song.id] = true;
          
          if (fireWorkTimeoutRef.current[song.id]) {
            clearTimeout(fireWorkTimeoutRef.current[song.id]);
          }
          
          fireWorkTimeoutRef.current[song.id] = setTimeout(() => {
            setShowFirework(prev => ({...prev, [song.id]: false}));
          }, 3000);
        }

        // 清除現有的排名變化提示計時器
        if (rankChangeTimeoutRef.current[song.id]) {
          clearTimeout(rankChangeTimeoutRef.current[song.id]);
        }

        // 設置新的計時器來清除排名變化提示
        rankChangeTimeoutRef.current[song.id] = setTimeout(() => {
          setShowRankChange(prev => ({
            ...prev,
            [song.id]: null
          }));
        }, 2000);
      }
      
      // 檢查是否有新的投票增加
      if (currentVotes > prevVote && prevVote > 0) {
        newFireworks[song.id] = true;
        
        if (fireWorkTimeoutRef.current[song.id]) {
          clearTimeout(fireWorkTimeoutRef.current[song.id]);
        }
        
        fireWorkTimeoutRef.current[song.id] = setTimeout(() => {
          setShowFirework(prev => ({...prev, [song.id]: false}));
        }, 3000);
      }
    });

    // 更新狀態
    setPrevRanks(newRanks);
    setShowRankChange(newRankChanges);
    setPrevVotes(newVotes);
    setShowFirework(newFireworks);
    
    // 如果首名變更，觸發煙火效果
    if (hasTopRankChanged) {
      setTimeout(() => {
        triggerTopRankConfetti();
      }, 300);
    }

    // 清理計時器
    return () => {
      Object.values(rankChangeTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      Object.values(fireWorkTimeoutRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, [songs]);

  const generateGuitarTabsUrl = (song: Song) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} 吉他譜 tab`);
    return `https://www.google.com/search?q=${searchQuery}`;
  };

  const generateLyricsUrl = (song: Song) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} 歌詞`);
    return `https://www.google.com/search?q=${searchQuery}`;
  };

  return (
    <ScrollArea className="h-[60vh] sm:h-[500px] w-full pr-2 sm:pr-4">
      {/* 添加頂部裝飾元素 */}
      <div className="mb-4 relative overflow-hidden rounded-lg p-2 bg-amber-50 border border-yellow-300 shadow-inner">
        <div className="text-center text-sm font-semibold text-amber-800 flex items-center justify-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
          </motion.div>
          <span>實時人氣排名</span>
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame className="h-4 w-4 text-amber-500" />
          </motion.div>
        </div>
        
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-amber-200/30 via-yellow-300/20 to-amber-100/30 -z-10"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
          style={{
            backgroundSize: "200% 200%",
            filter: "blur(5px)",
          }}
        />
      </div>
      
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
              {/* 增加背景動態效果 */}
              {index === 0 && (
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-amber-300/5 to-yellow-200/10"
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut"
                  }}
                  style={{
                    backgroundSize: "200% 200%",
                    opacity: 0.6,
                    filter: "blur(10px)",
                    zIndex: 0
                  }}
                />
              )}
              
              {/* 當有排名變化時顯示的動畫效果 */}
              {showRankChange[song.id] === 'up' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 1.5, times: [0, 0.5, 1] }}
                  className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20"
                  style={{ filter: "blur(8px)", zIndex: 0 }}
                />
              )}
              
              {showRankChange[song.id] === 'down' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 1.5, times: [0, 0.5, 1] }}
                  className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-rose-500/20"
                  style={{ filter: "blur(8px)", zIndex: 0 }}
                />
              )}
              
              {/* 特殊動畫效果，如煙火 */}
              {showFirework[song.id] && (
                <motion.div 
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 0.8, 0],
                    scale: [0.9, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 1.5,
                    times: [0, 0.3, 1]
                  }}
                >
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-amber-500 rounded-full"
                      initial={{ 
                        x: "50%",
                        y: "50%", 
                        opacity: 1
                      }}
                      animate={{ 
                        x: `${50 + (Math.random() * 100 - 50)}%`,
                        y: `${50 + (Math.random() * 100 - 50)}%`, 
                        opacity: 0,
                        scale: [1, 1.5, 0]
                      }}
                      transition={{ 
                        duration: 0.8 + Math.random() * 0.7,
                        delay: Math.random() * 0.2
                      }}
                    />
                  ))}
                </motion.div>
              )}
              <motion.div 
                className="relative flex items-center justify-center w-10 h-10"
                animate={{ scale: showRankChange[song.id] ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 0.3 }}
              >
                {index === 0 && (
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Crown className="w-6 h-6 text-amber-500" />
                  </motion.div>
                )}
                {index === 1 && (
                  <motion.div
                    animate={{ 
                      y: [0, -2, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Award className="w-5 h-5 text-gray-500" />
                  </motion.div>
                )}
                {index === 2 && (
                  <motion.div
                    animate={{ 
                      rotate: [0, 5, -5, 0],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Trophy className="w-5 h-5 text-orange-500" />
                  </motion.div>
                )}
                {index > 2 && (
                  <motion.span 
                    className="text-sm font-medium text-gray-600"
                    animate={{ 
                      scale: showRankChange[song.id] ? [1, 1.2, 1] : 1,
                      y: showRankChange[song.id] ? [-2, 0] : 0
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {index + 1}
                  </motion.span>
                )}

                {/* 排名變化指示器 */}
                {showRankChange[song.id] && (
                  <motion.div
                    initial={{ opacity: 0, x: showRankChange[song.id] === 'up' ? -20 : 20, scale: 0.5 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 25
                    }}
                    className={`
                      absolute -left-6 text-sm font-bold
                      ${showRankChange[song.id] === 'up' 
                        ? 'text-green-500 bg-green-100/50 px-1.5 py-0.5 rounded-full' 
                        : 'text-red-500 bg-red-100/50 px-1.5 py-0.5 rounded-full'}
                    `}
                  >
                    {showRankChange[song.id] === 'up' ? '↑' : '↓'}
                  </motion.div>
                )}
              </motion.div>

              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <motion.h3 
                  className="font-semibold text-gray-900 truncate text-sm sm:text-base"
                  animate={{ 
                    scale: showRankChange[song.id] ? [1, 1.02, 1] : 1,
                    color: showRankChange[song.id] === 'up' ? ['#111827', '#059669', '#111827'] : 
                           showRankChange[song.id] === 'down' ? ['#111827', '#DC2626', '#111827'] : '#111827'
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {song.title}
                </motion.h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{song.artist}</p>
              </div>
              
              {/* 移動裝置上的點擊數顯示（當螢幕小於sm時顯示） */}
              <div className="flex items-center gap-1 sm:hidden ml-auto mr-2 my-1">
                <motion.span
                  className="text-base font-bold text-primary"
                  animate={{ 
                    scale: (song as any).voteCount > (songs.find(s => s.id === song.id) as any)?.prevVoteCount ? [1, 1.2, 1] : 1
                  }}
                  transition={{ 
                    duration: 0.3,
                    type: "spring",
                    stiffness: 400,
                    damping: 10
                  }}
                >
                  {(song as any).voteCount || 0}
                </motion.span>
                <span className="text-xs text-muted-foreground">點播</span>
              </div>

              {/* 桌面版的操作區塊 */}
              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                {/* 桌面版的票數顯示（僅在sm及更大的螢幕上顯示） */}
                <motion.div 
                  className="text-right hidden sm:block mr-2"
                  animate={{ 
                    scale: (song as any).voteCount > (songs.find(s => s.id === song.id) as any)?.prevVoteCount ? [1, 1.2, 1] : 1
                  }}
                  transition={{ 
                    duration: 0.3,
                    type: "spring",
                    stiffness: 400,
                    damping: 10
                  }}
                >
                  <motion.span 
                    className="text-lg font-bold text-primary block"
                    animate={{ 
                      y: showRankChange[song.id] ? [-4, 0] : 0
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {(song as any).voteCount || 0}
                  </motion.span>
                  <motion.p 
                    className="text-xs text-muted-foreground"
                    animate={{ 
                      y: showRankChange[song.id] ? [-2, 0] : 0
                    }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    點播
                  </motion.p>
                </motion.div>

                {/* 操作按鈕 */}
                <div className="flex gap-1 sm:gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 sm:w-8 sm:h-8"
                            asChild
                          >
                            <a
                              href={generateGuitarTabsUrl(song)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Music2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </a>
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>搜尋「{song.title} - {song.artist}」的吉他譜</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-7 h-7 sm:w-8 sm:h-8"
                            asChild
                          >
                            <a
                              href={generateLyricsUrl(song)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                            </a>
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>搜尋「{song.title} - {song.artist}」的歌詞</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}