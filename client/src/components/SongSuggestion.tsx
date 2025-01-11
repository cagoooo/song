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
import { Lightbulb, Plus, Check, X, Trash2 } from "lucide-react";
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
        body: JSON.stringify({ status })
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

  const addToSongsListMutation = useMutation({
    mutationFn: async (suggestionId: number) => {
      const response = await fetch(`/api/suggestions/${suggestionId}/add-to-songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to add to songs list');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/songs'] });
      toast({
        title: "成功",
        description: "歌曲已成功加入歌單",
      });
    },
    onError: () => {
      toast({
        title: "錯誤",
        description: "無法加入歌單",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSuggestionMutation.mutate();
  };

  const renderAdminControls = (suggestion: SongSuggestion) => {
    if (!isAdmin) return null;

    return (
      <div className="flex items-center gap-2">
        {suggestion.status === "pending" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="bg-green-50 hover:bg-green-100 text-green-600"
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
              className="bg-red-50 hover:bg-red-100 text-red-600"
              onClick={() => updateStatusMutation.mutate({
                id: suggestion.id,
                status: "rejected"
              })}
            >
              <X className="w-4 h-4" />
            </Button>
          </>
        )}
        {suggestion.status === "approved" && (
          <Button
            size="sm"
            variant="outline"
            className="bg-blue-50 hover:bg-blue-100 text-blue-600"
            onClick={() => addToSongsListMutation.mutate(suggestion.id)}
          >
            加入歌單
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            想點的歌還沒有？建議新歌給我們！
          </Button>
        </DialogTrigger>
        <DialogContent>
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
              <Label htmlFor="notes">為什麼想推薦這首歌？ (選填)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              送出建議
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              歌曲建議列表
            </h3>
            <span className="text-sm text-muted-foreground">
              {suggestions.filter(s => s.status === "pending").length} 個待審核建議
            </span>
          </div>

          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="p-4 rounded-lg border bg-card"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-semibold">{suggestion.title}</h4>
                  <p className="text-sm text-muted-foreground">{suggestion.artist}</p>
                  {suggestion.suggestedBy && (
                    <p className="text-sm text-muted-foreground mt-1">
                      推薦者：{suggestion.suggestedBy}
                    </p>
                  )}
                  {suggestion.notes && (
                    <p className="text-sm mt-2 p-2 bg-muted rounded-md">
                      {suggestion.notes}
                    </p>
                  )}
                </div>
                {renderAdminControls(suggestion)}
              </div>
              {suggestion.status !== "pending" && (
                <div className="mt-2">
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    suggestion.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : suggestion.status === "rejected"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {suggestion.status === "approved" 
                      ? "已採納，即將新增" 
                      : suggestion.status === "rejected"
                      ? "暫時無法採納"
                      : "已加入歌單"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}