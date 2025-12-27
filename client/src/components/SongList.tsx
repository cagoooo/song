import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Song, User } from "@db/schema";
import { Music, ThumbsUp, Trash2, RotateCcw, Edit2, CheckCircle2, Sparkles, Heart, Loader2, ChevronDown } from "lucide-react";
import SearchBar from "./SearchBar";
import { AnimatePresence, motion } from "framer-motion";
import QRCodeShareModal from "./QRCodeShareModal";
import confetti from "canvas-confetti";

interface SongListProps {
  songs: Song[];
  ws: WebSocket | null;
  user: User | null;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  totalCount?: number;
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
  const [animateForm, setAnimateForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 啟動表單動畫效果
      setAnimateForm(true);
      const timer = setTimeout(() => setAnimateForm(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(title, artist);
  };

  // 為了增加視覺多樣性，基於歌曲ID生成不同的顏色主題
  const colorSchemes = [
    {
      bg: "from-purple-50 via-fuchsia-50 to-pink-50",
      border: "border-purple-300",
      input1: "from-fuchsia-50/70 to-purple-50/70 border-purple-200/50 focus:border-purple-300/60",
      input2: "from-pink-50/70 to-fuchsia-50/70 border-pink-200/50 focus:border-pink-300/60",
      btnCancel: "bg-white hover:bg-purple-50 border-purple-200 hover:border-purple-300 text-purple-700",
      btnSave: "bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600"
    },
    {
      bg: "from-blue-50 via-cyan-50 to-teal-50",
      border: "border-blue-300",
      input1: "from-cyan-50/70 to-blue-50/70 border-blue-200/50 focus:border-blue-300/60",
      input2: "from-teal-50/70 to-cyan-50/70 border-teal-200/50 focus:border-teal-300/60",
      btnCancel: "bg-white hover:bg-blue-50 border-blue-200 hover:border-blue-300 text-blue-700",
      btnSave: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
    },
    {
      bg: "from-amber-50 via-orange-50 to-rose-50",
      border: "border-amber-300",
      input1: "from-orange-50/70 to-amber-50/70 border-amber-200/50 focus:border-amber-300/60",
      input2: "from-rose-50/70 to-orange-50/70 border-rose-200/50 focus:border-rose-300/60",
      btnCancel: "bg-white hover:bg-amber-50 border-amber-200 hover:border-amber-300 text-amber-700",
      btnSave: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
    },
    {
      bg: "from-emerald-50 via-green-50 to-lime-50",
      border: "border-emerald-300",
      input1: "from-green-50/70 to-emerald-50/70 border-green-200/50 focus:border-green-300/60",
      input2: "from-lime-50/70 to-green-50/70 border-lime-200/50 focus:border-lime-300/60",
      btnCancel: "bg-white hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 text-emerald-700",
      btnSave: "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600"
    }
  ];

  const getColorIndex = (id: string | number): number => {
    if (typeof id === 'number') return id % colorSchemes.length;
    let hash = 0;
    for (let i = 0; i < String(id).length; i++) {
      hash = String(id).charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % colorSchemes.length;
  };
  
  const colorIndex = getColorIndex(song.id);
  const colorScheme = colorSchemes[colorIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`
        bg-gradient-to-r ${colorScheme.bg}
        border-2 ${colorScheme.border}
        shadow-xl overflow-hidden
      `}>
        {/* 背景裝飾 */}
        <div className="absolute -z-10 inset-0 bg-white/50"></div>
        <motion.div 
          className="absolute -z-5 inset-0 opacity-20 pointer-events-none"
          initial={{ backgroundPosition: "0% 0%" }}
          animate={{ 
            backgroundPosition: ["0% 0%", "100% 100%"], 
          }}
          transition={{ duration: 15, repeat: Infinity, repeatType: "reverse" }}
          style={{ 
            backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 25%)",
            backgroundSize: "120% 120%"
          }}
        />
        
        {/* 頂部裝飾 */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        
        <DialogHeader>
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, type: "spring" }}
          >
            <DialogTitle className={`
              text-center font-bold text-lg bg-clip-text text-transparent
              bg-gradient-to-r from-primary to-primary/70
            `}>
              ✨ 編輯歌曲 ✨
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground mt-1">
              修改歌曲名稱或歌手資訊
            </DialogDescription>
          </motion.div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          <motion.div 
            className="space-y-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="space-y-2">
              <Label 
                htmlFor="title" 
                className="font-medium text-gray-700 flex items-center gap-1.5"
              >
                <Music className="w-4 h-4 text-primary" />
                歌曲名稱
              </Label>
              <motion.div
                animate={animateForm ? { 
                  y: [0, -2, 0, -2, 0],
                  x: [0, 1, -1, 1, 0]
                } : {}}
                transition={{ duration: 0.4 }}
              >
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={`
                    bg-gradient-to-r ${colorScheme.input1}
                    font-medium rounded-lg transition-all duration-300
                    shadow-inner shadow-white/50
                    focus:shadow-md focus:ring-1 focus:ring-primary/30
                  `}
                />
              </motion.div>
            </div>
          
            <div className="space-y-2">
              <Label 
                htmlFor="artist"
                className="font-medium text-gray-700 flex items-center gap-1.5"
              >
                <ThumbsUp className="w-4 h-4 text-primary" />
                歌手
              </Label>
              <motion.div
                animate={animateForm ? { 
                  y: [0, -2, 0, -2, 0],
                  x: [0, 1, -1, 1, 0]  
                } : {}}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Input
                  id="artist"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  required
                  className={`
                    bg-gradient-to-r ${colorScheme.input2}
                    font-medium rounded-lg transition-all duration-300
                    shadow-inner shadow-white/50
                    focus:shadow-md focus:ring-1 focus:ring-primary/30
                  `}
                />
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex justify-end gap-3 pt-2"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Button 
              variant="outline" 
              type="button" 
              onClick={onClose}
              className={`
                ${colorScheme.btnCancel}
                rounded-lg border px-4 py-2 font-medium shadow-sm
                transition-all duration-300
                hover:shadow-md
              `}
            >
              取消
            </Button>
            <Button 
              type="submit"
              className={`
                ${colorScheme.btnSave}
                rounded-lg border-none px-4 py-2 font-medium shadow-sm text-white
                transition-all duration-300
                hover:shadow-md hover:scale-105
              `}
            >
              儲存變更
            </Button>
          </motion.div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SongList({ songs, ws, user, hasMore, isLoadingMore, onLoadMore, totalCount }: SongListProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  // 偵測是否為手機裝置，減少動畫
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const reduceMotion = isMobile || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedSongForShare, setSelectedSongForShare] = useState<Song | null>(null);
  const [clickCount, setClickCount] = useState<{ [key: string]: number }>({});
  const [isTouch, setIsTouch] = useState(false);
  const [lastVoteTime, setLastVoteTime] = useState<{ [key: string]: number }>({});
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [voteSuccess, setVoteSuccess] = useState<{ [key: string]: boolean }>({});
  const [showVoteOverlay, setShowVoteOverlay] = useState<{ songId: string; title: string; artist: string } | null>(null);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const triggerVoteConfetti = (buttonElement: HTMLButtonElement | null) => {
    if (!buttonElement) return;
    
    const rect = buttonElement.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { x, y },
      colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'],
      ticks: 100,
      gravity: 1.2,
      scalar: 0.8,
      shapes: ['circle', 'square'],
      zIndex: 9999,
    });
  };

  const handleVoteStart = useCallback((songId: string, song: Song) => {
    const now = Date.now();
    const lastTime = lastVoteTime[songId] || 0;
    const timeDiff = now - lastTime;

    if (timeDiff < 300) {
      return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      setVotingId(songId);
      ws.send(JSON.stringify({ type: 'VOTE', songId }));

      setClickCount(prev => ({
        ...prev,
        [songId]: (prev[songId] || 0) + 1
      }));

      setLastVoteTime(prev => ({
        ...prev,
        [songId]: now
      }));

      setVoteSuccess(prev => ({ ...prev, [songId]: true }));
      
      triggerVoteConfetti(buttonRefs.current[songId]);
      
      setShowVoteOverlay({ songId, title: song.title, artist: song.artist });
      
      toast({
        title: "🎸 點播成功！",
        description: (
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-pink-500" />
            <span className="font-medium">{song.title}</span>
            <span className="text-muted-foreground">- {song.artist}</span>
          </div>
        ),
        duration: 2000,
      });

      setTimeout(() => {
        setVotingId(null);
        setVoteSuccess(prev => ({ ...prev, [songId]: false }));
      }, 800);
      
      setTimeout(() => {
        setShowVoteOverlay(null);
      }, 1500);

      const timeoutKey = `timeout_${songId}`;
      if ((window as any)[timeoutKey]) {
        clearTimeout((window as any)[timeoutKey]);
        clearInterval((window as any)[`interval_${songId}`]);
      }

      (window as any)[timeoutKey] = setTimeout(() => {
        const currentCount = clickCount[songId] || 0;
        const steps = 10; 
        const decrementPerStep = Math.ceil(currentCount / steps);

        (window as any)[`interval_${songId}`] = setInterval(() => {
          setClickCount(prev => {
            const newCount = Math.max((prev[songId] || 0) - decrementPerStep, 0);
            if (newCount === 0) {
              clearInterval((window as any)[`interval_${songId}`]);
            }
            return {
              ...prev,
              [songId]: newCount
            };
          });
        }, 100);
      }, 2000);
    } else {
      toast({
        title: "連線中",
        description: "正在連線到伺服器，請稍後再試",
        variant: "destructive"
      });
    }
  }, [ws, clickCount, lastVoteTime, toast]);

  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return songs;

    const term = searchTerm.toLowerCase();
    return songs.filter(
      song =>
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

      if (!response.ok) {
        throw new Error('Failed to delete song');
      }

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

      if (!response.ok) {
        throw new Error('Failed to reset votes');
      }

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

  const handleShareClick = (song: Song) => {
    setSelectedSongForShare(song);
    setQrModalOpen(true);
  };

  const getShareUrl = (songId: number) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/songs/${songId}`;
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
    <div className="space-y-4 relative">
      {/* 點播成功覆蓋動畫 */}
      <AnimatePresence>
        {showVoteOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: [0.5, 1.2, 1],
                opacity: [0, 1, 1, 0]
              }}
              transition={{ 
                duration: 1.5,
                times: [0, 0.3, 0.7, 1]
              }}
              className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 
                         text-white px-8 py-6 rounded-2xl shadow-2xl
                         flex flex-col items-center gap-3"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: 2
                }}
              >
                <CheckCircle2 className="h-12 w-12 text-white drop-shadow-lg" />
              </motion.div>
              <motion.p 
                className="text-xl font-bold"
                animate={{ y: [10, 0] }}
              >
                點播成功！
              </motion.p>
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-lg font-semibold">{showVoteOverlay.title}</p>
                <p className="text-sm opacity-80">{showVoteOverlay.artist}</p>
              </motion.div>
              <motion.div
                className="flex gap-2 mt-1"
                animate={{ 
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 0.6,
                  repeat: Infinity
                }}
              >
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      y: [0, -5, 0],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 0.4,
                      delay: i * 0.1,
                      repeat: Infinity
                    }}
                  >
                    <Sparkles className="h-5 w-5 text-yellow-300" />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {filteredSongs.map((song, index) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className={`flex flex-col gap-4 p-3 sm:p-4 rounded-xl border-2 
                        ${index % 5 === 0 ? 'border-pink-300 bg-gradient-to-br from-white via-pink-50 to-white' :
                         index % 5 === 1 ? 'border-blue-300 bg-gradient-to-br from-white via-blue-50 to-white' :
                         index % 5 === 2 ? 'border-purple-300 bg-gradient-to-br from-white via-purple-50 to-white' :
                         index % 5 === 3 ? 'border-amber-300 bg-gradient-to-br from-white via-amber-50 to-white' :
                                         'border-emerald-300 bg-gradient-to-br from-white via-emerald-50 to-white'}
                        hover:border-opacity-100
                        hover:shadow-lg hover:shadow-${index % 5 === 0 ? 'pink' : 
                                                    index % 5 === 1 ? 'blue' : 
                                                    index % 5 === 2 ? 'purple' : 
                                                    index % 5 === 3 ? 'amber' : 'emerald'}-200/40
                        transition-all duration-300 transform-gpu`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative overflow-hidden">
                  <div className={`absolute left-0 top-0 w-2 h-full rounded-full 
                               ${index % 5 === 0 ? 'bg-pink-400' :
                                index % 5 === 1 ? 'bg-blue-400' : 
                                index % 5 === 2 ? 'bg-purple-400' : 
                                index % 5 === 3 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  <div className="ml-4">
                    <div className="flex items-center gap-2">
                      <Music className={`h-5 w-5 ${index % 5 === 0 ? 'text-pink-500' :
                                                  index % 5 === 1 ? 'text-blue-500' : 
                                                  index % 5 === 2 ? 'text-purple-500' : 
                                                  index % 5 === 3 ? 'text-amber-500' : 'text-emerald-500'}`} />
                      <h3 className="font-semibold text-gray-800 break-all">{song.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 break-all ml-7">{song.artist}</p>
                    
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-full sm:w-auto"
                  >
                    <Button
                      ref={(el) => { buttonRefs.current[String(song.id)] = el; }}
                      variant="outline"
                      size="sm"
                      onClick={() => handleVoteStart(String(song.id), song)}
                      className={`
                        flex gap-2 relative overflow-hidden w-full sm:w-auto
                        rounded-xl
                        ${index % 5 === 0 ? 'bg-gradient-to-r from-pink-100 via-rose-100 to-pink-200' :
                         index % 5 === 1 ? 'bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-200' :
                         index % 5 === 2 ? 'bg-gradient-to-r from-purple-100 via-fuchsia-100 to-purple-200' :
                         index % 5 === 3 ? 'bg-gradient-to-r from-amber-100 via-yellow-100 to-amber-200' :
                         'bg-gradient-to-r from-emerald-100 via-green-100 to-emerald-200'}
                        hover:from-opacity-80 hover:via-opacity-80 hover:to-opacity-80
                        border-2
                        ${votingId === String(song.id) || clickCount[String(song.id)] > 0
                          ? `${index % 5 === 0 ? 'border-pink-500 shadow-pink-300' :
                              index % 5 === 1 ? 'border-blue-500 shadow-blue-300' :
                              index % 5 === 2 ? 'border-purple-500 shadow-purple-300' :
                              index % 5 === 3 ? 'border-amber-500 shadow-amber-300' :
                              'border-emerald-500 shadow-emerald-300'}
                              shadow-[0_0_${Math.min(15 + (clickCount[String(song.id)] || 0) * 5, 30)}px]
                              ${clickCount[String(song.id)] >= 10 ? 
                                `${index % 5 === 0 ? 'bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white' :
                                  index % 5 === 1 ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 text-white' :
                                  index % 5 === 2 ? 'bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-600 text-white' :
                                  index % 5 === 3 ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white' :
                                  'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-white'}` :
                                clickCount[String(song.id)] >= 5 ? 
                                `${index % 5 === 0 ? 'bg-gradient-to-r from-pink-400 via-rose-400 to-pink-500' :
                                  index % 5 === 1 ? 'bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500' :
                                  index % 5 === 2 ? 'bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-500' :
                                  index % 5 === 3 ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500' :
                                  'bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500'}` :
                                `${index % 5 === 0 ? 'bg-gradient-to-r from-pink-300 via-rose-300 to-pink-400' :
                                  index % 5 === 1 ? 'bg-gradient-to-r from-blue-300 via-indigo-300 to-blue-400' :
                                  index % 5 === 2 ? 'bg-gradient-to-r from-purple-300 via-fuchsia-300 to-purple-400' :
                                  index % 5 === 3 ? 'bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400' :
                                  'bg-gradient-to-r from-emerald-300 via-green-300 to-emerald-400'}`}`
                          : `${index % 5 === 0 ? 'border-pink-300/70 hover:border-pink-400' :
                              index % 5 === 1 ? 'border-blue-300/70 hover:border-blue-400' :
                              index % 5 === 2 ? 'border-purple-300/70 hover:border-purple-400' :
                              index % 5 === 3 ? 'border-amber-300/70 hover:border-amber-400' :
                              'border-emerald-300/70 hover:border-emerald-400'}`}
                        transition-all duration-150
                        transform-gpu
                        ${clickCount[String(song.id)] > 0 ? 'scale-110' : 'scale-100'}
                        active:scale-95
                        text-base font-medium
                        cursor-pointer
                      `}
                      style={{
                        transform: `scale(${Math.min(1 + (clickCount[String(song.id)] || 0) * 0.05, 1.25)})`,
                        willChange: 'transform',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <ThumbsUp className={`h-4 w-4 ${votingId === String(song.id) ? 'text-primary' : ''}`} />
                      <span className="relative">
                        點播
                        <AnimatePresence>
                          {clickCount[String(song.id)] > 0 && (
                            <motion.div
                              className="absolute -top-1 left-1/2 -translate-x-1/2"
                              style={{ pointerEvents: "none" }}
                            >
                              <motion.span
                                key={`count-${clickCount[String(song.id)]}`}
                                initial={{ opacity: 0, y: 5, scale: 0.5 }}
                                animate={{
                                  opacity: [0, 1, 1, 0],
                                  y: [-5, -30, -40],
                                  scale: Math.min(1 + (clickCount[String(song.id)] * 0.5), 3.0),
                                  rotate: [-5, 5, -5, 0],
                                  color: [
                                    index % 5 === 0 ? "#ec4899" : // pink-500
                                    index % 5 === 1 ? "#3b82f6" : // blue-500
                                    index % 5 === 2 ? "#a855f7" : // purple-500
                                    index % 5 === 3 ? "#f59e0b" : // amber-500
                                    "#10b981",                    // emerald-500
                                    
                                    "#f43f5e", // rose-500
                                    "#eab308", // yellow-500
                                    index % 5 === 0 ? "#be185d" : // pink-700
                                    index % 5 === 1 ? "#1d4ed8" : // blue-700
                                    index % 5 === 2 ? "#7e22ce" : // purple-700
                                    index % 5 === 3 ? "#b45309" : // amber-700
                                    "#047857"                     // emerald-700
                                  ]
                                }}
                                transition={{
                                  duration: 0.8,
                                  ease: "easeOut",
                                  times: [0, 0.2, 0.8, 1]
                                }}
                                className="absolute font-bold z-50"
                                style={{
                                  fontSize: `${Math.min(16 + clickCount[String(song.id)] * 2, 30)}px`,
                                  fontWeight: "900",
                                  textShadow: `0 0 ${Math.min(10 + clickCount[String(song.id)] * 3, 25)}px ${
                                    index % 5 === 0 ? "rgba(236, 72, 153, 0.8)" : // pink-500
                                    index % 5 === 1 ? "rgba(59, 130, 246, 0.8)" : // blue-500
                                    index % 5 === 2 ? "rgba(168, 85, 247, 0.8)" : // purple-500
                                    index % 5 === 3 ? "rgba(245, 158, 11, 0.8)" : // amber-500
                                    "rgba(16, 185, 129, 0.8)"                     // emerald-500
                                  }`
                                }}
                              >
                                +{clickCount[String(song.id)]}
                              </motion.span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </span>

                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                          opacity: clickCount[String(song.id)] > 0 ? [0, Math.min(0.8 + (clickCount[String(song.id)] * 0.05), 1), 0] : 0,
                          scale: clickCount[String(song.id)] > 0 ? [0.5, Math.min(1.5 + (clickCount[String(song.id)] * 0.1), 3)] : 0,
                          y: clickCount[String(song.id)] > 0 ? [0, Math.min(-30 - (clickCount[String(song.id)] * 2), -60)] : 0
                        }}
                        transition={{ duration: 0.5 }}
                        className="absolute left-1/2 -translate-x-1/2 -bottom-4"
                        style={{
                          zIndex: -1,
                          pointerEvents: 'none',
                          transformOrigin: 'bottom center'
                        }}
                      >
                        <div
                          className={`
                            w-8 h-16 rounded-full blur-sm
                            ${clickCount[String(song.id)] >= 10 ? 'opacity-100 scale-150' :
                              clickCount[String(song.id)] >= 5 ? 'opacity-90 scale-125' :
                              'opacity-80'}
                          `}
                          style={{
                            background: `linear-gradient(to top, ${
                              index % 5 === 0 ? 'rgb(219, 39, 119), rgb(236, 72, 153)' : // pink-600, pink-500
                              index % 5 === 1 ? 'rgb(37, 99, 235), rgb(59, 130, 246)' : // blue-600, blue-500
                              index % 5 === 2 ? 'rgb(147, 51, 234), rgb(168, 85, 247)' : // purple-600, purple-500
                              index % 5 === 3 ? 'rgb(217, 119, 6), rgb(245, 158, 11)' : // amber-600, amber-500
                              'rgb(5, 150, 105), rgb(16, 185, 129)' // emerald-600, emerald-500
                            }, transparent)`,
                            animation: `pulse ${Math.max(1.5 - (clickCount[String(song.id)] * 0.1), 0.5)}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                            transform: `scale(${Math.min(1 + (clickCount[String(song.id)] * 0.1), 2)})`,
                            filter: `blur(${Math.min(3 + (clickCount[String(song.id)] * 0.2), 8)}px)`
                          }}
                        />
                        <div
                          className={`
                            absolute inset-0 w-6 h-14 rounded-full blur-sm
                            ${clickCount[String(song.id)] >= 10 ? 'opacity-100 scale-150' :
                              clickCount[String(song.id)] >= 5 ? 'opacity-90 scale-125' :
                              'opacity-80'}
                          `}
                          style={{
                            background: `linear-gradient(to top, ${
                              index % 5 === 0 ? 'rgb(236, 72, 153), rgb(244, 114, 182)' : // pink-500, pink-400
                              index % 5 === 1 ? 'rgb(59, 130, 246), rgb(96, 165, 250)' : // blue-500, blue-400
                              index % 5 === 2 ? 'rgb(168, 85, 247), rgb(192, 132, 252)' : // purple-500, purple-400
                              index % 5 === 3 ? 'rgb(245, 158, 11), rgb(251, 191, 36)' : // amber-500, amber-400
                              'rgb(16, 185, 129), rgb(52, 211, 153)' // emerald-500, emerald-400
                            }, transparent)`,
                            animation: `pulse ${Math.max(1.2 - (clickCount[String(song.id)] * 0.1), 0.3)}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                            transform: `scale(${Math.min(1 + (clickCount[String(song.id)] * 0.15), 2.2)})`,
                            filter: `blur(${Math.min(2 + (clickCount[String(song.id)] * 0.15), 6)}px)`
                          }}
                        />
                        {Array.from({ length: Math.min(5 + Math.floor(clickCount[String(song.id)] / 2), 20) }).map((_, sparkIndex) => (
                          <motion.div
                            key={sparkIndex}
                            className={`absolute ${
                              sparkIndex % 5 === 0 ? 'bg-pink-300' :
                              sparkIndex % 5 === 1 ? 'bg-blue-300' :
                              sparkIndex % 5 === 2 ? 'bg-purple-300' :
                              sparkIndex % 5 === 3 ? 'bg-amber-300' : 
                              'bg-yellow-300'
                            } rounded-full`}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                              opacity: [0, 0.9, 0],
                              scale: [0, Math.random() * 0.5 + 0.5, 0],
                              width: [
                                `${2 + Math.random() * 3}px`,
                                `${2 + Math.random() * 3}px`,
                                `${1 + Math.random()}px`
                              ],
                              height: [
                                `${2 + Math.random() * 3}px`,
                                `${2 + Math.random() * 3}px`,
                                `${1 + Math.random()}px`
                              ],
                              x: [
                                0,
                                (Math.random() - 0.5) * 60 * (1 + clickCount[String(song.id)] * 0.15),
                                (Math.random() - 0.5) * 70 * (1 + clickCount[String(song.id)] * 0.2)
                              ],
                              y: [
                                0,
                                -30 - Math.random() * 40 * (1 + clickCount[String(song.id)] * 0.1),
                                -20 - Math.random() * 60 * (1 + clickCount[String(song.id)] * 0.15)
                              ]
                            }}
                            transition={{
                              duration: 0.5 + Math.random() * 0.7,
                              repeat: clickCount[String(song.id)] > 5 ? Infinity : 0,
                              repeatDelay: Math.random() * 0.3
                            }}
                            style={{
                              left: '50%',
                              bottom: '100%',
                              boxShadow: `0 0 ${3 + Math.random() * 5}px ${
                                sparkIndex % 5 === 0 ? 'rgba(236, 72, 153, 0.8)' : // pink
                                sparkIndex % 5 === 1 ? 'rgba(59, 130, 246, 0.8)' : // blue
                                sparkIndex % 5 === 2 ? 'rgba(168, 85, 247, 0.8)' : // purple
                                sparkIndex % 5 === 3 ? 'rgba(245, 158, 11, 0.8)' : // amber
                                'rgba(252, 211, 77, 0.8)' // yellow
                              }`
                            }}
                          />
                        ))}
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `radial-gradient(circle, ${
                              index % 5 === 0 ? `rgba(236, 72, 153, ${Math.min(0.2 + clickCount[String(song.id)] * 0.05, 0.6)})` : // pink
                              index % 5 === 1 ? `rgba(59, 130, 246, ${Math.min(0.2 + clickCount[String(song.id)] * 0.05, 0.6)})` : // blue
                              index % 5 === 2 ? `rgba(168, 85, 247, ${Math.min(0.2 + clickCount[String(song.id)] * 0.05, 0.6)})` : // purple
                              index % 5 === 3 ? `rgba(245, 158, 11, ${Math.min(0.2 + clickCount[String(song.id)] * 0.05, 0.6)})` : // amber
                              `rgba(16, 185, 129, ${Math.min(0.2 + clickCount[String(song.id)] * 0.05, 0.6)})` // emerald
                            } 0%, transparent 70%)`,
                            transform: `scale(${Math.min(1.5 + clickCount[String(song.id)] * 0.1, 3)})`,
                            filter: `blur(${Math.min(5 + clickCount[String(song.id)] * 0.5, 15)}px)`
                          }}
                        />
                      </motion.div>
                    </Button>
                  </motion.div>

                  {user?.isAdmin && (
                    <>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingSong(song)}
                          className={`flex gap-2 w-full sm:w-auto rounded-xl
                                    ${index % 5 === 0 ? 'border-2 border-pink-300/50 bg-gradient-to-r from-white to-pink-50 hover:border-pink-400' :
                                      index % 5 === 1 ? 'border-2 border-blue-300/50 bg-gradient-to-r from-white to-blue-50 hover:border-blue-400' :
                                      index % 5 === 2 ? 'border-2 border-purple-300/50 bg-gradient-to-r from-white to-purple-50 hover:border-purple-400' :
                                      index % 5 === 3 ? 'border-2 border-amber-300/50 bg-gradient-to-r from-white to-amber-50 hover:border-amber-400' :
                                      'border-2 border-emerald-300/50 bg-gradient-to-r from-white to-emerald-50 hover:border-emerald-400'}
                                    transition-all duration-300`}
                        >
                          <Edit2 className={`h-4 w-4 ${
                            index % 5 === 0 ? 'text-pink-500' :
                            index % 5 === 1 ? 'text-blue-500' :
                            index % 5 === 2 ? 'text-purple-500' :
                            index % 5 === 3 ? 'text-amber-500' :
                            'text-emerald-500'
                          }`} />
                          編輯
                        </Button>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteSong(song.id)}
                          className="flex gap-2 w-full sm:w-auto rounded-xl
                                    border-2 border-red-300/50 
                                    bg-gradient-to-r from-white to-red-50
                                    text-red-500 hover:text-red-600
                                    hover:border-red-400/70
                                    hover:shadow-sm hover:shadow-red-200
                                    transition-all duration-300"
                        >
                          <Trash2 className="h-4 w-4" />
                          刪除
                        </Button>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>

            </motion.div>
          ))}
        </div>

        {/* 載入更多按鈕 */}
        {hasMore && onLoadMore && (
          <div className="flex flex-col items-center py-4 mt-2">
            <Button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              variant="outline"
              className="w-full max-w-xs bg-gradient-to-r from-primary/5 to-primary/10 
                         border-primary/20 hover:border-primary/40 
                         hover:from-primary/10 hover:to-primary/20
                         transition-all duration-300"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  載入中...
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  載入更多歌曲 ({songs.length} / {totalCount || 0})
                </>
              )}
            </Button>
          </div>
        )}
      </ScrollArea>

      {selectedSongForShare && (
        <QRCodeShareModal
          isOpen={qrModalOpen}
          onClose={() => {
            setQrModalOpen(false);
            setSelectedSongForShare(null);
          }}
          songTitle={selectedSongForShare.title}
          songArtist={selectedSongForShare.artist}
          shareUrl={getShareUrl(selectedSongForShare.id)}
          songId={selectedSongForShare.id}
        />
      )}

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="sm:max-w-[425px]">
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