import { useState, useMemo, useCallback } from "react";
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
  DialogTrigger
} from "@/components/ui/dialog";
import { Music, ThumbsUp, Trash2, RotateCcw, PlayCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Song, User } from "@db/schema";
import SearchBar from "./SearchBar";
import TagSelector from "./TagSelector";
import { motion, AnimatePresence } from "framer-motion";
import FireworkEffect from "./FireworkEffect";
import { MusicPlayer } from "./MusicPlayer";
import QRCodeShareModal from "./QRCodeShareModal";

interface SongListProps {
  songs: Song[];
  ws: WebSocket | null;
  user: User | null;
}

export default function SongList({ songs, ws, user }: SongListProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [votingId, setVotingId] = useState<number | null>(null);
  const [voteCount, setVoteCount] = useState<{ [key: number]: number }>({});
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedSongForShare, setSelectedSongForShare] = useState<Song | null>(null);

  const filteredSongs = useMemo(() => {
    if (!searchTerm.trim()) return songs;
    const term = searchTerm.toLowerCase();
    return songs.filter(
      song =>
        song.title.toLowerCase().includes(term) ||
        song.artist.toLowerCase().includes(term)
    );
  }, [songs, searchTerm]);

  const voteForSong = useCallback((songId: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setVotingId(songId);

      // Update local counter for immediate feedback
      setVoteCount(prev => ({
        ...prev,
        [songId]: (prev[songId] || 0) + 1
      }));

      // Send vote to server
      ws.send(JSON.stringify({ type: 'VOTE', songId }));

      // Reset voting animation state after a short delay
      setTimeout(() => {
        setVotingId(null);
      }, 150);
    }
  }, [ws]);

  const handleShareClick = (song: Song) => {
    setSelectedSongForShare(song);
    setQrModalOpen(true);
  };

  const getShareUrl = (songId: number) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/songs/${songId}`;
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
      setVoteCount({});
    } catch (error) {
      toast({
        title: "錯誤",
        description: "無法重置點播次數",
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
                  {song.audioUrl && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSong(song)}
                          className="flex gap-2 relative overflow-hidden w-full sm:w-auto
                                 bg-gradient-to-r from-emerald-100 via-teal-100 to-cyan-100
                                 hover:from-emerald-200 hover:via-teal-200 hover:to-cyan-200
                                 border-2 border-emerald-500/20 hover:border-emerald-500/40
                                 transition-all duration-300"
                        >
                          <PlayCircle className="h-4 w-4" />
                          播放
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl">
                        <MusicPlayer
                          song={song}
                          onClose={() => setSelectedSong(null)}
                        />
                      </DialogContent>
                    </Dialog>
                  )}

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative w-full sm:w-auto"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => voteForSong(song.id)}
                      className={`
                        flex gap-2 relative overflow-hidden w-full
                        bg-gradient-to-r from-purple-100 via-pink-100 to-rose-100
                        hover:from-purple-200 hover:via-pink-200 hover:to-rose-200
                        border-2 select-none
                        ${votingId === song.id
                          ? 'border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]'
                          : 'border-primary/20 hover:border-primary/40'}
                        transition-all duration-300
                      `}
                    >
                      <ThumbsUp className={`h-4 w-4 ${votingId === song.id ? 'text-primary' : ''}`} />
                      點播
                      <AnimatePresence mode="wait">
                        {voteCount[song.id] > 0 && (
                          <motion.span
                            key={`vote-${song.id}-${voteCount[song.id]}`}
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ 
                              opacity: 1, 
                              scale: [0.5, 1.2, 1], 
                              y: [-20, -30, -20],
                            }}
                            exit={{ opacity: 0, scale: 0.5, y: -40 }}
                            transition={{
                              duration: 0.3,
                              times: [0, 0.6, 1],
                              ease: "easeOut"
                            }}
                            className="absolute -top-2 -right-2 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full"
                          >
                            +{voteCount[song.id]}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                    <FireworkEffect isVisible={votingId === song.id} />
                  </motion.div>

                  {user?.isAdmin && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSong(song.id)}
                        className="flex gap-2 w-full border-2 border-red-200/50
                                 text-red-500 hover:text-red-600 bg-white/80 hover:bg-white/90
                                 hover:border-red-300/50 transition-all duration-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        刪除
                      </Button>
                    </motion.div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShareClick(song)}
                    className="flex gap-2 w-full border-2 border-green-500/20 hover:border-green-500/40 text-green-600 bg-white/80 hover:bg-white/90 transition-all duration-300"
                  >
                    分享
                  </Button>
                </div>
              </div>

              <TagSelector song={song} isAdmin={user?.isAdmin ?? false} />
            </motion.div>
          ))}
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
    </div>
  );
}