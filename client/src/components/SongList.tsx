import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, ThumbsUp, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Song, User } from "@db/schema";

interface SongListProps {
  songs: Song[];
  ws: WebSocket | null;
  user: User | null;
}

export default function SongList({ songs, ws, user }: SongListProps) {
  const { toast } = useToast();

  const voteForSong = (songId: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'VOTE', songId }));
    }
  };

  const deleteSong = async (songId: number) => {
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete song');
      }

      toast({
        title: "成功",
        description: "歌曲已刪除",
      });
    } catch (error) {
      toast({
        title: "錯誤",
        description: "無法刪除歌曲",
        variant: "destructive"
      });
    }
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
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded mt-1 inline-block">
                  Key: {song.key}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => voteForSong(song.id)}
                className="flex gap-2"
              >
                <ThumbsUp className="h-4 w-4" />
                投票
              </Button>

              {user?.isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteSong(song.id)}
                  className="flex gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  刪除
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}