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
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
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
    let hasConnectedOnce = false;
    let isCleaningUp = false;
    
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
          hasConnectedOnce = true;
          setWsConnection(ws);
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed');
          setWsConnection(null);
          
          if (isCleaningUp) return;
          
          if (hasConnectedOnce) {
            toast({
              title: "連線中斷",
              description: "正在嘗試重新連線...",
              variant: "destructive"
            });
          }
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
      isCleaningUp = true;
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
      {/* Admin Logout Button - Moved outside the title container */}
      {user?.isAdmin && (
        <motion.div 
          className="fixed top-4 right-4 z-50"
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
            登出管理
          </Button>
        </motion.div>
      )}

      <div className="container mx-auto py-3 sm:py-6 md:py-8 px-2 sm:px-4">
        {/* Title container */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center mb-6 sm:mb-8 md:mb-10 lg:mb-12 px-3 sm:px-4 md:px-6 lg:px-8 w-full"
        >
          <motion.div 
            className="relative p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border-2 border-primary/50 bg-gradient-to-br from-white/95 via-primary/5 to-white/90 backdrop-blur-sm shadow-[0_0_20px_rgba(var(--primary),0.4)] w-full max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-3xl mx-auto overflow-hidden hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all duration-300"
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
            <motion.div className="relative">
              <h1 
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-black text-center bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 px-2 sm:px-3 md:px-4 py-2 relative z-10 leading-[1.2] sm:leading-[1.2] md:leading-[1.2] lg:leading-[1.2] tracking-tight text-white shadow-lg rounded-lg"
              >
                <motion.div
                  className="inline-block"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0
                  }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut"
                  }}
                >
                  <div className="flex justify-center items-baseline">
                    <motion.span
                      className="inline-block"
                      initial={{ opacity: 1 }}
                      animate={{ 
                        y: [0, -3, 0],
                        rotate: [0, 2, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        times: [0, 0.5, 1]
                      }}
                    >
                      吉
                    </motion.span>
                    <motion.span
                      className="inline-block"
                      initial={{ opacity: 1 }}
                      animate={{ 
                        y: [0, -4, 0],
                        rotate: [0, -3, 0],
                        scale: [1, 1.15, 1]  
                      }}
                      transition={{ 
                        duration: 1.8,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        times: [0, 0.5, 1],
                        delay: 0.1
                      }}
                    >
                      他
                    </motion.span>
                    <motion.span
                      className="inline-block"
                      initial={{ opacity: 1 }}
                      animate={{ 
                        y: [0, -5, 0],
                        rotate: [0, 3, 0],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{ 
                        duration: 1.9,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        times: [0, 0.5, 1],
                        delay: 0.2
                      }}
                    >
                      彈
                    </motion.span>
                    <motion.span
                      className="inline-block"
                      initial={{ opacity: 1 }}
                      animate={{ 
                        y: [0, -4, 0],
                        rotate: [0, -2, 0],
                        scale: [1, 1.15, 1]
                      }}
                      transition={{ 
                        duration: 2.1,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        times: [0, 0.5, 1],
                        delay: 0.3
                      }}
                    >
                      唱
                    </motion.span>
                    <motion.span
                      className="inline-block px-2"
                      initial={{ opacity: 1 }}
                      animate={{ 
                        y: [0, -5, 0],
                        rotate: [0, 4, 0],
                        scale: [1, 1.25, 1]
                      }}
                      transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        times: [0, 0.5, 1],
                        delay: 0.4
                      }}
                    >
                      🎸
                    </motion.span>
                    <motion.span
                      className="inline-block"
                      initial={{ opacity: 1 }}
                      animate={{ 
                        y: [0, -3, 0],
                        rotate: [0, 2, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        times: [0, 0.5, 1],
                        delay: 0.5
                      }}
                    >
                      點
                    </motion.span>
                    <motion.span
                      className="inline-block"
                      initial={{ opacity: 1 }}
                      animate={{ 
                        y: [0, -4, 0],
                        rotate: [0, -3, 0],
                        scale: [1, 1.15, 1]
                      }}
                      transition={{ 
                        duration: 1.7,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        times: [0, 0.5, 1],
                        delay: 0.6
                      }}
                    >
                      歌
                    </motion.span>
                    <motion.span
                      className="inline-block"
                      initial={{ opacity: 1 }}
                      animate={{ 
                        y: [0, -5, 0],
                        rotate: [0, 3, 0],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{ 
                        duration: 1.8,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        times: [0, 0.5, 1],
                        delay: 0.7
                      }}
                    >
                      系
                    </motion.span>
                    <motion.span
                      className="inline-block"
                      initial={{ opacity: 1 }}
                      animate={{ 
                        y: [0, -4, 0],
                        rotate: [0, -2, 0],
                        scale: [1, 1.15, 1]
                      }}
                      transition={{ 
                        duration: 2.1,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        times: [0, 0.5, 1],
                        delay: 0.8
                      }}
                    >
                      統
                    </motion.span>
                    <motion.span
                      className="inline-block ml-1"
                      initial={{ opacity: 1 }}
                      animate={{ 
                        y: [0, -5, 0],
                        rotate: [0, 4, 0],
                        scale: [1, 1.25, 1]
                      }}
                      transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "loop",
                        ease: "easeInOut",
                        times: [0, 0.5, 1],
                        delay: 0.9
                      }}
                    >
                      🎵
                    </motion.span>
                  </div>
                </motion.div>
              </h1>
              
              {/* 閃爍星星裝飾 */}
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute text-yellow-400 text-sm pointer-events-none"
                  initial={{ 
                    x: `${10 + (i * 20)}%`,
                    y: `${50 + (Math.sin(i * 0.5) * 20)}%`,
                    opacity: 0
                  }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0.5, 1.2, 0.5],
                    y: [`${50 + (Math.sin(i * 0.5) * 20)}%`, `${30 + (Math.sin(i * 0.5) * 15)}%`, `${50 + (Math.sin(i * 0.5) * 20)}%`]
                  }}
                  transition={{
                    duration: 2 + (i * 0.2),
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeInOut",
                    delay: i * 0.3 + 1
                  }}
                >
                  ✨
                </motion.div>
              ))}
            </motion.div>

            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-rose-500/20 to-amber-400/20"
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
                transform: "translate3d(0, 0, 0)", 
                backfaceVisibility: "hidden",
                pointerEvents: "none"
              }}
            />
            <motion.div 
              className="absolute inset-0 bg-gradient-to-br from-indigo-400/15 via-purple-400/20 to-pink-400/15"
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear",
                repeatType: "reverse"
              }}
              style={{
                backgroundSize: "200% 200%",
                filter: "blur(15px)",
                transform: "translate3d(0, 0, 0)", 
                backfaceVisibility: "hidden",
                pointerEvents: "none"
              }}
            />
          </motion.div>

          <motion.div 
            className="mt-4 sm:mt-5 md:mt-6 lg:mt-8 scale-90 sm:scale-95 md:scale-100 lg:scale-105"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <ShareButton />
          </motion.div>
        </motion.div>

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

            {/* 兩欄的平均分配容器 */}
            <motion.div 
              className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
            >
              {/* Song list section */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
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
                    <div className="h-3 sm:h-4" />
                    <SongList songs={songs} ws={wsConnection} user={user || null} />
                  </CardContent>
                </Card>
              </motion.div>

              {/* Ranking board section */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Login button for non-admin users */}
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
            className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 backdrop-blur-sm border-2 border-amber-200/30 hover:border-amber-300/40 transition-all duration-300"
          >
            <LogIn className="w-4 h-4 mr-2" />
            管理員登入
          </Button>
        </motion.div>
      )}

      {/* Login form modal */}
      {showLoginForm && (
        <LoginForm onClose={() => setShowLoginForm(false)} />
      )}
    </div>
  );
}