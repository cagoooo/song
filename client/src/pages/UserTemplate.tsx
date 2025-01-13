import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Template, Song } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music2, Trophy, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SongList from "../components/SongList";
import RankingBoard from "../components/RankingBoard";
import SongSuggestion from "../components/SongSuggestion";
import { ShareButton } from "../components/ShareButton";

export default function UserTemplate() {
  const { username } = useParams();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // 獲取使用者模板
  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: [`/api/users/${username}/templates`],
    enabled: !!username,
  });

  // WebSocket連接
  useEffect(() => {
    if (!selectedTemplate) return;

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
  }, [selectedTemplate]);

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

  // 找不到模板的情況
  if (!templates.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold text-center">
              找不到該使用者的模板
            </h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 如果沒有選擇模板，顯示模板列表
  if (!selectedTemplate) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">{username} 的點歌模板</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{template.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => setSelectedTemplate(template)}
                  className="w-full"
                >
                  使用此模板
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // 選擇模板後的頁面
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto py-4 sm:py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setSelectedTemplate(null)}
            className="mb-4"
          >
            返回模板列表
          </Button>

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
                {selectedTemplate.name}
              </motion.h1>
            </motion.div>

            <motion.div 
              className="mt-4 sm:mt-5 md:mt-6 lg:mt-8 scale-90 sm:scale-95 md:scale-100 lg:scale-105"
            >
              <ShareButton />
            </motion.div>
          </motion.div>
        </div>

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
                  <SongList songs={songs} ws={wsRef.current} user={null} />
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