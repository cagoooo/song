import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  HeartPulse, Clock, Music, Calendar, User2, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useSuggestions,
  submitSuggestion,
  approveSuggestion,
  rejectSuggestion,
  removeSuggestion,
  addToPlaylist,
  type SongSuggestion as SongSuggestionType,
} from "@/hooks/use-suggestions";

const formatFirebaseDate = (timestamp: any): string => {
  if (!timestamp) return '';

  try {
    let date: Date;

    if (timestamp.seconds !== undefined) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp._seconds !== undefined) {
      date = new Date(timestamp._seconds * 1000);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return '';

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  } catch {
    return '';
  }
};
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

export default function SongSuggestion({ isAdmin = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [suggestedBy, setSuggestedBy] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // 使用 Firestore hook 取代 API 呼叫
  const { suggestions } = useSuggestions();

  const addSuggestionMutation = useMutation({
    mutationFn: async () => {
      return submitSuggestion(title, artist, suggestedBy, notes);
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
    mutationFn: async ({ id, status }: { id: string, status: "approved" | "rejected" }) => {
      if (status === 'approved') {
        return approveSuggestion(id);
      } else {
        return rejectSuggestion(id);
      }
    },
    onSuccess: (_, variables) => {
      toast({
        title: variables.status === "approved" ? "建議已採納" : "建議已拒絕",
        description: variables.status === "approved"
          ? "該歌曲將很快加入清單"
          : "該建議已被標記為拒絕",
      });
    }
  });

  const deleteSuggestionMutation = useMutation({
    mutationFn: async (id: string) => {
      return removeSuggestion(id);
    },
    onSuccess: () => {
      toast({
        title: "已刪除建議",
        description: "歌曲建議已被移除",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSuggestionMutation.mutate();
  };

  const generateGuitarTabsUrl = (song: SongSuggestionType) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} guitar tabs`);
    return `https://www.google.com/search?q=${searchQuery}`;
  };

  const generateLyricsUrl = (song: SongSuggestionType) => {
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
                    歌手 <span className="text-xs text-purple-500/80">(選填)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="artist"
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      placeholder="如不確定可留空或選擇下方選項"
                      className="bg-white/70 border-2 border-purple-200/50 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-300/30 rounded-lg pl-3 pr-3 py-5 font-medium text-gray-800 shadow-inner"
                    />
                    <motion.span
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-400"
                      animate={{ opacity: artist ? 1 : 0, scale: artist ? [1, 1.5, 1] : 1 }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setArtist("不確定")}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200
                        ${artist === "不確定"
                          ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                          : 'bg-white/70 text-purple-600 border-purple-200 hover:bg-purple-100'}`}
                    >
                      🤔 不確定歌手
                    </button>
                    <button
                      type="button"
                      onClick={() => setArtist("多人翻唱")}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200
                        ${artist === "多人翻唱"
                          ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                          : 'bg-white/70 text-purple-600 border-purple-200 hover:bg-purple-100'}`}
                    >
                      🎤 多人翻唱
                    </button>
                    <button
                      type="button"
                      onClick={() => setArtist("經典老歌")}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200
                        ${artist === "經典老歌"
                          ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                          : 'bg-white/70 text-purple-600 border-purple-200 hover:bg-purple-100'}`}
                    >
                      🎵 經典老歌
                    </button>
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
        <Collapsible open={isListExpanded} onOpenChange={setIsListExpanded} className="mt-4">
          {/* 標題區塊 - 可點擊展開/收合 */}
          <CollapsibleTrigger asChild>
            <div className="relative cursor-pointer">
              <motion.div
                className="relative flex flex-wrap justify-between items-center gap-y-2 p-3 sm:p-4 rounded-xl 
                         bg-gradient-to-r from-amber-100/70 via-orange-50/70 to-amber-100/70 
                         border-2 border-amber-200/30 shadow-md overflow-hidden
                         hover:shadow-lg hover:border-amber-300/50 transition-all duration-300"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                  <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-700 via-orange-600 to-amber-700 bg-clip-text text-transparent">
                    社群歌曲推薦
                  </h3>
                  {isListExpanded ? (
                    <ChevronUp className="w-4 h-4 text-amber-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-amber-600" />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="bg-yellow-100 px-2 py-1 rounded-full border border-yellow-200/70 text-xs text-yellow-700 font-medium">
                    {suggestions.filter(s => s.status === "pending").length} 待審核
                  </span>
                  <span className="bg-green-100 px-2 py-1 rounded-full border border-green-200/70 text-xs text-green-700 font-medium">
                    {suggestions.filter(s => s.status === "approved").length} 已採納
                  </span>
                  <span className="bg-blue-100 px-2 py-1 rounded-full border border-blue-200/70 text-xs text-blue-700 font-medium">
                    {suggestions.filter(s => s.status === "added_to_playlist").length} 已加入
                  </span>
                </div>
              </motion.div>
            </div>
          </CollapsibleTrigger>

          {/* 建議列表 - 可收合 */}
          <CollapsibleContent>
            <ScrollArea className="mt-3 max-h-[400px] sm:max-h-[500px] pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`
                    relative overflow-hidden
                    rounded-lg
                    bg-gradient-to-br ${color.gradient}
                    border ${color.border}
                    shadow-sm hover:shadow-md
                    transition-all duration-300
                  `}
                    >
                      {/* 狀態標籤 */}
                      <div className="absolute top-0 right-0">
                        {suggestion.status === 'pending' && (
                          <div className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md">
                            待審
                          </div>
                        )}
                        {suggestion.status === 'approved' && (
                          <div className="bg-green-400 text-green-900 text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md">
                            已採納
                          </div>
                        )}
                        {suggestion.status === 'added_to_playlist' && (
                          <div className="bg-blue-400 text-blue-900 text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md">
                            已加入
                          </div>
                        )}
                        {suggestion.status === 'rejected' && (
                          <div className="bg-gray-400 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md">
                            拒絕
                          </div>
                        )}
                      </div>

                      <div className="p-3 sm:p-4">
                        <div className="flex justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className={`
                          text-base sm:text-lg font-bold truncate
                          bg-gradient-to-r ${color.title}
                          bg-clip-text text-transparent
                        `}>
                              {suggestion.title}
                            </h4>
                            <p className="text-sm font-medium text-gray-700 truncate">
                              {suggestion.artist}
                            </p>
                            {suggestion.suggestedBy && (
                              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                <User2 className="w-3 h-3 text-gray-400" />
                                <span className="truncate">{suggestion.suggestedBy}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-start gap-1.5 flex-shrink-0">
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-7 h-7 sm:w-8 sm:h-8 border border-primary/20 bg-white/90 hover:bg-white shadow-sm"
                                    asChild
                                  >
                                    <a href={generateGuitarTabsUrl(suggestion)} target="_blank" rel="noopener noreferrer">
                                      <Music2 className="w-3.5 h-3.5 text-primary" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <p>搜尋吉他譜</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="w-7 h-7 sm:w-8 sm:h-8 border border-primary/20 bg-white/90 hover:bg-white shadow-sm"
                                    asChild
                                  >
                                    <a href={generateLyricsUrl(suggestion)} target="_blank" rel="noopener noreferrer">
                                      <FileText className="w-3.5 h-3.5 text-primary" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  <p>搜尋歌詞</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>

                        {suggestion.notes && (
                          <p className={`
                        text-xs sm:text-sm mt-2 p-2 rounded-md line-clamp-2
                        bg-gradient-to-r ${color.noteBg}
                        text-gray-600
                      `}>
                            {suggestion.notes}
                          </p>
                        )}

                        {suggestion.status !== "pending" && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className={`
                          text-xs px-2 py-1 rounded-full inline-flex items-center gap-1
                          ${suggestion.status === "approved"
                                ? "bg-green-100 text-green-700 border border-green-200"
                                : suggestion.status === "added_to_playlist"
                                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                                  : "bg-red-100 text-red-700 border border-red-200"}
                        `}>
                              {suggestion.status === "approved" ? (
                                <>
                                  <Clock className="w-3 h-3" />
                                  即將新增
                                </>
                              ) : suggestion.status === "added_to_playlist" ? (
                                <>
                                  <HeartPulse className="w-3 h-3" />
                                  已加入
                                  {suggestion.processedAt && formatFirebaseDate(suggestion.processedAt) && (
                                    <span className="opacity-70">{formatFirebaseDate(suggestion.processedAt)}</span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <X className="w-3 h-3" />
                                  無法採納
                                </>
                              )}
                            </span>

                            {isAdmin && suggestion.status === "approved" && (
                              <AddToPlaylistButton suggestion={suggestion} />
                            )}
                          </div>
                        )}

                        {isAdmin && (
                          <div className="flex flex-wrap gap-1.5 pt-2 mt-2 border-t border-primary/10">
                            {suggestion.status === "pending" && (
                              <>
                                <Button
                                  onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "approved" })}
                                  size="sm"
                                  className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-1"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  採納
                                </Button>
                                <Button
                                  onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "rejected" })}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 text-xs py-1"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  拒絕
                                </Button>
                              </>
                            )}

                            <Button
                              onClick={() => deleteSuggestionMutation.mutate(suggestion.id)}
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-600 hover:bg-red-50 text-xs py-1"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              刪除
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

interface AddToPlaylistButtonProps {
  suggestion: SongSuggestionType;
}

function AddToPlaylistButton({ suggestion }: AddToPlaylistButtonProps) {
  const { toast } = useToast();

  const addToPlaylistMutation = useMutation({
    mutationFn: async () => {
      return addToPlaylist(suggestion.id, suggestion.title, suggestion.artist);
    },
    onSuccess: () => {
      toast({
        title: "成功加入歌單！",
        description: `「${suggestion.title} - ${suggestion.artist}」已加入歌單`,
      });
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            className="h-6 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2"
            onClick={() => addToPlaylistMutation.mutate()}
          >
            <PlusCircle className="w-3 h-3 mr-1" />
            加入歌單
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p>直接加入歌單</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}