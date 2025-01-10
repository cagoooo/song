import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SongList from "@/components/SongList";
import SongImport from "@/components/SongImport";
import RankingBoard from "@/components/RankingBoard";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import type { Song } from "@db/schema";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import LoginForm from "@/components/LoginForm";

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const { user, logout } = useUser();

  const { isLoading } = useQuery<Song[]>({
    queryKey: ['/api/songs'],
    queryFn: async () => {
      const response = await fetch('/api/songs', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch songs');
      return response.json();
    },
    onSuccess: (data) => setSongs(data),
    onError: () => {
      toast({
        title: "錯誤",
        description: "無法載入歌曲清單",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    // Create WebSocket connection with protocol matching the current page
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsRef.current = new WebSocket(`${protocol}//${window.location.host}/ws`);

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

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [toast]);

  const handleLogout = async () => {
    try {
      await logout();
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            吉他彈唱點歌系統
          </h1>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user.isAdmin ? '管理員' : '使用者'}: {user.username}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                登出
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowLoginForm(true)}>
              <LogIn className="w-4 h-4 mr-2" />
              登入
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>歌曲管理</CardTitle>
            </CardHeader>
            <CardContent>
              {user?.isAdmin && <SongImport />}
              <div className="h-4" />
              <SongList songs={songs} ws={wsRef.current} user={user} />
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

      {showLoginForm && (
        <LoginForm onClose={() => setShowLoginForm(false)} />
      )}
    </div>
  );
}