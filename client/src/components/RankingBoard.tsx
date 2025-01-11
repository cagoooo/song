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

interface RankingBoardProps {
  songs: Song[];
}

export default function RankingBoard({ songs }: RankingBoardProps) {
  const sortedSongs = [...songs].sort((a, b) =>
    ((b as any).voteCount || 0) - ((a as any).voteCount || 0)
  );

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
        <AnimatePresence>
          {sortedSongs.map((song, index) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className={`
                flex items-center gap-4 p-4 rounded-lg border
                ${index === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-100 border-yellow-300' :
                  index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-100 border-gray-300' :
                  index === 2 ? 'bg-gradient-to-r from-orange-50 to-rose-100 border-orange-300' :
                  'bg-gradient-to-r from-white to-gray-50'}
              `}
            >
              <div className="relative flex items-center justify-center w-10 h-10">
                {index === 0 && <Crown className="w-5 h-5 text-amber-500" />}
                {index === 1 && <Award className="w-5 h-5 text-gray-500" />}
                {index === 2 && <Trophy className="w-5 h-5 text-orange-500" />}
                {index > 2 && <span className="text-sm font-medium text-gray-600">{index + 1}</span>}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{song.title}</h3>
                <p className="text-sm text-muted-foreground">{song.artist}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-lg font-bold text-primary">
                    {(song as any).voteCount || 0}
                  </span>
                  <p className="text-xs text-muted-foreground">點播</p>
                </div>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>搜尋「{song.title} - {song.artist}」的吉他譜</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
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