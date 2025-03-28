import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Lightbulb, Plus, Check, X, Trash2, Music2, FileText, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import type { SongSuggestion } from "@db/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SongSuggestion({ isAdmin = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [suggestedBy, setSuggestedBy] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suggestions = [] } = useQuery<SongSuggestion[]>({
    queryKey: ['/api/suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/suggestions');
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    }
  });

  const addSuggestionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist, suggestedBy, notes })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "建議送出成功！",
        description: "感謝您的推薦，我們會盡快審核！",
      });
      setTitle("");
      setArtist("");
      setSuggestedBy("");
      setNotes("");
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "提交失敗",
        description: error.message || "請稍後再試",
        variant: "destructive"
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: "approved" | "rejected" }) => {
      const response = await fetch(`/api/suggestions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.status === "approved" ? "建議已採納" : "建議已拒絕",
        description: variables.status === "approved" 
          ? "該歌曲將很快加入清單" 
          : "該建議已被標記為拒絕",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
    }
  });

  const deleteSuggestionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete suggestion');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "已刪除建議",
        description: "歌曲建議已被移除",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSuggestionMutation.mutate();
  };

  const generateGuitarTabsUrl = (song: SongSuggestion) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} guitar tabs`);
    return `https://www.google.com/search?q=${searchQuery}`;
  };

  const generateLyricsUrl = (song: SongSuggestion) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} 歌詞`);
    return `https://www.google.com/search?q=${searchQuery}`;
  };

  return (
    <div className="space-y-4">
      <div className="relative p-1 rounded-xl bg-gradient-to-r from-yellow-300 via-amber-500 to-orange-400 shadow-lg">
        <motion.div 
          animate={{ 
            boxShadow: ['0 0 8px rgba(251, 191, 36, 0.6)', '0 0 16px rgba(251, 191, 36, 0.8)', '0 0 8px rgba(251, 191, 36, 0.6)'],
            scale: [1, 1.02, 1]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            repeatType: "reverse" 
          }}
          className="absolute inset-0 rounded-xl opacity-70 pointer-events-none"
        />
        <div className="rounded-lg overflow-hidden">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                className="w-full text-base py-6 px-4 font-semibold
                         border-2 border-amber-400 
                         bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 
                         text-white
                         shadow-[0_4px_15px_rgba(245,158,11,0.5)]
                         hover:shadow-[0_8px_25px_rgba(245,158,11,0.6)]
                         transition-all duration-300"
              >
                <motion.div 
                  animate={{ scale: [1, 1.08, 1], rotate: [0, 3, 0, -3, 0] }} 
                  transition={{ 
                    scale: { duration: 1.5, repeat: Infinity, repeatType: "reverse" },
                    rotate: { duration: 2, repeat: Infinity }
                  }}
                  className="flex items-center"
                >
                  <Plus className="w-5 h-5 mr-3" />
                  <span className="relative">
                    想點的歌還沒有？
                    <motion.span 
                      className="absolute -top-1 -right-2 w-2 h-2 bg-white rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  </span>
                  <span className="ml-1 relative">
                    <span className="font-bold relative">
                      建議新歌給我們！
                      <motion.span 
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white/80"
                        animate={{ scaleX: [0, 1, 0], opacity: [0, 0.8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }}
                        style={{ transformOrigin: "left" }}
                      />
                    </span>
                  </span>
                </motion.div>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border-2 border-amber-200/30">
              <DialogHeader>
                <DialogTitle>建議新歌曲</DialogTitle>
                <DialogDescription>
                  您的建議將會送交管理員審核。審核通過後，歌曲就會出現在可點播清單中！
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">歌曲名稱</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-gradient-to-r from-rose-50/70 to-pink-50/70 border-amber-200/50 focus:border-amber-300/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">歌手</Label>
                  <Input
                    id="artist"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    required
                    className="bg-gradient-to-r from-amber-50/70 to-orange-50/70 border-amber-200/50 focus:border-amber-300/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suggestedBy">您的稱呼 (選填)</Label>
                  <Input
                    id="suggestedBy"
                    value={suggestedBy}
                    onChange={(e) => setSuggestedBy(e.target.value)}
                    placeholder="讓大家知道是誰推薦的好歌！"
                    className="bg-gradient-to-r from-orange-50/70 to-amber-50/70 border-amber-200/50 focus:border-amber-300/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">為什麼想推薦這首歌？ (選填)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="分享一下您喜歡這首歌的原因..."
                    className="bg-gradient-to-br from-amber-50/80 via-orange-50/80 to-amber-50/80 border-amber-200/50 focus:border-amber-300/60 min-h-[100px]"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  送出建議
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              歌曲建議列表
            </h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-md">
                {suggestions.filter(s => s.status === "pending").length} 個待審核
              </span>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md">
                {suggestions.filter(s => s.status === "approved").length} 個已採納
              </span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md">
                {suggestions.filter(s => s.status === "added_to_playlist").length} 個已加入
              </span>
            </div>
          </div>
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`
                relative overflow-hidden
                flex flex-col gap-4 p-4 sm:p-5 rounded-lg
                border-2 border-primary/10
                ${index % 2 === 0
                  ? 'bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50'
                  : 'bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50'}
                shadow-[0_4px_12px_rgba(var(--primary),0.1)]
                hover:shadow-[0_8px_24px_rgba(var(--primary),0.15)]
                transition-all duration-300
              `}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h4 className={`
                    text-lg font-semibold mb-1
                    ${index % 2 === 0
                      ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-purple-600'
                      : 'bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600'}
                    bg-clip-text text-transparent
                  `}>
                    {suggestion.title}
                  </h4>
                  <p className="text-base font-medium text-muted-foreground">
                    {suggestion.artist}
                  </p>
                  {suggestion.suggestedBy && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      推薦者：
                      <span className="font-medium text-foreground">
                        {suggestion.suggestedBy}
                      </span>
                    </p>
                  )}
                  {suggestion.notes && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className={`
                        text-sm mt-3 p-3 rounded-md
                        ${index % 2 === 0
                          ? 'bg-gradient-to-r from-rose-100/50 to-pink-100/50'
                          : 'bg-gradient-to-r from-blue-100/50 to-cyan-100/50'}
                        border border-primary/5
                      `}
                    >
                      {suggestion.notes}
                    </motion.p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 border-2 border-primary/20 bg-white/80 hover:bg-white/90
                                    shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                                    hover:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                                    transition-all duration-300"
                            asChild
                          >
                            <a
                              href={generateGuitarTabsUrl(suggestion)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Music2 className="w-4 h-4" />
                            </a>
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-white/90 backdrop-blur-sm border-2 border-primary/20 shadow-lg"
                      >
                        <p>點擊在 Google 中搜尋「{suggestion.title} - {suggestion.artist}」的吉他譜</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{
                            scale: 1.05,
                            transition: { duration: 0.2 }
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 border-2 border-primary/20 bg-white/80 hover:bg-white/90
                                    shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                                    hover:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                                    transition-all duration-300 relative group"
                            asChild
                          >
                            <a
                              href={generateLyricsUrl(suggestion)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center"
                            >
                              <FileText className="w-4 h-4 transition-transform group-hover:scale-110" />
                              <span className="sr-only">搜尋歌詞</span>
                            </a>
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-white/90 backdrop-blur-sm border-2 border-primary/20 shadow-lg"
                      >
                        <p>點擊在 Google 中搜尋「{suggestion.title} - {suggestion.artist}」的歌詞</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {isAdmin && suggestion.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-green-200 text-green-600 hover:text-green-700 hover:border-green-300 transition-colors"
                        onClick={() => updateStatusMutation.mutate({
                          id: suggestion.id,
                          status: "approved"
                        })}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-red-200 text-red-600 hover:text-red-700 hover:border-red-300 transition-colors"
                        onClick={() => updateStatusMutation.mutate({
                          id: suggestion.id,
                          status: "rejected"
                        })}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {suggestion.status !== "pending" && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <motion.span
                    className={`
                      text-sm px-3 py-1.5 rounded-full inline-flex items-center gap-1
                      ${suggestion.status === "approved"
                        ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200"
                        : suggestion.status === "added_to_playlist"
                          ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200"
                          : "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200"}
                    `}
                  >
                    {suggestion.status === "approved" ? (
                      "已採納，即將新增"
                    ) : suggestion.status === "added_to_playlist" ? (
                      <>
                        已新增到播放列表
                        {suggestion.processedAt && (
                          <span className="text-xs ml-1 opacity-70">
                            {new Date(suggestion.processedAt).toLocaleDateString('zh-TW')}
                          </span>
                        )}
                      </>
                    ) : (
                      "暫時無法採納"
                    )}
                  </motion.span>
                  
                  {isAdmin && suggestion.status === "approved" && (
                    <AddToPlaylistButton suggestion={suggestion} />
                  )}
                </motion.div>
              )}
              {isAdmin && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex justify-end"
                >
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteSuggestionMutation.mutate(suggestion.id)}
                    className="h-8 bg-gradient-to-r from-red-50 to-rose-50
                             border-2 border-red-200 text-red-600
                             hover:text-red-700 hover:border-red-300
                             transition-all duration-300"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    刪除建議
                  </Button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AddToPlaylistButtonProps {
  suggestion: SongSuggestion;
}

function AddToPlaylistButton({ suggestion }: AddToPlaylistButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const addToPlaylistMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: suggestion.title,
          artist: suggestion.artist,
          notes: suggestion.notes || '',
          suggestedBy: suggestion.suggestedBy || '',
          fromSuggestion: suggestion.id
        })
      });
      
      if (!response.ok) {
        throw new Error('加入歌單失敗');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "成功加入歌單！",
        description: `「${suggestion.title} - ${suggestion.artist}」已加入歌單`,
      });
      // 重新獲取歌曲列表和建議列表
      queryClient.invalidateQueries({ queryKey: ['/api/songs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "加入歌單失敗",
        description: error.message || "請稍後再試",
        variant: "destructive"
      });
    }
  });
  
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm"
              className="h-8 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 
                       text-white border-none shadow-md 
                       hover:shadow-lg transition-all"
              onClick={() => addToPlaylistMutation.mutate()}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              直接加入歌單
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="bg-white/90 backdrop-blur-sm border-2 border-emerald-200 shadow-lg"
          >
            <p>將這首歌直接加入到歌單中</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.div>
  );
}