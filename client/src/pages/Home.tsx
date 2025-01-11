import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import type { Song } from "@db/schema";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Music2, Trophy, Lightbulb } from "lucide-react";
import SongList from "../components/SongList";
import SongImport from "../components/SongImport";
import RankingBoard from "../components/RankingBoard";
import LoginForm from "../components/LoginForm";
import SongSuggestion from "../components/SongSuggestion";
import { ShareButton } from "../components/ShareButton";

interface ImportSongInfo {
  title: string;
  artist: string;
}

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [importSongInfo, setImportSongInfo] = useState<ImportSongInfo | null>(null);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const { user, logout } = useUser();

  const { isLoading } = useQuery({
    queryKey: ['/api/songs'],
    queryFn: async () => {
      const response = await fetch('/api/songs', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch songs');
      const data = await response.json();
      setSongs(data);
      return data;
    },
    retry: 1
  });

  useEffect(() => {
    function setupWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        console.log('Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            if (data.type === 'SONGS_UPDATE') {
              setSongs(data.songs);
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error);
          }
        };

        ws.onopen = () => {
          console.log('WebSocket connection established');
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed');
          toast({
            title: "連線中斷",
            description: "正在嘗試重新連線...",
            variant: "destructive"
          });
          setTimeout(setupWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('WebSocket connection error:', error);
        setTimeout(setupWebSocket, 3000);
      }
    }

    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [toast]);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (!result.ok) {
        toast({
          title: "錯誤",
          description: "登出失敗",
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "成功",
        description: "已登出",
      });
    } catch (error) {
      toast({
        title: "錯誤",
        description: "登出失敗",
        variant: "destructive"
      });
    }
  };

  const handleImportSongInfo = (songInfo: ImportSongInfo) => {
    setImportSongInfo(songInfo);
    toast({
      title: "成功",
      description: "歌曲資訊已匯入",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Music2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 sm:py-8 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl sm:text-4xl font-bold">吉他彈唱點歌系統</h1>
            <ShareButton />
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user.isAdmin ? '管理員' : '使用者'}: {user.username}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                登出
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  想聽的歌還沒有？
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SongSuggestion 
                  isAdmin={user?.isAdmin ?? false} 
                  onImportSongInfo={handleImportSongInfo}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="w-5 h-5 text-primary" />
                  可選歌單
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user?.isAdmin && (
                  <SongImport importSongInfo={importSongInfo} />
                )}
                <div className="h-4" />
                <SongList songs={songs} ws={wsRef.current} user={user || null} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  人氣點播排行榜
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RankingBoard songs={songs} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {!user && (
        <div className="fixed bottom-4 right-4">
          <Button variant="outline" size="sm" onClick={() => setShowLoginForm(true)}>
            <LogIn className="w-4 h-4 mr-2" />
            管理員登入
          </Button>
        </div>
      )}

      {showLoginForm && (
        <LoginForm onClose={() => setShowLoginForm(false)} />
      )}
    </div>
  );
}