import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import type { Song, User } from "@db/schema";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Music2, Trophy, Lightbulb } from "lucide-react";
import SongList from "../components/SongList";
import SongImport from "../components/SongImport";
import RankingBoard from "../components/RankingBoard";
import LoginForm from "../components/LoginForm";
import SongSuggestion from "../components/SongSuggestion";
import { ShareButton } from "../components/ShareButton";

export interface SongInfo {
  title: string;
  artist: string;
}

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [importSongInfo, setImportSongInfo] = useState<SongInfo | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const { user, logout } = useUser();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
  const reconnectAttemptRef = useRef(0);

  const { isLoading } = useQuery({
    queryKey: ['/api/songs'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/songs', {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch songs');
        const data = await response.json();
        setSongs(data);
        return data;
      } catch (error) {
        console.error('Error fetching songs:', error);
        toast({
          title: "錯誤",
          description: "無法載入歌曲清單",
          variant: "destructive"
        });
        throw error;
      }
    },
    retry: 1
  });

  const setupWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    if (reconnectAttemptRef.current >= maxReconnectAttempts) {
      toast({
        title: "連線錯誤",
        description: "無法連接到伺服器，請重新整理頁面",
        variant: "destructive"
      });
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SONGS_UPDATE' && Array.isArray(data.songs)) {
            setSongs(data.songs);
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      ws.onopen = () => {
        console.log('WebSocket connection established');
        setWsConnected(true);
        reconnectAttemptRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setWsConnected(false);
        wsRef.current = null;
        reconnectAttemptRef.current += 1;

        if (reconnectAttemptRef.current < maxReconnectAttempts) {
          toast({
            title: "連線中斷",
            description: "正在嘗試重新連線...",
          });
          reconnectTimeoutRef.current = setTimeout(setupWebSocket, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      reconnectAttemptRef.current += 1;
      if (reconnectAttemptRef.current < maxReconnectAttempts) {
        reconnectTimeoutRef.current = setTimeout(setupWebSocket, 3000);
      }
    }
  }, [toast]);

  useEffect(() => {
    setupWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsConnected(false);
      reconnectAttemptRef.current = 0;
    };
  }, [setupWebSocket]);

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
      console.error('Logout error:', error);
      toast({
        title: "錯誤",
        description: "登出失敗",
        variant: "destructive"
      });
    }
  };

  const handleImportSong = (songInfo: SongInfo) => {
    setImportSongInfo(songInfo);
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
                  onImportSong={handleImportSong}
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
                {user?.isAdmin && <SongImport importSongInfo={importSongInfo} />}
                <div className="h-4" />
                <SongList 
                  songs={songs} 
                  ws={wsConnected ? wsRef.current : null} 
                  user={user as User | null} 
                />
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