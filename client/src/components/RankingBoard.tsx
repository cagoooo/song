import { useState, useRef, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { 
  Trophy, Crown, Award, FileText, Music2, Sparkles, 
  Star, TrendingUp, Flame, Music, Mic, Headphones, 
  Medal, Shield, Heart, Zap
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

interface RankingBoardProps {
  songs?: Song[];
  ws?: WebSocket | null;
}

export default function RankingBoard({ songs: propSongs, ws }: RankingBoardProps) {
  // 偵測是否為手機裝置，減少動畫
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const reduceMotion = isMobile || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  
  // 使用專用 API 獲取排行榜前 10 名
  const { data: fetchedTopSongs, isLoading } = useQuery<Song[]>({
    queryKey: ['/api/songs/top'],
    queryFn: async () => {
      const response = await fetch('/api/songs/top?limit=10');
      if (!response.ok) throw new Error('Failed to fetch top songs');
      return response.json();
    },
    refetchInterval: 30000, // 每 30 秒刷新一次
  });

  // 當資料更新時同步
  useEffect(() => {
    if (fetchedTopSongs) {
      setTopSongs(fetchedTopSongs);
    }
  }, [fetchedTopSongs]);

  // 監聽 WebSocket 更新排行榜
  useEffect(() => {
    if (!ws) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SONGS_UPDATE' && data.songs) {
          // 從完整列表中提取前 10 名
          const sorted = [...data.songs].sort((a: any, b: any) => 
            (b.voteCount || 0) - (a.voteCount || 0)
          ).slice(0, 10);
          setTopSongs(sorted);
        }
      } catch (error) {}
    };
    
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws]);

  const songs = topSongs.length > 0 ? topSongs : (propSongs || []).slice(0, 10);
  const [showRankChange, setShowRankChange] = useState<{[key: number]: 'up' | 'down' | null}>({});
  const [showFirework, setShowFirework] = useState<{[key: number]: boolean}>({});
  const rankChangeTimeoutRef = useRef<{[key: number]: NodeJS.Timeout}>({});
  const fireWorkTimeoutRef = useRef<{[key: number]: NodeJS.Timeout}>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用 useMemo 穩定排序後的歌曲列表
  const sortedSongs = useMemo(() => 
    [...songs].sort((a, b) => 
      ((b as any).voteCount || 0) - ((a as any).voteCount || 0)
    ), [songs]
  );
  
  // 使用穩定的 key 來追蹤歌曲變化
  const songsKey = useMemo(() => 
    sortedSongs.map(s => `${s.id}:${(s as any).voteCount || 0}`).join('|'),
    [sortedSongs]
  );

  // 觸發首名變更時的煙火效果（手機減少粒子數）
  const triggerTopRankConfetti = () => {
    if (!containerRef.current || reduceMotion) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + 100; // 對準第一名位置
    
    confetti({
      particleCount: isMobile ? 30 : 100,
      spread: 70,
      origin: { 
        x: x / window.innerWidth, 
        y: y / window.innerHeight 
      },
      colors: ['#FFD700', '#FFA500', '#FF4500', '#FF6347'],
      zIndex: 1000,
    });
  };

  // 使用 ref 來追蹤前一次的排名和投票
  const prevRanksRef = useRef<{[key: number]: number}>({});
  const prevVotesRef = useRef<{[key: number]: number}>({});
  
  useEffect(() => {
    const newRanks: {[key: number]: number} = {};
    const newRankChanges: {[key: number]: 'up' | 'down' | null} = {};
    const newFireworks: {[key: number]: boolean} = {};
    const newVotes: {[key: number]: number} = {};

    let hasTopRankChanged = false;

    // 找出前一個第一名
    const currentPrevRanks = prevRanksRef.current;
    const currentPrevVotes = prevVotesRef.current;

    sortedSongs.forEach((song, index) => {
      const prevRank = currentPrevRanks[song.id] ?? index;
      const currentVotes = (song as any).voteCount || 0;
      const prevVote = currentPrevVotes[song.id] || 0;
      
      newRanks[song.id] = index;
      newVotes[song.id] = currentVotes;

      // 檢查排名變化（只有在 ref 已有資料時才觸發動畫）
      if (Object.keys(currentPrevRanks).length > 0 && prevRank !== index) {
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
      
      // 檢查是否有新的投票增加（只有在 ref 已有資料時才觸發動畫）
      if (Object.keys(currentPrevVotes).length > 0 && currentVotes > prevVote && prevVote > 0) {
        newFireworks[song.id] = true;
        
        if (fireWorkTimeoutRef.current[song.id]) {
          clearTimeout(fireWorkTimeoutRef.current[song.id]);
        }
        
        fireWorkTimeoutRef.current[song.id] = setTimeout(() => {
          setShowFirework(prev => ({...prev, [song.id]: false}));
        }, 3000);
      }
    });

    // 更新 ref（不會觸發 re-render）
    prevRanksRef.current = newRanks;
    prevVotesRef.current = newVotes;
    
    // 只在有變化時更新 state
    if (Object.keys(newRankChanges).length > 0) {
      setShowRankChange(newRankChanges);
    }
    if (Object.keys(newFireworks).length > 0) {
      setShowFirework(newFireworks);
    }
    
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
  }, [songsKey]);

  const generateGuitarTabsUrl = (song: Song) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} 吉他譜 tab Chordify`);
    return `https://www.google.com/search?q=${searchQuery}`;
  };

  const generateLyricsUrl = (song: Song) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} 歌詞`);
    return `https://www.google.com/search?q=${searchQuery}`;
  };

  // 載入中顯示骨架
  if (isLoading && songs.length === 0) {
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
      {/* 加強版頂部裝飾元素 */}
      <motion.div 
        initial={reduceMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.5 }}
        className="mb-4 relative overflow-hidden rounded-xl p-3 sm:p-4 
                   bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 
                   border-2 border-amber-300/70 shadow-md"
      >
        {/* 背景光效 */}
        <motion.div 
          className="absolute inset-0 z-0 bg-gradient-to-br from-yellow-400/10 via-amber-300/5 to-orange-200/10"
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut"
          }}
          style={{
            backgroundSize: "200% 200%",
            filter: "blur(6px)",
            borderRadius: "inherit",
            transformOrigin: "center",
          }}
        />

        {/* 標題部分 */}
        <div className="text-center relative z-10 flex flex-col items-center">
          {/* 上部的裝飾性圖標 */}
          <div className="flex items-center gap-4 mb-1">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0], 
                scale: [1, 1.1, 1],
                y: [0, -2, 0],
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut",
                times: [0, 0.25, 0.75, 1] 
              }}
              className="relative"
            >
              <Music2 className="h-5 w-5 text-amber-500" />
              <motion.div 
                className="absolute inset-0 bg-amber-400 rounded-full opacity-30"
                animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                style={{ filter: "blur(4px)" }}
              />
            </motion.div>

            <motion.div
              animate={{ 
                rotate: [0, -5, 5, 0], 
                scale: [1, 1.05, 1],
                y: [0, -1, 0],
              }}
              transition={{ 
                duration: 2.5, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 0.3,
                times: [0, 0.35, 0.65, 1] 
              }}
              className="relative"
            >
              <Trophy className="h-6 w-6 text-yellow-500" />
              <motion.div 
                className="absolute inset-0 bg-yellow-400 rounded-full opacity-30"
                animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                style={{ filter: "blur(4px)" }}
              />
            </motion.div>

            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0], 
                scale: [1, 1.08, 1],
                y: [0, -2, 0],
              }}
              transition={{ 
                duration: 3.5, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: 0.5,
                times: [0, 0.4, 0.7, 1] 
              }}
              className="relative"
            >
              <Flame className="h-5 w-5 text-orange-500" />
              <motion.div 
                className="absolute inset-0 bg-orange-400 rounded-full opacity-30"
                animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                style={{ filter: "blur(4px)" }}
              />
            </motion.div>
          </div>
          
          {/* 主標題 */}
          <motion.div
            className="relative z-10 mt-1 mb-1"
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.h2
              className="inline-block font-bold text-lg sm:text-xl text-transparent bg-clip-text 
                         bg-gradient-to-r from-amber-800 via-yellow-600 to-amber-700 px-1"
              animate={{ 
                backgroundPosition: ['0% center', '100% center', '0% center'],
                scale: [1, 1.02, 1], 
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity, 
                ease: "linear",
                times: [0, 0.5, 1]
              }}
              style={{ backgroundSize: '200% auto' }}
            >
              🔥 熱門歌曲排行榜 🔥
            </motion.h2>
            
            {/* 下劃線裝飾 */}
            <motion.div
              className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full 
                         bg-gradient-to-r from-transparent via-amber-500 to-transparent" 
              animate={{ 
                scaleX: [0.3, 1, 0.3], 
                opacity: [0.3, 0.8, 0.3],
                x: [-5, 5, -5]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut",
                times: [0, 0.5, 1] 
              }}
            />
          </motion.div>
          
          {/* 副標題 */}
          <motion.p
            className="text-xs sm:text-sm text-amber-800/80 mt-1 mb-0.5 italic font-medium"
            animate={{ opacity: [0.7, 0.9, 0.7] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            最受歡迎的點播歌曲實時排名
          </motion.p>
        </div>
        
        {/* 裝飾性音符泡泡 */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute pointer-events-none"
            initial={{ 
              x: `${10 + (i * 15)}%`,
              y: "100%", 
              scale: 0.3 + (i % 3 * 0.1),
              opacity: 0 
            }}
            animate={{ 
              y: ["100%", "10%", "-20%"], 
              opacity: [0, i % 2 === 0 ? 0.4 : 0.3, 0],
              rotate: [0, 10 * (i % 2 ? 1 : -1), 0],
              x: [`${10 + (i * 15)}%`, `${8 + (i * 15) + (i % 3 - 1) * 5}%`, `${10 + (i * 15) + (i % 2 ? 3 : -3)}%`]
            }}
            transition={{
              duration: 3 + (i % 3),
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut"
            }}
          >
            {i % 6 === 0 ? <Music className="text-amber-400/60" size={13} /> : 
             i % 6 === 1 ? <Mic className="text-orange-400/60" size={12} /> : 
             i % 6 === 2 ? <Music2 className="text-yellow-500/60" size={14} /> : 
             i % 6 === 3 ? <Headphones className="text-amber-500/60" size={12} /> : 
             i % 6 === 4 ? <Sparkles className="text-yellow-600/60" size={11} /> : 
             <Heart className="text-orange-500/60" size={11} />}
          </motion.div>
        ))}
        
        {/* 裝飾性光芒 */}
        <motion.div 
          className="absolute top-1/2 left-0 w-24 h-24 -translate-y-1/2 pointer-events-none"
          animate={{ opacity: [0.1, 0.3, 0.1], rotate: [0, 20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "radial-gradient(circle, rgba(251, 191, 36, 0.2), transparent 70%)",
            filter: "blur(12px)",
            borderRadius: "50%"
          }}
        />
        
        <motion.div 
          className="absolute top-1/2 right-0 w-24 h-24 -translate-y-1/2 pointer-events-none"
          animate={{ opacity: [0.1, 0.25, 0.1], rotate: [0, -20, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          style={{
            background: "radial-gradient(circle, rgba(251, 191, 36, 0.2), transparent 70%)",
            filter: "blur(12px)",
            borderRadius: "50%"
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
                {/* 歌曲標題 */}
                <motion.div
                  className="relative"
                  animate={{ 
                    scale: showRankChange[song.id] ? [1, 1.02, 1] : 1
                  }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.h3 
                    className={cn(
                      "font-semibold truncate text-sm sm:text-base relative z-10",
                      index === 0 ? "text-amber-700 sm:text-base" :
                      index === 1 ? "text-gray-700" :
                      index === 2 ? "text-orange-700" :
                      showRankChange[song.id] === 'up' ? "text-green-600" : 
                      showRankChange[song.id] === 'down' ? "text-red-600" : "text-gray-900"
                    )}
                  >
                    {song.title}
                    
                    {/* 熱門和排名變化標籤 */}
                    <div className="inline-flex items-center">
                      {index === 0 && (
                        <motion.div 
                          className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-200"
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Flame className="w-3 h-3 text-amber-500 mr-0.5" />
                          <span className="text-xs font-medium text-amber-700">熱門</span>
                        </motion.div>
                      )}
                      
                      {/* 新增的歌曲標籤，可根據特定條件顯示 */}
                      {song.createdAt && new Date(song.createdAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 && (
                        <motion.div 
                          className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-100"
                        >
                          <Zap className="w-3 h-3 text-blue-500 mr-0.5" />
                          <span className="text-xs font-medium text-blue-700">新歌</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.h3>
                  
                  {/* 特效裝飾，僅限前三名歌曲 */}
                  {index < 3 && (
                    <motion.div 
                      className={`absolute bottom-0 left-0 h-0.5 rounded-full
                                ${index === 0 ? 'bg-amber-400' : 
                                  index === 1 ? 'bg-gray-400' : 
                                  'bg-orange-400'}`}
                      initial={{ width: "0%" }}
                      animate={{ 
                        width: ["0%", "60%", "30%"],
                        opacity: [0, 0.7, 0]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity, 
                        ease: "easeInOut",
                        delay: index * 0.5,
                        times: [0, 0.6, 1]
                      }}
                      style={{
                        filter: "blur(0.5px)"
                      }}
                    />
                  )}
                </motion.div>
                
                {/* 歌手名稱 */}
                <div className="relative">
                  <p className={cn(
                    "text-xs sm:text-sm truncate",
                    index < 3 ? "font-medium" : "text-muted-foreground"
                  )}>
                    {song.artist}
                  </p>
                  
                  {/* 首位歌手名稱下方微光效果 */}
                  {index === 0 && (
                    <motion.div 
                      className="absolute -bottom-0.5 left-0 w-full h-0.5 bg-gradient-to-r from-amber-200/0 via-amber-300/30 to-amber-200/0"
                      animate={{ 
                        opacity: [0, 0.5, 0],
                        width: ["0%", "80%", "0%"]
                      }}
                      transition={{ 
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{ filter: "blur(1px)", transformOrigin: "left center" }}
                    />
                  )}
                </div>
              </div>
              
              {/* 移動裝置上的點擊數顯示（當螢幕小於sm時顯示） */}
              <div className="flex items-center gap-1 sm:hidden ml-auto mr-2 my-1">
                <motion.div
                  className="relative"
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
                  {/* 發光背景 - 僅在有票數的情況下顯示 */}
                  {(song as any).voteCount > 0 && (
                    <motion.div 
                      className={`absolute -inset-1 rounded-full opacity-70 pointer-events-none
                                 ${index === 0 ? 'bg-yellow-400/20' : 
                                   index === 1 ? 'bg-gray-400/20' : 
                                   index === 2 ? 'bg-orange-400/20' : 'bg-blue-400/20'}`}
                      animate={{ 
                        scale: [0.8, 1.2, 0.8],
                        opacity: [0.1, 0.25, 0.1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{ filter: "blur(4px)" }}
                    />
                  )}
                  
                  {/* 數字顯示 */}
                  <motion.span
                    className={`
                      text-base font-bold relative z-10
                      ${index === 0 ? 'text-amber-600' : 
                        index === 1 ? 'text-slate-600' : 
                        index === 2 ? 'text-orange-600' : 'text-primary'}
                    `}
                    animate={{ 
                      y: showRankChange[song.id] ? [-2, 0] : 0
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {(song as any).voteCount || 0}
                  </motion.span>
                </motion.div>
                <span className={`
                  text-xs
                  ${index === 0 ? 'text-amber-700/70' : 
                    index === 1 ? 'text-slate-700/70' : 
                    index === 2 ? 'text-orange-700/70' : 'text-muted-foreground'}
                `}>
                  點播
                </span>
              </div>

              {/* 桌面版的操作區塊 */}
              <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                {/* 桌面版的票數顯示（僅在sm及更大的螢幕上顯示） */}
                <motion.div 
                  className={`
                    text-right hidden sm:block mr-2 relative
                    ${index < 3 ? 'pr-1' : ''}
                  `}
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
                  {/* 背景發光效果 - 只有前三名和有票數時顯示 */}
                  {index < 3 && (song as any).voteCount > 0 && (
                    <motion.div 
                      className={`
                        absolute -inset-2 rounded-full pointer-events-none
                        ${index === 0 ? 'bg-yellow-400/15' : 
                          index === 1 ? 'bg-gray-400/15' : 
                          'bg-orange-400/15'}
                      `}
                      animate={{ 
                        scale: [0.8, 1.1, 0.8],
                        opacity: [0.1, 0.3, 0.1]
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{ filter: "blur(5px)" }}
                    />
                  )}
                  
                  <motion.span 
                    className={`
                      text-xl font-bold block relative z-10
                      ${index === 0 ? 'text-amber-600' : 
                        index === 1 ? 'text-slate-600' : 
                        index === 2 ? 'text-orange-600' : 'text-primary'}
                    `}
                    animate={{ 
                      y: showRankChange[song.id] ? [-4, 0] : 0
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {(song as any).voteCount || 0}
                    
                    {/* 數字閃爍效果 - 只在數字大於0時顯示 */}
                    {(song as any).voteCount > 0 && index < 3 && (
                      <motion.div
                        className={`
                          absolute top-0 right-0 rounded-full w-1 h-1
                          ${index === 0 ? 'bg-yellow-400' : 
                            index === 1 ? 'bg-gray-400' : 
                            'bg-orange-400'}
                        `}
                        animate={{ 
                          opacity: [0.4, 1, 0.4],
                          scale: [1, 1.5, 1]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: index * 0.3
                        }}
                      />
                    )}
                  </motion.span>
                  
                  <motion.p 
                    className={`
                      text-xs mt-0.5 relative z-10
                      ${index === 0 ? 'text-amber-700/70' : 
                        index === 1 ? 'text-slate-700/70' : 
                        index === 2 ? 'text-orange-700/70' : 'text-muted-foreground'}
                    `}
                    animate={{ 
                      y: showRankChange[song.id] ? [-2, 0] : 0
                    }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    點播次數
                  </motion.p>
                </motion.div>

                {/* 操作按鈕 - 增強版 */}
                <div className="flex gap-1 sm:gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ 
                            scale: 1.1,
                            rotate: [0, 5, -5, 0],
                            transition: { 
                              scale: { duration: 0.2 },
                              rotate: { duration: 0.4, repeat: Infinity } 
                            }
                          }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            className={`
                              w-8 h-8 sm:w-9 sm:h-9 relative z-10 overflow-hidden
                              border-amber-200 hover:border-amber-400
                              ${index < 2 ? 'bg-gradient-to-br from-amber-50 to-yellow-100' : ''}
                            `}
                            asChild
                          >
                            <a
                              href={generateGuitarTabsUrl(song)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center relative"
                            >
                              {/* 按鈕光暈/發光效果 */}
                              <motion.div 
                                className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-yellow-300/10 to-amber-100/30 pointer-events-none"
                                animate={{
                                  backgroundPosition: ['0% 0%', '100% 100%'],
                                }}
                                transition={{
                                  duration: 3,
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                  ease: "easeInOut"
                                }}
                                style={{
                                  backgroundSize: "200% 200%",
                                  opacity: 0.6,
                                }}
                              />

                              {/* 懸停時的光芒 */}
                              <motion.div 
                                className="absolute inset-0 opacity-0 transition-opacity hover:opacity-100"
                                style={{
                                  background: "radial-gradient(circle at center, rgba(251, 191, 36, 0.4) 0%, transparent 70%)",
                                }}
                              />

                              <Music2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700 relative z-10" />
                            </a>
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="font-medium text-amber-950 bg-amber-50 border-amber-200">
                        <div className="flex items-center gap-1.5">
                          <Music2 className="w-4 h-4 text-amber-600" />
                          <p>搜尋「{song.title} - {song.artist}」的吉他譜</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ 
                            scale: 1.1,
                            y: [0, -2, 0],
                            transition: { 
                              scale: { duration: 0.2 },
                              y: { duration: 0.3, repeat: Infinity, repeatType: "mirror" } 
                            }
                          }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            className={`
                              w-8 h-8 sm:w-9 sm:h-9 relative z-10 overflow-hidden
                              border-rose-200 hover:border-rose-400
                              ${index < 2 ? 'bg-gradient-to-br from-rose-50 to-pink-100' : ''}
                            `}
                            asChild
                          >
                            <a
                              href={generateLyricsUrl(song)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center relative"
                            >
                              {/* 按鈕光暈/發光效果 */}
                              <motion.div 
                                className="absolute inset-0 bg-gradient-to-br from-rose-200/20 via-pink-300/10 to-rose-100/30 pointer-events-none"
                                animate={{
                                  backgroundPosition: ['0% 0%', '100% 100%'],
                                }}
                                transition={{
                                  duration: 3.5,
                                  repeat: Infinity,
                                  repeatType: "reverse",
                                  ease: "easeInOut"
                                }}
                                style={{
                                  backgroundSize: "200% 200%",
                                  opacity: 0.6,
                                }}
                              />
                              
                              {/* 懸停時的光芒 */}
                              <motion.div 
                                className="absolute inset-0 opacity-0 transition-opacity hover:opacity-100"
                                style={{
                                  background: "radial-gradient(circle at center, rgba(244, 114, 182, 0.3) 0%, transparent 70%)",
                                }}
                              />

                              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-rose-700 relative z-10" />
                            </a>
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="font-medium text-rose-950 bg-rose-50 border-rose-200">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-rose-600" />
                          <p>搜尋「{song.title} - {song.artist}」的歌詞</p>
                        </div>
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