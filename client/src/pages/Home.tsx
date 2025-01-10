import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SongList from "@/components/SongList";
import SongImport from "@/components/SongImport";
import RankingBoard from "@/components/RankingBoard";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { Song } from "@db/schema";

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);

  // Initial data fetch using react-query
  const { isLoading } = useQuery({
    queryKey: ['/api/songs'],
    queryFn: async () => {
      const response = await fetch('/api/songs');
      if (!response.ok) {
        throw new Error('Failed to fetch songs');
      }
      return response.json();
    },
    onError: () => {
      toast({
        title: "錯誤",
        description: "無法載入歌曲清單",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    // Create WebSocket connection
    wsRef.current = new WebSocket(`ws://${window.location.host}/ws`);

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SONGS_UPDATE') {
          setSongs(data.songs);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    wsRef.current.onclose = () => {
      toast({
        title: "連線中斷",
        description: "正在嘗試重新連線...",
        variant: "destructive"
      });
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "連線錯誤",
        description: "無法建立即時連線",
        variant: "destructive"
      });
    };

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          吉他彈唱點歌系統
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>歌曲管理</CardTitle>
            </CardHeader>
            <CardContent>
              <SongImport />
              <div className="h-4" />
              <SongList songs={songs} ws={wsRef.current} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>實時排名</CardTitle>
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