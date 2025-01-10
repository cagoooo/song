import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy } from "lucide-react";
import type { Song } from "@db/schema";

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
        {sortedSongs.map((song, index) => (
          <div 
            key={song.id}
            className={`
              flex items-center gap-4 p-4 rounded-lg border
              ${index === 0 ? 'bg-yellow-50 border-yellow-200' : 
                index === 1 ? 'bg-gray-50 border-gray-200' :
                index === 2 ? 'bg-orange-50 border-orange-200' : 'bg-card'}
            `}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              {index < 3 ? (
                <Trophy className={`w-4 h-4 ${
                  index === 0 ? 'text-yellow-500' :
                  index === 1 ? 'text-gray-500' : 'text-orange-500'
                }`} />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>

            <div className="flex-1">
              <h3 className="font-semibold">{song.title}</h3>
              <p className="text-sm text-muted-foreground">{song.artist}</p>
            </div>

            <div className="text-right">
              <span className="text-lg font-bold text-primary">
                {(song as any).voteCount || 0}
              </span>
              <p className="text-xs text-muted-foreground">votes</p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
