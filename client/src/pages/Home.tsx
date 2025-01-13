import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useQuery } from "@tanstack/react-query";
import type { Song } from "@db/schema";
import { Button } from "@/components/ui/button";
import { LogOut, Music2, Trophy, Lightbulb, Settings } from "lucide-react";
import SongList from "../components/SongList";
import SongImport from "../components/SongImport";
import RankingBoard from "../components/RankingBoard";
import { motion, AnimatePresence } from "framer-motion";
import SongSuggestion from "../components/SongSuggestion";
import { ShareButton } from "../components/ShareButton";
import UserManagement from "../components/UserManagement";

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const { user, logout } = useUser();
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const lastConnectionAttemptRef = useRef(0);
  const lastSongsUpdateRef = useRef<string>("");

  const handleSongUpdate = (newSongs: Song[]) => {
    const newSongsString = JSON.stringify(newSongs);
    if (newSongsString !== lastSongsUpdateRef.current) {
      lastSongsUpdateRef.current = newSongsString;
      setSongs(newSongs);
    }
  };

  const { isLoading } = useQuery({
    queryKey: ['/api/songs'],
    queryFn: async () => {
      const response = await fetch('/api/songs', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch songs');
      const data = await response.json();
      handleSongUpdate(data);
      return data;
    },
    retry: 1
  });

  useEffect(() => {
    let mounted = true;
    let retryTimeoutId: NodeJS.Timeout;

    const setupWebSocket = () => {
      if (!mounted) return;

      const now = Date.now();
      const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;
      const retryDelay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

      if (timeSinceLastAttempt < retryDelay) {
        return;
      }

      if (wsRef.current?.readyState === WebSocket.CONNECTING || 
          wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws`;

        console.log('Connecting to WebSocket:', wsUrl);
        lastConnectionAttemptRef.current = now;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;
          console.log('WebSocket connection established');
          setIsWebSocketConnected(true);
          reconnectAttemptsRef.current = 0;
          ws.send(JSON.stringify({ type: 'PING' }));
        };

        ws.onmessage = (event) => {
          if (!mounted) return;
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            if (data.type === 'SONGS_UPDATE') {
              handleSongUpdate(data.songs);
            } else if (data.type === 'PONG') {
              console.log('Server responded with PONG');
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error);
          }
        };

        ws.onclose = () => {
          if (!mounted) return;
          console.log('WebSocket connection closed');
          setIsWebSocketConnected(false);

          if (reconnectAttemptsRef.current < 5) {
            reconnectAttemptsRef.current += 1;
            console.log(`Attempting to reconnect... (${reconnectAttemptsRef.current}/5)`);
            retryTimeoutId = setTimeout(setupWebSocket, retryDelay);
          } else {
            toast({
              title: "連線中斷",
              description: "無法連接到伺服器，請重新整理頁面",
              variant: "destructive"
            });
          }
        };

        ws.onerror = (error) => {
          if (!mounted) return;
          console.error('WebSocket error:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };

      } catch (error) {
        console.error('WebSocket setup error:', error);
        if (!mounted) return;

        if (reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current += 1;
          retryTimeoutId = setTimeout(setupWebSocket, retryDelay);
        }
      }
    };

    setupWebSocket();

    return () => {
      mounted = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
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
        variant: "default"
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
      <motion.div 
        className="fixed top-4 right-4 z-50 flex gap-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="bg-white/90 hover:bg-white border-2 border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          登出
        </Button>
      </motion.div>

      <div className="container mx-auto py-4 sm:py-8 px-4">
        {/* Title container */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center mb-6 sm:mb-8 md:mb-10 lg:mb-12 px-3 sm:px-4 md:px-6 lg:px-8 w-full"
        >
          <motion.div 
            className="relative p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border-2 border-primary/50 bg-gradient-to-br from-white/95 via-primary/5 to-white/90 backdrop-blur-sm shadow-[0_0_20px_rgba(var(--primary),0.4)] w-full max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-3xl mx-auto overflow-hidden hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all duration-300"
          >
            <motion.h1 
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-black text-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-[length:200%_auto] bg-clip-text text-transparent px-2 sm:px-3 md:px-4 py-2 relative z-10 leading-[1.2] sm:leading-[1.2] md:leading-[1.2] lg:leading-[1.2] animate-text tracking-tight"
            >
              吉他彈唱點歌系統
            </motion.h1>
          </motion.div>

          <motion.div 
            className="mt-4 sm:mt-5 md:mt-6 lg:mt-8 scale-90 sm:scale-95 md:scale-100 lg:scale-105"
          >
            <ShareButton />
          </motion.div>
        </motion.div>

        {/* System Management Section for Admin */}
        {user?.isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  系統管理
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagement />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Rest of the content */}
        <AnimatePresence>
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
            layout
            transition={{
              layout: { duration: 0.3 },
            }}
          >
            {/* Song suggestion section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <Card className="shadow-lg bg-gradient-to-br from-amber-50/50 via-white to-amber-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                    想聽的歌還沒有？
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SongSuggestion isAdmin={user?.isAdmin ?? false} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Song list section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="lg:col-span-2"
            >
              <Card className="shadow-lg h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Music2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    可選歌單
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {user?.isAdmin && <SongImport />}
                  <div className="h-4" />
                  <SongList 
                    songs={songs} 
                    ws={wsRef.current} 
                    user={user}
                    isWebSocketConnected={isWebSocketConnected} 
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Ranking board section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="lg:col-span-1"
            >
              <Card className="shadow-lg h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    人氣點播排行榜
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <RankingBoard songs={songs} />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}