import { useEffect, useState, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Template, Song } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music2, Trophy } from "lucide-react";
import SongList from "../components/SongList";
import RankingBoard from "../components/RankingBoard";

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
        <div className="animate-spin">
          <Music2 className="w-12 h-12 text-primary" />
        </div>
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
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setSelectedTemplate(null)}
          >
            返回模板列表
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 歌單區域 */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music2 className="w-5 h-5" />
                  {selectedTemplate.name} - 可選歌單
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SongList 
                  songs={songs}
                  ws={wsRef.current}
                  user={null}
                />
              </CardContent>
            </Card>
          </div>

          {/* 排行榜區域 */}
          <div>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  點播排行榜
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RankingBoard songs={songs} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}