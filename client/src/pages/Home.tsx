import { useEffect, useState, useRef, useCallback } from 'react';
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
import { io, Socket } from "socket.io-client";

type SocketEvent = {
  songs_update: Song[];
  error: { message: string };
};

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const { user, logout } = useUser();
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const reconnectAttempts = useRef(0);

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

  const setupSocket = useCallback(() => {
    try {
      if (socketRef.current?.connected) {
        console.log('Socket is already connected, skipping setup');
        return;
      }

      console.log('Setting up new socket connection');
      setSocketStatus('connecting');

      // Initialize socket connection
      const socket = io(window.location.origin, {
        path: '/ws',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true,
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('Socket.IO connection established');
        setSocketStatus('connected');
        reconnectAttempts.current = 0;

        toast({
          title: "連線成功",
          description: "即時更新已啟用",
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setSocketStatus('disconnected');

        // Only show toast for non-intentional disconnects
        if (reason !== 'io client disconnect' && reason !== 'transport close') {
          toast({
            title: "連線中斷",
            description: "正在嘗試重新連線...",
            variant: "destructive"
          });
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        setSocketStatus('disconnected');
        reconnectAttempts.current++;

        // Show error toast only on first attempt
        if (reconnectAttempts.current === 1) {
          toast({
            title: "連線錯誤",
            description: "正在嘗試重新連線...",
            variant: "destructive"
          });
        }
      });

      // Handle songs update
      socket.on('songs_update', (updatedSongs: Song[]) => {
        console.log('Received songs update:', updatedSongs);
        setSongs(updatedSongs);
      });

      // Handle errors
      socket.on('error', (error: { message: string }) => {
        console.error('Socket.IO error:', error);
        toast({
          title: "錯誤",
          description: error.message,
          variant: "destructive"
        });
      });

      socketRef.current = socket;

      return () => {
        console.log('Cleaning up socket connection');
        if (socket.connected) {
          socket.disconnect();
        }
        socketRef.current = null;
      };
    } catch (error) {
      console.error('Socket setup error:', error);
      setSocketStatus('disconnected');

      // Show error toast only on first attempt
      if (reconnectAttempts.current === 0) {
        toast({
          title: "連線錯誤",
          description: "無法建立即時連線",
          variant: "destructive"
        });
      }
      return undefined;
    }
  }, [toast]);

  useEffect(() => {
    const cleanup = setupSocket();
    return () => {
      cleanup?.();
    };
  }, [setupSocket]);

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
          <div className="flex items-center gap-4">
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
            <ShareButton />
          </div>

          {user ? (
            <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end w-full sm:w-auto">
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
                  <SongList songs={songs} socket={socketRef.current} user={user || null} />
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