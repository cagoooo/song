import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Song, User } from "@db/schema";
import { Music, ThumbsUp, Trash2, RotateCcw, Pencil } from "lucide-react";
import SearchBar from "./SearchBar";
import TagSelector from "./TagSelector";
import { AnimatePresence, motion } from "framer-motion";
import { Socket } from "socket.io-client";

interface SongListProps {
  songs: Song[];
  socket: Socket | null;
  user: User | null;
}

export default function SongList({ songs, socket, user }: SongListProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [votingId, setVotingId] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState<{ [key: number]: number }>({});
  const [isTouch, setIsTouch] = useState(false);
  const [lastVoteTime, setLastVoteTime] = useState<{ [key: number]: number }>({});
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedSongForShare, setSelectedSongForShare] = useState<Song | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);


  const handleVoteStart = (songId: number) => {
    const now = Date.now();
    const lastTime = lastVoteTime[songId] || 0;
    const timeDiff = now - lastTime;

    if (timeDiff < 50) return; // 防抖動：最小間隔50ms

    if (socket?.connected) {
      setVotingId(songId);
      socket.emit('vote', songId);

      // Update click count for animation
      setClickCount(prev => ({
        ...prev,
        [songId]: (prev[songId] || 0) + 1
      }));

      // Update last vote time
      setLastVoteTime(prev => ({
        ...prev,
        [songId]: now
      }));

      // Reset voting status after a shorter delay (50ms)
      setTimeout(() => {
        setVotingId(null);
      }, 50);

      // Clear any existing timeout for this song
      const timeoutKey = `timeout_${songId}`;
      if ((window as any)[timeoutKey]) {
        clearTimeout((window as any)[timeoutKey]);
        clearInterval((window as any)[`interval_${songId}`]);
      }

      // Set a new timeout for smooth recovery
      (window as any)[timeoutKey] = setTimeout(() => {
        const currentCount = clickCount[songId] || 0;
        const steps = 10; // Number of steps for smooth transition
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
        title: "錯誤",
        description: "無法連接到服務器",
        variant: "destructive"
      });
    }
  };

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
          {filteredSongs.map((song) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
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
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
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
                          ? `border-primary shadow-[0_0_${Math.min(15 + (clickCount[song.id] || 0) * 5, 30)}px_rgba(var(--primary),${Math.min(0.3 + (clickCount[song.id] || 0) * 0.1, 0.8)})]
                              bg-gradient-to-r 
                              ${clickCount[song.id] >= 10 ? 'from-purple-500 via-pink-500 to-rose-500 text-white' :
                                clickCount[song.id] >= 5 ? 'from-purple-400 via-pink-400 to-rose-400' :
                                'from-purple-300 via-pink-300 to-rose-300'}`
                          : 'border-primary/20 hover:border-primary/40'}
                        transition-all duration-150
                        transform-gpu
                        ${clickCount[song.id] > 0 ? 'scale-105' : 'scale-100'}
                        active:scale-95
                        select-none
                        touch-none
                      `}
                      style={{
                        transform: `scale(${Math.min(1 + (clickCount[song.id] || 0) * 0.05, 1.2)})`,
                        willChange: 'transform',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <ThumbsUp className={`h-4 w-4 ${votingId === song.id ? 'text-primary' : ''}`} />
                      <span className="relative">
                        點播
                        <AnimatePresence>
                          {clickCount[song.id] > 0 && (
                            <motion.div
                              className="absolute -top-1 left-1/2 -translate-x-1/2"
                              style={{ pointerEvents: "none" }}
                            >
                              <motion.span
                                key={`count-${clickCount[song.id]}`}
                                initial={{ opacity: 0, y: 10, scale: 0.5 }}
                                animate={{
                                  opacity: [0, 1, 0],
                                  y: [-10, -30],
                                  scale: Math.min(1 + (clickCount[song.id] * 0.3), 2.5),
                                  color: [
                                    "rgb(var(--primary))",
                                    "rgb(239, 68, 68)",
                                    "rgb(234, 179, 8)"
                                  ]
                                }}
                                transition={{
                                  duration: 0.5,
                                  ease: "easeOut"
                                }}
                                className="absolute font-bold text-primary"
                                style={{
                                  textShadow: `0 0 ${Math.min(10 + clickCount[song.id] * 2, 20)}px rgba(var(--primary), ${Math.min(0.3 + clickCount[song.id] * 0.1, 0.8)})`
                                }}
                              >
                                +{clickCount[song.id]}
                              </motion.span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </span>

                      {/* Fire effect */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                          opacity: clickCount[song.id] > 0 ? [0, Math.min(0.8 + (clickCount[song.id] * 0.05), 1), 0] : 0,
                          scale: clickCount[song.id] > 0 ? [0.5, Math.min(1.5 + (clickCount[song.id] * 0.1), 3)] : 0,
                          y: clickCount[song.id] > 0 ? [0, Math.min(-30 - (clickCount[song.id] * 2), -60)] : 0
                        }}
                        transition={{ duration: 0.5 }}
                        className="absolute left-1/2 -translate-x-1/2 -bottom-4"
                        style={{
                          zIndex: -1,
                          pointerEvents: 'none',
                          transformOrigin: 'bottom center'
                        }}
                      >
                        {/* Main fire */}
                        <div
                          className={`
                            w-8 h-16 bg-gradient-to-t from-orange-500 via-yellow-400 to-transparent
                            rounded-full blur-sm
                            ${clickCount[song.id] >= 10 ? 'opacity-100 scale-150' :
                              clickCount[song.id] >= 5 ? 'opacity-90 scale-125' :
                              'opacity-80'}
                          `}
                          style={{
                            animation: `pulse ${Math.max(1.5 - (clickCount[song.id] * 0.1), 0.5)}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                            transform: `scale(${Math.min(1 + (clickCount[song.id] * 0.1), 2)})`,
                            filter: `blur(${Math.min(3 + (clickCount[song.id] * 0.2), 8)}px)`
                          }}
                        />
                        {/* Inner fire core */}
                        <div
                          className={`
                            absolute inset-0 w-6 h-14 bg-gradient-to-t from-yellow-500 via-yellow-300 to-transparent
                            rounded-full blur-sm
                            ${clickCount[song.id] >= 10 ? 'opacity-100 scale-150' :
                              clickCount[song.id] >= 5 ? 'opacity-90 scale-125' :
                              'opacity-80'}
                          `}
                          style={{
                            animation: `pulse ${Math.max(1.2 - (clickCount[song.id] * 0.1), 0.3)}s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                            transform: `scale(${Math.min(1 + (clickCount[song.id] * 0.15), 2.2)})`,
                            filter: `blur(${Math.min(2 + (clickCount[song.id] * 0.15), 6)}px)`
                          }}
                        />
                        {/* Sparks */}
                        {Array.from({ length: Math.min(3 + Math.floor(clickCount[song.id] / 3), 12) }).map((_, index) => (
                          <motion.div
                            key={index}
                            className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{
                              opacity: [0, 0.8, 0],
                              scale: [0, 1, 0],
                              x: [0, (Math.random() - 0.5) * 50 * (1 + clickCount[song.id] * 0.2)],
                              y: [0, -40 - Math.random() * 30 * (1 + clickCount[song.id] * 0.1)]
                            }}
                            transition={{
                              duration: 0.5 + Math.random() * 0.3,
                              repeat: Infinity,
                              repeatDelay: Math.random() * 0.2
                            }}
                            style={{
                              left: '50%',
                              bottom: '100%',
                            }}
                          />
                        ))}
                        {/* Glow effect */}
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `radial-gradient(circle, rgba(255,166,0,${Math.min(0.2 + clickCount[song.id] * 0.05, 0.6)}) 0%, transparent 70%)`,
                            transform: `scale(${Math.min(1.5 + clickCount[song.id] * 0.1, 3)})`,
                            filter: `blur(${Math.min(5 + clickCount[song.id] * 0.5, 15)}px)`
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
                          className="flex gap-2 w-full sm:w-auto border-2 border-primary/20
                                  bg-white/80 hover:bg-white/90"
                        >
                          <Pencil className="h-4 w-4" />
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
                          className="flex gap-2 w-full sm:w-auto border-2 border-red-200/50
                                  text-red-500 hover:text-red-600 bg-white/80 hover:bg-white/90
                                  hover:border-red-300/50 transition-all duration-300"
                        >
                          <Trash2 className="h-4 w-4" />
                          刪除
                        </Button>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>

              <TagSelector song={song} isAdmin={user?.isAdmin ?? false} />
            </motion.div>
          ))}
        </div>
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
        <EditSongDialog
          song={editingSong}
          isOpen={Boolean(editingSong)}
          onClose={() => setEditingSong(null)}
        />
      )}
    </div>
  );
}