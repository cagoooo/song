import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Crown, Award } from "lucide-react";
import type { Song } from "@db/schema";
import { motion, AnimatePresence } from "framer-motion";

interface RankingBoardProps {
  songs: Song[];
}

export default function RankingBoard({ songs }: RankingBoardProps) {
  // Sort songs by vote count
  const sortedSongs = [...songs].sort((a, b) => 
    ((b as any).voteCount || 0) - ((a as any).voteCount || 0)
  );

  return (
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
                ${index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-lg' : 
                  index === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200' :
                  index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' : 'bg-card'}
              `}
            >
              <div className="relative flex items-center justify-center w-10 h-10">
                {index < 3 ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500 }}
                    className={`absolute inset-0 rounded-full ${
                      index === 0 ? 'bg-yellow-100' :
                      index === 1 ? 'bg-gray-100' : 'bg-orange-100'
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
                      <Crown className="w-5 h-5 text-yellow-500" />
                    ) : index === 1 ? (
                      <Award className="w-5 h-5 text-gray-500" />
                    ) : (
                      <Trophy className="w-5 h-5 text-orange-500" />
                    )}
                  </motion.div>
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold bg-gradient-to-r from-primary/90 to-purple-600/90 bg-clip-text text-transparent">
                  {song.title}
                </h3>
                <p className="text-sm text-muted-foreground">{song.artist}</p>
              </div>

              <motion.div 
                className="text-right"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <span className="text-lg font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  {(song as any).voteCount || 0}
                </span>
                <p className="text-xs text-muted-foreground">votes</p>
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}