import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Song, User } from "@db/schema";
import { Music, ThumbsUp, Trash2, RotateCcw, Edit2 } from "lucide-react";
import SearchBar from "./SearchBar";
import TagSelector from "./TagSelector";
import { AnimatePresence, motion } from "framer-motion";

interface SongListProps {
  songs: Song[];
  ws: WebSocket | null;
  user: User | null;
  isWebSocketConnected?: boolean;
}

interface EditDialogProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, artist: string) => Promise<void>;
}

function EditDialog({ song, isOpen, onClose, onSave }: EditDialogProps) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(title, artist);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>編輯歌曲</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">歌曲名稱</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="artist">歌手</Label>
            <Input
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>
              取消
            </Button>
            <Button type="submit">儲存</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SongList({ songs, ws, user, isWebSocketConnected }: SongListProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [votingId, setVotingId] = useState<number | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [clickCount, setClickCount] = useState<{ [key: number]: number }>({});
  const [isTouch, setIsTouch] = useState(false);
  const [lastVoteTime, setLastVoteTime] = useState<{ [key: number]: number }>({});
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const handleVoteStart = useCallback((songId: number) => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !isWebSocketConnected) {
      toast({
        title: "錯誤",
        description: "無法連接到伺服器，請稍後再試",
        variant: "destructive"
      });
      return;
    }

    const now = Date.now();
    const lastTime = lastVoteTime[songId] || 0;
    const timeDiff = now - lastTime;

    if (timeDiff < 150) return; // 增加點擊間隔以減少狀態更新頻率

    setVotingId(songId);
    ws.send(JSON.stringify({ type: 'VOTE', songId }));

    setClickCount(prev => {
      const newCount = Math.min((prev[songId] || 0) + 1, 15); // 限制最大點擊次數為15
      return {
        ...prev,
        [songId]: newCount
      };
    });

    setLastVoteTime(prev => ({
      ...prev,
      [songId]: now
    }));

    // 使用 RAF 進行平滑的點擊計數重置
    let start: number;
    const duration = 2000; // 2秒內平滑降低

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = timestamp - start;

      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setClickCount(prev => ({
          ...prev,
          [songId]: 0
        }));
      }
    };

    requestAnimationFrame(animate);
  }, [ws, isWebSocketConnected, lastVoteTime, toast]);

  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return songs;
    const term = searchTerm.toLowerCase();
    return songs.filter(song =>
      song.title.toLowerCase().includes(term) ||
      song.artist.toLowerCase().includes(term)
    );
  }, [songs, searchTerm]);

  const deleteSong = async (songId: number) => {
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete song');

      toast({
        title: "成功",
        description: "歌曲已刪除",
      });
    } catch (error) {
      toast({
        title: "錯誤",
        description: "無法刪除歌曲",
        variant: "destructive"
      });
    }
  };

  const resetAllVotes = async () => {
    try {
      const response = await fetch('/api/songs/reset-votes', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to reset votes');

      toast({
        title: "成功",
        description: "所有點播次數已歸零",
      });
      setShowResetDialog(false);
    } catch (error) {
      toast({
        title: "錯誤",
        description: "無法重置點播次數",
        variant: "destructive"
      });
    }
  };

  const handleEditSave = async (title: string, artist: string) => {
    if (!editingSong) return;

    try {
      const response = await fetch(`/api/songs/${editingSong.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to update song');

      toast({
        title: "成功",
        description: "歌曲已更新",
      });
      setEditingSong(null);
    } catch (error) {
      toast({
        title: "錯誤",
        description: "無法更新歌曲",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchBar value={searchTerm} onChange={setSearchTerm} />
        </div>
        {user?.isAdmin && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowResetDialog(true)}
            className="w-full sm:w-12 h-12 border-2 border-primary/20 bg-white/80 hover:bg-white/90
                     shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                     hover:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                     transition-all duration-300"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px] sm:h-[500px] w-full pr-4">
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredSongs.map((song) => (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ 
                  duration: 0.3,
                  layout: { duration: 0.2 }
                }}
                className="flex flex-col gap-4 p-3 sm:p-4 rounded-lg border-2 border-primary/10
                          bg-gradient-to-br from-white via-primary/5 to-white
                          hover:from-white hover:via-primary/10 hover:to-white
                          shadow-[0_4px_12px_rgba(var(--primary),0.1)]
                          hover:shadow-[0_4px_16px_rgba(var(--primary),0.15)]
                          transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-gray-800 break-all">{song.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 break-all">{song.artist}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative w-full sm:w-auto"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleVoteStart(song.id);
                        }}
                        onTouchEnd={(e) => e.preventDefault()}
                        onMouseDown={() => !isTouch && handleVoteStart(song.id)}
                        onMouseUp={(e) => e.preventDefault()}
                        className={`
                          flex gap-2 relative overflow-hidden w-full sm:w-auto
                          bg-gradient-to-r from-purple-100 via-pink-100 to-rose-100
                          hover:from-purple-200 hover:via-pink-200 hover:to-rose-200
                          border-2
                          ${votingId === song.id || clickCount[song.id] > 0
                            ? `border-primary shadow-[0_0_${Math.min(10 + (clickCount[song.id] || 0) * 2, 20)}px_rgba(var(--primary),${Math.min(0.2 + (clickCount[song.id] || 0) * 0.05, 0.5)})]
                                bg-gradient-to-r 
                                ${clickCount[song.id] >= 10 ? 'from-purple-400 via-pink-400 to-rose-400 text-white' :
                                  clickCount[song.id] >= 5 ? 'from-purple-300 via-pink-300 to-rose-300' :
                                  'from-purple-200 via-pink-200 to-rose-200'}`
                            : 'border-primary/20 hover:border-primary/40'}
                          transition-all duration-150
                          transform-gpu
                          active:scale-95
                          select-none
                          touch-none
                          ${!isWebSocketConnected ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        disabled={!isWebSocketConnected}
                      >
                        <ThumbsUp className={`h-4 w-4 ${votingId === song.id ? 'text-primary' : ''}`} />
                        <span>點播</span>
                        {clickCount[song.id] > 0 && (
                          <motion.div
                            className={`absolute -top-1 -right-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full`}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            +{clickCount[song.id]}
                          </motion.div>
                        )}
                      </Button>
                    </motion.div>

                    {user?.isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSong(song)}
                          className="w-full sm:w-auto border-2 border-primary/20
                                    bg-white/80 hover:bg-white/90
                                    hover:border-primary/40 transition-all duration-300"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          編輯
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSong(song.id)}
                          className="w-full sm:w-auto border-2 border-red-200/50
                                    text-red-500 hover:text-red-600 bg-white/80 hover:bg-white/90
                                    hover:border-red-300/50 transition-all duration-300"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          刪除
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <TagSelector song={song} isAdmin={user?.isAdmin ?? false} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認重置所有點播次數？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作將會清除所有歌曲的點播次數。此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={resetAllVotes}>確認重置</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingSong && (
        <EditDialog
          song={editingSong}
          isOpen={!!editingSong}
          onClose={() => setEditingSong(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}