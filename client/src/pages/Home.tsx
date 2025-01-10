import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SongList from "@/components/SongList";
import SongImport from "@/components/SongImport";
import RankingBoard from "@/components/RankingBoard";
import { useToast } from "@/hooks/use-toast";
import type { Song } from "@db/schema";

const ws = new WebSocket(`ws://${window.location.host}/ws`);

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'SONGS_UPDATE') {
        setSongs(data.songs);
      }
    };

    ws.onclose = () => {
      toast({
        title: "Connection lost",
        description: "Trying to reconnect...",
        variant: "destructive"
      });
    };

    return () => ws.close();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Guitar Song Request System
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Song Management</CardTitle>
            </CardHeader>
            <CardContent>
              <SongImport />
              <SongList songs={songs} ws={ws} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <RankingBoard songs={songs} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
