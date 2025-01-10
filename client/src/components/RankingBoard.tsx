import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Crown, Award } from "lucide-react";
import type { Song } from "@db/schema";
import { motion, AnimatePresence } from "framer-motion";

interface RankingBoardProps {
  songs: Song[];
}

export default function RankingBoard({ songs }: RankingBoardProps) {
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
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}