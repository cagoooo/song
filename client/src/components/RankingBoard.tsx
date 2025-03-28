import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Crown, Award, FileText, Music2, Sparkles, Star, TrendingUp, Flame, Music, Mic, Headphones } from "lucide-react";
import type { Song } from "@db/schema";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
      {/* 加強版頂部裝飾元素 */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 relative overflow-hidden rounded-lg p-3 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-yellow-300 shadow-md"
      >
        <div className="text-center font-semibold text-amber-800 flex items-center justify-center gap-3">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <motion.div 
              className="absolute inset-0 bg-yellow-400 rounded-full opacity-30"
              animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ filter: "blur(6px)" }}
            />
          </motion.div>
          
          <motion.div
            className="relative"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.span
              className="inline-block text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-amber-800 via-yellow-600 to-amber-800 px-1 py-0.5"
              animate={{ backgroundPosition: ['0% center', '100% center', '0% center'] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: '200% auto' }}
            >
              熱門歌曲排行榜
            </motion.span>
            <motion.div
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" 
              animate={{ scaleX: [0.3, 1, 0.3], opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
          
          <motion.div
            animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <Headphones className="h-5 w-5 text-amber-500" />
            <motion.div 
              className="absolute inset-0 bg-amber-400 rounded-full opacity-30"
              animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              style={{ filter: "blur(6px)" }}
            />
          </motion.div>
        </div>
        
        {/* 裝飾性音符泡泡 */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-amber-500/30 pointer-events-none"
            initial={{ 
              x: `${20 + (i * 30)}%`,
              y: "100%", 
              scale: 0.5 + (i * 0.2),
              opacity: 0 
            }}
            animate={{ 
              y: ["100%", "10%", "0%"], 
              opacity: [0, 0.8, 0],
              rotate: [0, 10 * (i % 2 ? 1 : -1), 0]
            }}
            transition={{
              duration: 4 + (i * 1),
              repeat: Infinity,
              delay: i * 2,
              ease: "easeInOut"
            }}
          >
            {i % 3 === 0 ? <Music size={14} /> : i % 3 === 1 ? <Mic size={14} /> : <Music2 size={14} />}
          </motion.div>
        ))}
        
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-amber-200/20 via-yellow-300/10 to-amber-100/20 -z-10 pointer-events-none"
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
            filter: "blur(5px)",
          }}
        />
      </motion.div>
      
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
              {/* 增強第一名歌曲的特效 */}
              {index === 0 && (
                <>
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-br from-yellow-400/15 via-amber-300/10 to-yellow-200/15"
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
                      opacity: 0.7,
                      filter: "blur(10px)",
                      zIndex: 0,
                      pointerEvents: "none"
                    }}
                  />
                  
                  {/* 四周光芒效果 */}
                  <motion.div
                    className="absolute top-0 right-0 w-32 h-20 pointer-events-none"
                    animate={{
                      opacity: [0.1, 0.4, 0.1],
                      rotate: [0, 15, 0],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{
                      background: "radial-gradient(circle at right top, rgba(251, 191, 36, 0.3), transparent 60%)",
                      filter: "blur(8px)",
                    }}
                  />
                  
                  <motion.div
                    className="absolute bottom-0 left-0 w-32 h-20 pointer-events-none"
                    animate={{
                      opacity: [0.1, 0.3, 0.1],
                      rotate: [0, -10, 0],
                    }}
                    transition={{
                      duration: 4.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.5
                    }}
                    style={{
                      background: "radial-gradient(circle at left bottom, rgba(251, 191, 36, 0.2), transparent 60%)",
                      filter: "blur(8px)",
                    }}
                  />
                  
                  {/* 細微星星裝飾 */}
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-yellow-300 rounded-full pointer-events-none"
                      style={{
                        left: `${15 + i * 30}%`,
                        top: `${20 + i * 20}%`,
                        filter: "blur(1px)",
                      }}
                      animate={{
                        opacity: [0.3, 0.9, 0.3],
                        scale: [1, 1.4, 1],
                      }}
                      transition={{
                        duration: 2 + i,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.3,
                      }}
                    />
                  ))}
                </>
              )}
              
              {/* 當有排名變化時顯示的動畫效果 */}
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
                    className="relative"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0],
                      y: [0, -2, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {/* 光環效果 */}
                    <motion.div 
                      className="absolute inset-0 rounded-full"
                      animate={{
                        boxShadow: [
                          "0 0 0 0 rgba(251, 191, 36, 0)",
                          "0 0 0 4px rgba(251, 191, 36, 0.1)",
                          "0 0 0 0 rgba(251, 191, 36, 0)"
                        ],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    
                    {/* 發光效果 */}
                    <motion.div 
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-300/30 pointer-events-none"
                      animate={{
                        opacity: [0.2, 0.7, 0.2],
                        scale: [1, 1.5, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        filter: "blur(3px)",
                      }}
                    />
                    
                    <Crown className="w-7 h-7 text-amber-500 relative z-10" />
                    
                    {/* 小閃光點 */}
                    <motion.div 
                      className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-amber-200 rounded-full"
                      animate={{
                        opacity: [0.6, 1, 0.6],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                      style={{
                        filter: "blur(0.5px)",
                      }}
                    />
                  </motion.div>
                )}
                {index === 1 && (
                  <motion.div
                    className="relative"
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
                    {/* 發光背景 */}
                    <motion.div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gray-300/20 pointer-events-none"
                      animate={{
                        opacity: [0.2, 0.5, 0.2],
                        scale: [0.8, 1.3, 0.8]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        filter: "blur(2px)",
                      }}
                    />
                    
                    <Award className="w-5 h-5 text-gray-500 relative z-10" />
                    
                    {/* 微光細節 */}
                    <motion.div
                      className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-gray-200 rounded-full pointer-events-none"
                      animate={{
                        opacity: [0.5, 0.9, 0.5]
                      }}
                      transition={{
                        duration: 1.8,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        filter: "blur(0.5px)",
                      }}
                    />
                  </motion.div>
                )}
                
                {index === 2 && (
                  <motion.div
                    className="relative"
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
                    {/* 輕微發光效果 */}
                    <motion.div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-orange-300/20 pointer-events-none"
                      animate={{
                        opacity: [0.1, 0.4, 0.1],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        filter: "blur(2px)",
                      }}
                    />
                    
                    <Trophy className="w-5 h-5 text-orange-500 relative z-10" />
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
                  animate={{ 
                    scale: showRankChange[song.id] ? [1, 1.02, 1] : 1
                  }}
                  className={cn(
                    "font-semibold truncate text-sm sm:text-base",
                    showRankChange[song.id] === 'up' ? "text-green-600" : 
                    showRankChange[song.id] === 'down' ? "text-red-600" : "text-gray-900"
                  )}
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
                            className="w-8 h-8 sm:w-9 sm:h-9 relative hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 z-10"
                            asChild
                          >
                            <a
                              href={generateGuitarTabsUrl(song)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center"
                            >
                              <Music2 className="w-4 h-4 sm:w-5 sm:h-5" />
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
                            className="w-8 h-8 sm:w-9 sm:h-9 relative hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 z-10"
                            asChild
                          >
                            <a
                              href={generateLyricsUrl(song)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center"
                            >
                              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
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