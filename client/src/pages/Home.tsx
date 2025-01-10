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
import { motion, AnimatePresence } from "framer-motion";
import SongSuggestion from "../components/SongSuggestion";

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <Music2 className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto py-4 sm:py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 sm:mb-8"
        >
          <div 
            className="relative p-2 rounded-lg border-2 border-primary/50 bg-white/50 backdrop-blur-sm
                     shadow-[0_0_15px_rgba(var(--primary),0.3)]
                     animate-[shadow-pulse_3s_ease-in-out_infinite]
                     w-full sm:w-auto"
          >
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent
                        px-4 py-2 text-center sm:text-left">
              吉他彈唱點歌系統
            </h1>
            <div className="absolute inset-0 rounded-lg border-2 border-primary/20
                        animate-[border-pulse_3s_ease-in-out_infinite_0.5s]" />
          </div>

          {user ? (
            <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
              <span className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary">
                {user.isAdmin ? '管理員' : '使用者'}: {user.username}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                登出
              </Button>
            </div>
          ) : null}
        </motion.div>

        <AnimatePresence>
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
            layout
            transition={{
              layout: { duration: 0.3 },
            }}
          >
            {/* 歌曲建議區塊 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <Card className="shadow-lg bg-gradient-to-br from-amber-50/50 via-white to-amber-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="w-6 h-6 text-amber-500" />
                    想聽的歌還沒有？
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SongSuggestion isAdmin={user?.isAdmin ?? false} />
                </CardContent>
              </Card>
            </motion.div>

            {/* 歌曲列表區塊 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="lg:col-span-2"
            >
              <Card className="shadow-lg h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music2 className="w-6 h-6 text-primary" />
                    可選歌單
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user?.isAdmin && <SongImport />}
                  <div className="h-4" />
                  <SongList songs={songs} ws={wsRef.current} user={user || null} />
                </CardContent>
              </Card>
            </motion.div>

            {/* 排行榜區塊 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="lg:col-span-1"
            >
              <Card className="shadow-lg h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-primary" />
                    實時排名
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RankingBoard songs={songs} />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {!user && (
        <motion.div 
          className="fixed bottom-4 right-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowLoginForm(true)}
            className="bg-white/50 backdrop-blur-sm"
          >
            <LogIn className="w-4 h-4 mr-2" />
            管理員登入
          </Button>
        </motion.div>
      )}

      {showLoginForm && (
        <LoginForm onClose={() => setShowLoginForm(false)} />
      )}
    </div>
  );
}