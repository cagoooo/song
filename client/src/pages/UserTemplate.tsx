import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Song } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music2, Trophy, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SongList from "../components/SongList";
import RankingBoard from "../components/RankingBoard";
import SongSuggestion from "../components/SongSuggestion";
import { ShareButton } from "../components/ShareButton";
import { useToast } from "@/hooks/use-toast";

export default function UserTemplate() {
  const { username } = useParams();
  const [songs, setSongs] = useState<Song[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const prevSongsRef = useRef<Song[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // 獲取使用者
  const { data: user, isLoading } = useQuery({
    queryKey: [`/api/users/${username}`],
    enabled: !!username,
  });

  // 獲取歌曲
  useQuery({
    queryKey: ['/api/songs'],
    queryFn: async () => {
      const response = await fetch('/api/songs', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch songs');
      const data = await response.json();

      // 在更新狀態前保存前一個狀態，用於動畫比較
      prevSongsRef.current = songs;
      setSongs(data.map((song: any) => ({
        ...song,
        prevVoteCount: (prevSongsRef.current.find(s => s.id === song.id) as any)?.voteCount || 0
      })));
      return data;
    },
    retry: 1
  });

  // WebSocket連接
  useEffect(() => {
    function setupWebSocket() {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws`;

        console.log('Connecting to WebSocket:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);
            if (data.type === 'SONGS_UPDATE') {
              // 更新歌曲時保存前一個狀態，用於動畫比較
              prevSongsRef.current = songs;
              setSongs(data.songs.map((song: any) => ({
                ...song,
                prevVoteCount: (prevSongsRef.current.find(s => s.id === song.id) as any)?.voteCount || 0
              })));
            } else if (data.type === 'ERROR') {
              toast({
                title: "錯誤",
                description: data.message,
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('WebSocket message parsing error:', error);
          }
        };

        ws.onopen = () => {
          console.log('WebSocket connection established');
          setIsWebSocketConnected(true);
          reconnectAttempts.current = 0;
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed');
          setIsWebSocketConnected(false);

          // 檢查重連次數
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current += 1;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectTimeoutRef.current = setTimeout(setupWebSocket, delay);
          } else {
            toast({
              title: "連接中斷",
              description: "無法連接到伺服器，請重新整理頁面",
              variant: "destructive"
            });
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsWebSocketConnected(false);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };

      } catch (error) {
        console.error('WebSocket connection error:', error);
        setIsWebSocketConnected(false);

        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(setupWebSocket, delay);
        } else {
          toast({
            title: "連接錯誤",
            description: "無法建立連接，請重新整理頁面",
            variant: "destructive"
          });
        }
      }
    }

    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [toast, songs]);

  // 載入動畫
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  // 找不到用戶的情況
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-center">
              找不到該使用者
            </h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
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
                  <SongSuggestion isAdmin={false} />
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
                  <div className="h-4" />
                  <SongList 
                    songs={songs} 
                    ws={wsRef.current} 
                    user={null} 
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