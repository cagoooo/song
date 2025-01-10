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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Lightbulb, Plus, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import type { SongSuggestion } from "@db/schema";

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
        description: "歌曲建議已送出",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSuggestionMutation.mutate();
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
            我想點的歌還沒有...
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增歌曲建議</DialogTitle>
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
            <div className="space-y-2">
              <Label htmlFor="suggestedBy">您的稱呼 (選填)</Label>
              <Input
                id="suggestedBy"
                value={suggestedBy}
                onChange={(e) => setSuggestedBy(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">備註 (選填)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="例如：想聽這首歌的原因..."
              />
            </div>
            <Button type="submit" className="w-full">送出建議</Button>
          </form>
        </DialogContent>
      </Dialog>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            歌曲建議列表
          </h3>
          {suggestions.map((suggestion) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg border-2 border-primary/10
                       bg-gradient-to-br from-white via-amber-50/30 to-white
                       shadow-[0_4px_12px_rgba(var(--primary),0.1)]"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-medium">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground">{suggestion.artist}</p>
                  {suggestion.suggestedBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      建議者：{suggestion.suggestedBy}
                    </p>
                  )}
                  {suggestion.notes && (
                    <p className="text-sm mt-2 text-muted-foreground">{suggestion.notes}</p>
                  )}
                </div>
                {isAdmin && suggestion.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-green-200 text-green-600 hover:text-green-700
                               hover:border-green-300 transition-colors"
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
                      className="h-8 border-red-200 text-red-600 hover:text-red-700
                               hover:border-red-300 transition-colors"
                      onClick={() => updateStatusMutation.mutate({ 
                        id: suggestion.id, 
                        status: "rejected" 
                      })}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                {suggestion.status !== "pending" && (
                  <span className={`text-xs px-2 py-1 rounded-full
                    ${suggestion.status === "approved" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-red-100 text-red-700"}`}
                  >
                    {suggestion.status === "approved" ? "已採納" : "已婉拒"}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
