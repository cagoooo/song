import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Crown, Award, FileText } from "lucide-react";
import type { Song } from "@db/schema";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface RankingBoardProps {
  songs: Song[];
}

export default function RankingBoard({ songs }: RankingBoardProps) {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const sortedSongs = [...songs].sort((a, b) => 
    ((b as any).voteCount || 0) - ((a as any).voteCount || 0)
  );

  // 解析歌詞時間軸
  const parsedLyrics = selectedSong?.lyrics
    ? selectedSong.lyrics
        .split('\n')
        .map(line => {
          const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
          if (match) {
            const [, minutes, seconds, milliseconds, text] = match;
            return text.trim();
          }
          return line.trim();
        })
        .filter(line => line)
    : [];

  return (
    <>
      <ScrollArea className="h-[500px] w-full pr-4">
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {sortedSongs.map((song, index) => (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 1,
                }}
                className={`
                  flex items-center gap-4 p-4 rounded-lg border transform transition-colors duration-300
                  ${index === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-100 border-yellow-300 shadow-[0_4px_12px_rgba(234,179,8,0.2)]' : 
                    index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-100 border-gray-300 shadow-[0_4px_12px_rgba(107,114,128,0.15)]' :
                    index === 2 ? 'bg-gradient-to-r from-orange-50 to-rose-100 border-orange-300 shadow-[0_4px_12px_rgba(251,146,60,0.15)]' : 
                    'bg-gradient-to-r from-white to-gray-50 hover:to-gray-100 transition-all duration-300'}
                `}
              >
                <div className="relative flex items-center justify-center w-10 h-10">
                  {index < 3 ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                      className={`absolute inset-0 rounded-full ${
                        index === 0 ? 'bg-gradient-to-br from-amber-100 to-yellow-200' :
                        index === 1 ? 'bg-gradient-to-br from-gray-100 to-slate-200' : 
                        'bg-gradient-to-br from-orange-100 to-rose-200'
                      }`}
                    />
                  ) : null}
                  {index < 3 ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="relative"
                    >
                      {index === 0 ? (
                        <Crown className="w-5 h-5 text-amber-500" />
                      ) : index === 1 ? (
                        <Award className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Trophy className="w-5 h-5 text-orange-500" />
                      )}
                    </motion.div>
                  ) : (
                    <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    index === 0 ? 'bg-gradient-to-r from-amber-600 to-yellow-500' :
                    index === 1 ? 'bg-gradient-to-r from-gray-600 to-slate-500' :
                    index === 2 ? 'bg-gradient-to-r from-orange-600 to-rose-500' :
                    'bg-gradient-to-r from-gray-700 to-gray-600'
                  } bg-clip-text text-transparent`}>
                    {song.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{song.artist}</p>
                </div>

                <div className="flex items-center gap-2">
                  <motion.div 
                    className="text-right"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                  >
                    <span className={`text-lg font-bold ${
                      index === 0 ? 'bg-gradient-to-r from-amber-600 to-yellow-500' :
                      index === 1 ? 'bg-gradient-to-r from-gray-600 to-slate-500' :
                      index === 2 ? 'bg-gradient-to-r from-orange-600 to-rose-500' :
                      'bg-gradient-to-r from-gray-700 to-gray-600'
                    } bg-clip-text text-transparent`}>
                      {(song as any).voteCount || 0}
                    </span>
                    <p className="text-xs text-muted-foreground">點播</p>
                  </motion.div>

                  {song.lyrics && (
                    <Dialog onOpenChange={(open) => !open && setSelectedSong(null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSelectedSong(song)}
                          className="w-8 h-8 border-2 border-primary/20 bg-white/80 hover:bg-white/90
                                   shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                                   hover:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                                   transition-all duration-300"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2 text-lg">
                            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                              {selectedSong?.title}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              - {selectedSong?.artist}
                            </span>
                          </DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[400px] w-full mt-4">
                          <div className="space-y-2 px-4">
                            {parsedLyrics.map((line, index) => (
                              <p
                                key={index}
                                className="text-center text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                              >
                                {line}
                              </p>
                            ))}
                            {parsedLyrics.length === 0 && (
                              <p className="text-center text-sm text-muted-foreground">
                                這首歌還沒有歌詞...
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </>
  );
}