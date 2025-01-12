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
import { ShareButton } from "../components/ShareButton";

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
        variant: "info"
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
          className="flex flex-col items-center justify-center mb-8 sm:mb-12 px-4"
        >
          <motion.div 
            className="relative p-4 sm:p-6 rounded-lg border-2 border-primary/50 bg-white/50 backdrop-blur-sm
                      shadow-[0_0_15px_rgba(var(--primary),0.3)]
                      w-full max-w-3xl mx-auto
                      hover:shadow-[0_0_25px_rgba(var(--primary),0.4)]
                      transition-all duration-300"
            initial={{ scale: 0.95 }}
            animate={{ 
              scale: 1,
              transition: { 
                type: "spring",
                stiffness: 100,
                damping: 15
              }
            }}
            whileHover={{ scale: 1.02 }}
          >
            <motion.h1 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center
                        bg-gradient-to-r from-primary via-purple-600 to-primary
                        bg-clip-text text-transparent
                        px-2 sm:px-4 py-2
                        leading-tight sm:leading-tight md:leading-tight lg:leading-tight
                        relative
                        [text-shadow:0_1px_2px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.1)]
                        sm:[text-shadow:0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.1)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                transition: {
                  duration: 0.8,
                  ease: "easeOut"
                }
              }}
              style={{
                backgroundSize: "200% 100%",
                animation: "gradient 8s linear infinite, shimmer 3s ease-in-out infinite, float 6s ease-in-out infinite"
              }}
            >
              吉他彈唱點歌系統
            </motion.h1>

            <motion.div 
              className="absolute inset-0 rounded-lg border-2 border-primary/20
                        hidden sm:block"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-primary/5
                        hidden sm:block"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                filter: "blur(20px)",
                animation: "sparkle 8s linear infinite"
              }}
            />
          </motion.div>
          <motion.div 
            className="mt-6 sm:mt-8 scale-105"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
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
                  <SongList songs={songs} ws={wsRef.current} user={user || null} />
                </CardContent>
              </Card>
            </motion.div>

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

      {!user && (
        <motion.div 
          className="fixed bottom-4 right-4 z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowLoginForm(true)}
            className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 
                      backdrop-blur-sm border-2 border-amber-200/30 hover:border-amber-300/40
                      transition-all duration-300"
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