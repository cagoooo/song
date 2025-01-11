import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Crown, Award, FileText, Music2 } from "lucide-react";
import type { Song } from "@db/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState, useRef } from "react";

interface RankingBoardProps {
  songs: Song[];
}

export default function RankingBoard({ songs }: RankingBoardProps) {
  const [prevRanks, setPrevRanks] = useState<{[key: number]: number}>({});
  const [showRankChange, setShowRankChange] = useState<{[key: number]: 'up' | 'down' | null}>({});
  const rankChangeTimeoutRef = useRef<{[key: number]: NodeJS.Timeout}>({});

  // 排序歌曲並追蹤排名變化
  const sortedSongs = [...songs].sort((a, b) => 
    ((b as any).voteCount || 0) - ((a as any).voteCount || 0)
  );

  useEffect(() => {
    const newRanks: {[key: number]: number} = {};
    const newRankChanges: {[key: number]: 'up' | 'down' | null} = {};

    sortedSongs.forEach((song, index) => {
      const prevRank = prevRanks[song.id] ?? index;
      newRanks[song.id] = index;

      if (prevRank !== index) {
        newRankChanges[song.id] = prevRank > index ? 'up' : 'down';

        // Clear existing timeout
        if (rankChangeTimeoutRef.current[song.id]) {
          clearTimeout(rankChangeTimeoutRef.current[song.id]);
        }

        // Set new timeout to clear rank change indicator
        rankChangeTimeoutRef.current[song.id] = setTimeout(() => {
          setShowRankChange(prev => ({
            ...prev,
            [song.id]: null
          }));
        }, 2000);
      }
    });

    setPrevRanks(newRanks);
    setShowRankChange(newRankChanges);

    // Cleanup timeouts
    return () => {
      Object.values(rankChangeTimeoutRef.current).forEach(timeout => {
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
    <ScrollArea className="h-[500px] w-full pr-4">
      <div className="space-y-4">
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
                flex items-center gap-4 p-4 rounded-lg border
                ${index === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-100 border-yellow-300' :
                  index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-100 border-gray-300' :
                  index === 2 ? 'bg-gradient-to-r from-orange-50 to-rose-100 border-orange-300' :
                  'bg-gradient-to-r from-white to-gray-50 border-gray-200'}
                transform transition-all duration-300
                ${showRankChange[song.id] === 'up' ? 'shadow-lg shadow-green-100 scale-[1.02]' : 
                  showRankChange[song.id] === 'down' ? 'shadow-lg shadow-red-100 scale-[0.98]' : ''}
              `}
            >
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

              <div className="flex-1 min-w-0">
                <motion.h3 
                  className="font-semibold text-gray-900 truncate"
                  animate={{ 
                    scale: showRankChange[song.id] ? [1, 1.02, 1] : 1,
                    color: showRankChange[song.id] === 'up' ? ['#111827', '#059669', '#111827'] : 
                           showRankChange[song.id] === 'down' ? ['#111827', '#DC2626', '#111827'] : '#111827'
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {song.title}
                </motion.h3>
                <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
              </div>

              <div className="flex items-center gap-2">
                <motion.div 
                  className="text-right"
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
                          className="w-8 h-8"
                          asChild
                        >
                          <a
                            href={generateGuitarTabsUrl(song)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Music2 className="w-4 h-4" />
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
                          className="w-8 h-8"
                          asChild
                        >
                          <a
                            href={generateLyricsUrl(song)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="w-4 h-4" />
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}