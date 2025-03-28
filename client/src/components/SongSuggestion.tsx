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
import { 
  Lightbulb, Plus, Check, X, Trash2, Music2, FileText, PlusCircle, 
  HeartPulse, Clock, Music, Calendar, User2
} from "lucide-react";
import { motion } from "framer-motion";
import type { SongSuggestion } from "@db/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SongSuggestion({ isAdmin = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [suggestedBy, setSuggestedBy] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

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
            <DialogContent className="max-w-md bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-none shadow-[0_10px_50px_rgba(120,100,255,0.3),0_0_0_1px_rgba(120,113,254,0.3)] overflow-hidden">
              {/* 背景裝飾效果 */}
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,rgba(120,113,255,0.2),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(255,113,200,0.2),transparent_30%)]"></div>
              
              <motion.div 
                className="absolute -z-5 top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              <DialogHeader className="pb-2">
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, type: "spring" }}
                >
                  <DialogTitle className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                    ✨ 建議新歌曲 ✨
                  </DialogTitle>
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <DialogDescription className="text-center px-4 py-2 bg-white/50 rounded-lg border border-indigo-100/50 shadow-inner text-gray-600">
                    您的建議將會送交管理員審核。審核通過後，歌曲就會出現在可點播清單中！
                  </DialogDescription>
                </motion.div>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <motion.div 
                  className="space-y-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <Label htmlFor="title" className="flex items-center gap-1.5 font-medium text-indigo-800">
                    <Music2 className="w-4 h-4 text-indigo-500" />
                    歌曲名稱
                  </Label>
                  <div className="relative">
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="bg-white/70 border-2 border-indigo-200/50 focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-300/30 rounded-lg pl-3 pr-3 py-5 font-medium text-gray-800 shadow-inner"
                    />
                    <motion.span 
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400"
                      animate={{ opacity: title ? 1 : 0, scale: title ? [1, 1.5, 1] : 1 }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-2"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <Label htmlFor="artist" className="flex items-center gap-1.5 font-medium text-purple-800">
                    <FileText className="w-4 h-4 text-purple-500" />
                    歌手
                  </Label>
                  <div className="relative">
                    <Input
                      id="artist"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      required
                      className="bg-white/70 border-2 border-purple-200/50 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-300/30 rounded-lg pl-3 pr-3 py-5 font-medium text-gray-800 shadow-inner"
                    />
                    <motion.span 
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-400"
                      animate={{ opacity: artist ? 1 : 0, scale: artist ? [1, 1.5, 1] : 1 }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </div>
                </motion.div>
                
                <motion.div 
                  className="space-y-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  <Label htmlFor="suggestedBy" className="flex items-center gap-1.5 font-medium text-pink-800">
                    <PlusCircle className="w-4 h-4 text-pink-500" />
                    您的稱呼 <span className="text-xs text-pink-500/80">(選填)</span>
                  </Label>
                  <Input
                    id="suggestedBy"
                    value={suggestedBy}
                    onChange={(e) => setSuggestedBy(e.target.value)}
                    placeholder="讓大家知道是誰推薦的好歌！"
                    className="bg-white/70 border-2 border-pink-200/50 focus:border-pink-400/70 focus:ring-2 focus:ring-pink-300/30 rounded-lg pl-3 pr-3 py-2 shadow-inner"
                  />
                </motion.div>
                
                <motion.div 
                  className="space-y-2"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                >
                  <Label htmlFor="notes" className="flex items-center gap-1.5 font-medium text-indigo-800">
                    <Lightbulb className="w-4 h-4 text-indigo-500" />
                    為什麼想推薦這首歌？ <span className="text-xs text-indigo-500/80">(選填)</span>
                  </Label>
                  <div className="relative overflow-hidden rounded-lg">
                    <motion.div
                      className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-100/30 via-purple-100/30 to-pink-100/30 opacity-50"
                      animate={{ 
                        backgroundPosition: ['0% 0%', '100% 100%'] 
                      }}
                      transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
                      style={{ backgroundSize: '200% 200%' }}
                    />
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="分享一下您喜歡這首歌的原因..."
                      className="bg-white/60 border-2 border-indigo-200/40 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-300/30 min-h-[100px] shadow-inner"
                    />
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="pt-2"
                >
                  <Button
                    type="submit"
                    className="w-full py-6 rounded-lg font-bold text-white tracking-wide
                             border-none shadow-lg
                             bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
                             hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700
                             shadow-[0_4px_20px_rgba(120,87,255,0.3)]
                             hover:shadow-[0_6px_25px_rgba(120,87,255,0.5)]
                             transition-all duration-300 ease-out
                             hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <motion.span
                      animate={{ 
                        color: ['rgb(255,255,255)', 'rgb(240,240,255)', 'rgb(255,255,255)'],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="flex items-center justify-center gap-2"
                    >
                      <span>送出建議</span>
                      <motion.span 
                        animate={{ x: [0, 5, 0] }} 
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        ✨
                      </motion.span>
                    </motion.span>
                  </Button>
                </motion.div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-8 space-y-6">
          {/* 標題區塊 */}
          <div className="relative">
            <div className="absolute -left-2 sm:left-0 -top-6 w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 opacity-20 blur-xl"></div>
            <div className="absolute -right-2 sm:right-0 -top-3 w-12 h-12 rounded-full bg-gradient-to-br from-orange-300 to-red-500 opacity-20 blur-xl"></div>
            
            <motion.div 
              className="relative flex flex-wrap justify-between items-center gap-y-3 p-4 sm:p-5 rounded-xl 
                       bg-gradient-to-r from-amber-100/70 via-orange-50/70 to-amber-100/70 
                       border-2 border-amber-200/30 shadow-lg overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* 背景裝飾 */}
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.15),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(245,158,11,0.15),transparent_30%)]"></div>
              
              <motion.div 
                className="flex items-center gap-3"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="relative flex items-center justify-center">
                  <motion.div 
                    className="absolute inset-0 rounded-full bg-amber-500/20"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.2, 0.3, 0.2]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  />
                  <motion.div
                    animate={{
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{ duration: 5, repeat: Infinity }}
                  >
                    <Lightbulb className="w-7 h-7 text-amber-500 drop-shadow-md" />
                  </motion.div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700 bg-clip-text text-transparent">
                  社群歌曲推薦
                </h3>
              </motion.div>
              
              <motion.div 
                className="flex flex-wrap items-center gap-2 sm:gap-3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <span className="bg-gradient-to-r from-yellow-100 to-amber-100 px-3 py-1.5 rounded-full border border-yellow-200/70 shadow-sm flex items-center gap-1.5 text-sm text-yellow-700 font-medium">
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-yellow-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  {suggestions.filter(s => s.status === "pending").length} 個待審核
                </span>
                <span className="bg-gradient-to-r from-green-100 to-emerald-100 px-3 py-1.5 rounded-full border border-green-200/70 shadow-sm flex items-center gap-1.5 text-sm text-green-700 font-medium">
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-green-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  />
                  {suggestions.filter(s => s.status === "approved").length} 個已採納
                </span>
                <span className="bg-gradient-to-r from-blue-100 to-sky-100 px-3 py-1.5 rounded-full border border-blue-200/70 shadow-sm flex items-center gap-1.5 text-sm text-blue-700 font-medium">
                  <motion.div 
                    className="w-2 h-2 rounded-full bg-blue-500"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                  />
                  {suggestions.filter(s => s.status === "added_to_playlist").length} 個已加入
                </span>
              </motion.div>
            </motion.div>
          </div>
          
          {/* 建議列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {suggestions.map((suggestion, index) => {
              // 為不同狀態選擇不同的顏色主題
              const colors = {
                pending: {
                  gradient: 'from-amber-50 via-orange-50 to-amber-50',
                  border: 'border-amber-200/40',
                  glow: 'shadow-[0_0_30px_rgba(251,191,36,0.15)]',
                  title: 'from-amber-600 via-orange-600 to-amber-600',
                  noteBg: 'from-amber-100/40 to-orange-100/40',
                  shine: 'rgba(251,191,36,0.4)'
                },
                approved: {
                  gradient: 'from-emerald-50 via-green-50 to-emerald-50',
                  border: 'border-emerald-200/40',
                  glow: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]',
                  title: 'from-emerald-600 via-green-600 to-emerald-600',
                  noteBg: 'from-emerald-100/40 to-green-100/40',
                  shine: 'rgba(16,185,129,0.4)'
                },
                added_to_playlist: {
                  gradient: 'from-blue-50 via-sky-50 to-blue-50',
                  border: 'border-blue-200/40',
                  glow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
                  title: 'from-blue-600 via-sky-600 to-blue-600',
                  noteBg: 'from-blue-100/40 to-sky-100/40',
                  shine: 'rgba(59,130,246,0.4)'
                },
                rejected: {
                  gradient: 'from-gray-50 via-slate-50 to-gray-50',
                  border: 'border-gray-200/40',
                  glow: 'shadow-[0_0_20px_rgba(100,116,139,0.1)]',
                  title: 'from-slate-600 via-gray-600 to-slate-600',
                  noteBg: 'from-gray-100/40 to-slate-100/40',
                  shine: 'rgba(100,116,139,0.3)'
                }
              };
              
              const color = colors[suggestion.status as keyof typeof colors || 'pending'];
              
              return (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`
                    relative overflow-hidden
                    rounded-xl
                    bg-gradient-to-br ${color.gradient}
                    border-2 ${color.border}
                    ${color.glow}
                    hover:shadow-lg hover:scale-[1.02]
                    transition-all duration-500
                  `}
                >
                  {/* 閃光效果 */}
                  <motion.div
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    animate={{ 
                      background: [
                        `radial-gradient(circle at 0% 0%, ${color.shine}, transparent 50%)`,
                        `radial-gradient(circle at 100% 100%, ${color.shine}, transparent 50%)`,
                        `radial-gradient(circle at 0% 0%, ${color.shine}, transparent 50%)`
                      ],
                      opacity: [0, 0.3, 0]
                    }}
                    transition={{ duration: 7, repeat: Infinity, repeatType: 'reverse' }}
                  />
                  
                  {/* 狀態標籤 */}
                  <div className="absolute top-0 right-0">
                    {suggestion.status === 'pending' && (
                      <div className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-bl-md">
                        待審核
                      </div>
                    )}
                    {suggestion.status === 'approved' && (
                      <div className="bg-green-400 text-green-900 text-xs font-bold px-2 py-0.5 rounded-bl-md">
                        已採納
                      </div>
                    )}
                    {suggestion.status === 'added_to_playlist' && (
                      <div className="bg-blue-400 text-blue-900 text-xs font-bold px-2 py-0.5 rounded-bl-md">
                        已加入
                      </div>
                    )}
                    {suggestion.status === 'rejected' && (
                      <div className="bg-gray-400 text-gray-900 text-xs font-bold px-2 py-0.5 rounded-bl-md">
                        已拒絕
                      </div>
                    )}
                  </div>
                  
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <h4 className={`
                          text-xl font-bold mb-1
                          bg-gradient-to-r ${color.title}
                          bg-clip-text text-transparent
                        `}>
                          {suggestion.title}
                        </h4>
                        <p className="text-base font-medium text-gray-700">
                          {suggestion.artist}
                        </p>
                        {suggestion.suggestedBy && (
                          <p className="text-sm text-gray-600 mt-2 flex items-center gap-1.5">
                            <User2 className="w-3 h-3 text-gray-400" />
                            <span className="font-medium text-gray-800">
                              {suggestion.suggestedBy}
                            </span>
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 sm:flex-col md:flex-row">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                              >
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="w-9 h-9 border-2 border-primary/20 bg-white/90 hover:bg-white
                                          shadow-md hover:shadow-lg
                                          transition-all duration-300"
                                  asChild
                                >
                                  <a
                                    href={generateGuitarTabsUrl(suggestion)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Music2 className="w-4 h-4 text-primary" />
                                  </a>
                                </Button>
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-white/95 backdrop-blur-sm border-2 border-primary/20 shadow-lg p-2"
                            >
                              <p>搜尋「{suggestion.title} - {suggestion.artist}」的吉他譜</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                              >
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="w-9 h-9 border-2 border-primary/20 bg-white/90 hover:bg-white
                                          shadow-md hover:shadow-lg
                                          transition-all duration-300"
                                  asChild
                                >
                                  <a
                                    href={generateLyricsUrl(suggestion)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <FileText className="w-4 h-4 text-primary" />
                                  </a>
                                </Button>
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-white/95 backdrop-blur-sm border-2 border-primary/20 shadow-lg p-2"
                            >
                              <p>搜尋「{suggestion.title} - {suggestion.artist}」的歌詞</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    {suggestion.notes && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={`
                          relative overflow-hidden
                          text-sm mt-3 p-4 rounded-lg
                          bg-gradient-to-r ${color.noteBg}
                          border border-primary/5 shadow-inner
                        `}
                      >
                        <div className="absolute top-0 left-0 w-full h-full bg-white/30 opacity-50"></div>
                        <div className="relative">
                          <p className="leading-relaxed text-gray-700">{suggestion.notes}</p>
                        </div>
                      </motion.div>
                    )}

                    {suggestion.status !== "pending" && (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-wrap items-center gap-2 mt-4"
                      >
                        <motion.span
                          className={`
                            text-sm px-3 py-1.5 rounded-full inline-flex items-center gap-1
                            ${suggestion.status === "approved"
                              ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200"
                              : suggestion.status === "added_to_playlist"
                                ? "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200"
                                : "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200"}
                            shadow-sm
                          `}
                        >
                          {suggestion.status === "approved" ? (
                            <>
                              <Clock className="w-3.5 h-3.5 text-green-600" />
                              已採納，即將新增
                            </>
                          ) : suggestion.status === "added_to_playlist" ? (
                            <>
                              <HeartPulse className="w-3.5 h-3.5 text-blue-600" />
                              已新增到播放列表
                              {suggestion.processedAt && (
                                <span className="text-xs ml-1 opacity-70">
                                  {new Date(suggestion.processedAt).toLocaleDateString('zh-TW')}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5 text-red-600" />
                              暫時無法採納
                            </>
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
                        transition={{ delay: 0.3 }}
                        className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-primary/10"
                      >
                        {suggestion.status === "pending" && (
                          <>
                            <Button
                              onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "approved" })}
                              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500
                                       hover:from-green-600 hover:to-emerald-600
                                       border-none text-white py-5
                                       shadow-md hover:shadow-lg
                                       hover:scale-[1.02] active:scale-[0.98]
                                       transition-all duration-300"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              採納建議
                            </Button>
                            <Button
                              onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "rejected" })}
                              variant="outline"
                              className="flex-1 bg-white/80 border-2 border-red-200 text-red-600 py-5
                                       hover:text-red-700 hover:border-red-300 hover:bg-white
                                       shadow-md hover:shadow-lg
                                       hover:scale-[1.02] active:scale-[0.98]
                                       transition-all duration-300"
                            >
                              <X className="w-4 h-4 mr-2" />
                              拒絕建議
                            </Button>
                          </>
                        )}
                        
                        <Button
                          onClick={() => deleteSuggestionMutation.mutate(suggestion.id)}
                          variant="outline"
                          className="bg-white/80 border-2 border-red-200 text-red-600 py-2
                                   hover:text-red-700 hover:border-red-300 hover:bg-white
                                   shadow-md hover:shadow-lg
                                   hover:scale-[1.02] active:scale-[0.98]
                                   transition-all duration-300"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          刪除建議
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
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
              className="h-9 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 
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