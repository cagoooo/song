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
import { Lightbulb, Plus, Check, X, Trash2, Music2 } from "lucide-react";
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

      if (!response.ok) throw new Error('Failed to add suggestion');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
      setIsOpen(false);
      setTitle("");
      setArtist("");
      setSuggestedBy("");
      setNotes("");
      toast({
        title: "成功",
        description: "您的建議已送出，管理員會盡快審核",
      });
    },
    onError: () => {
      toast({
        title: "錯誤",
        description: "無法送出歌曲建議",
        variant: "destructive"
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const response = await fetch(`/api/suggestions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
      toast({
        title: "成功",
        description: "建議狀態已更新",
      });
    }
  });

  const deleteSuggestionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/suggestions/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete suggestion');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
      toast({
        title: "成功",
        description: "建議已刪除",
      });
    },
    onError: () => {
      toast({
        title: "錯誤",
        description: "無法刪除建議",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSuggestionMutation.mutate();
  };

  const generateGuitarTabsUrl = (song: SongSuggestion) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} 吉他譜 tab`);
    return `https://www.google.com/search?q=${searchQuery}`;
  };

  return (
    <div className="space-y-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="w-full border-2 border-primary/20 bg-white/80 hover:bg-white/90
                     shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                     hover:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                     transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            想點的歌還沒有？建議新歌給我們！
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
                className="bg-white/70 border-amber-200/50 focus:border-amber-300/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist">歌手</Label>
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                required
                className="bg-white/70 border-amber-200/50 focus:border-amber-300/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggestedBy">您的稱呼 (選填)</Label>
              <Input
                id="suggestedBy"
                value={suggestedBy}
                onChange={(e) => setSuggestedBy(e.target.value)}
                placeholder="讓大家知道是誰推薦的好歌！"
                className="bg-white/70 border-amber-200/50 focus:border-amber-300/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">為什麼想推薦這首歌？ (選填)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="分享一下您喜歡這首歌的原因..."
                className="bg-white/70 border-amber-200/50 focus:border-amber-300/60 min-h-[100px]"
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

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              歌曲建議列表
            </h3>
            <span className="text-sm text-muted-foreground">
              {suggestions.filter(s => s.status === "pending").length} 個待審核建議
            </span>
          </div>
          {suggestions.map((suggestion) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4 p-3 sm:p-4 rounded-lg border-2 border-primary/10 bg-gradient-to-br from-white via-amber-50/30 to-white shadow-[0_4px_12px_rgba(var(--primary),0.1)]"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h4 className="font-medium">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground">{suggestion.artist}</p>
                  {suggestion.suggestedBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      推薦者：{suggestion.suggestedBy}
                    </p>
                  )}
                  {suggestion.notes && (
                    <p className="text-sm mt-2 text-muted-foreground bg-amber-50/50 p-2 rounded-md">
                      {suggestion.notes}
                    </p>
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
                <span className={`text-xs px-2 py-1 rounded-full ${suggestion.status === "approved"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"}`}
                >
                  {suggestion.status === "approved" ? "已採納，即將新增" : "暫時無法採納"}
                </span>
              )}
              {isAdmin && (
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-red-200 text-red-600 hover:text-red-700 hover:border-red-300 transition-colors"
                    onClick={() => deleteSuggestionMutation.mutate(suggestion.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    刪除建議
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}