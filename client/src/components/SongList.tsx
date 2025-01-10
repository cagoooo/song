import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, ThumbsUp } from "lucide-react";
import type { Song } from "@db/schema";

interface SongListProps {
  songs: Song[];
  ws: WebSocket;
}

export default function SongList({ songs, ws }: SongListProps) {
  const voteForSong = (songId: number) => {
    ws.send(JSON.stringify({ type: 'VOTE', songId }));
  };

  return (
    <ScrollArea className="h-[500px] w-full pr-4">
      <div className="space-y-4">
        {songs.map((song) => (
          <div key={song.id} className="flex items-center justify-between p-4 bg-card rounded-lg border">
            <div>
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">{song.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{song.artist}</p>
              {song.key && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  Key: {song.key}
                </span>
              )}
            </div>
            
            <Button 
              variant="outline"
              size="sm"
              onClick={() => voteForSong(song.id)}
              className="flex gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              Vote
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
