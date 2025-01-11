import { useState } from "react";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lightbulb, Plus, Music2, FileText, Copy } from "lucide-react";
import { motion } from "framer-motion";
import type { SongSuggestion } from "@db/schema";
import { EditSongDialog } from "./EditSongDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SongSuggestion({ isAdmin = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [suggestedBy, setSuggestedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [showAddSongDialog, setShowAddSongDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SongSuggestion | null>(null);
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
        description: "您的建議已送出",
      });
    },
  });

  const handleSuggestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSuggestionMutation.mutate();
  };

  const handleImportSong = (suggestion: SongSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowAddSongDialog(true);
  };

  const generateSearchUrl = (song: SongSuggestion, type: 'tabs' | 'lyrics') => {
    const searchQuery = encodeURIComponent(
      `${song.title} ${song.artist} ${type === 'tabs' ? '吉他譜 tab' : '歌詞'}`
    );
    return `https://www.google.com/search?q=${searchQuery}`;
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
          <form onSubmit={handleSuggestionSubmit} className="space-y-4">
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
                placeholder="讓大家知道是誰推薦的好歌！"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">為什麼想推薦這首歌？ (選填)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="分享一下您喜歡這首歌的原因..."
              />
            </div>
            <Button type="submit" className="w-full">
              送出建議
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {selectedSuggestion && (
        <EditSongDialog
          isOpen={showAddSongDialog}
          onClose={() => {
            setShowAddSongDialog(false);
            setSelectedSuggestion(null);
          }}
          defaultValues={{
            title: selectedSuggestion.title,
            artist: selectedSuggestion.artist,
            notes: selectedSuggestion.notes
          }}
        />
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              歌曲建議列表
            </h3>
          </div>
          {suggestions.map((suggestion) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg border bg-white"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold">{suggestion.title}</h4>
                  <p className="text-sm text-gray-600">{suggestion.artist}</p>
                  {suggestion.notes && (
                    <p className="text-sm mt-2 text-gray-500">{suggestion.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-8"
                          asChild
                        >
                          <a
                            href={generateSearchUrl(suggestion, 'tabs')}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Music2 className="w-4 h-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>搜尋吉他譜</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-8"
                          asChild
                        >
                          <a
                            href={generateSearchUrl(suggestion, 'lyrics')}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>搜尋歌詞</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImportSong(suggestion)}
                      className="flex gap-2 border-2 border-emerald-200/50
                               text-emerald-600 hover:text-emerald-700 bg-white/80 hover:bg-white/90
                               hover:border-emerald-300/50 transition-all duration-300"
                    >
                      <Copy className="h-4 w-4" />
                      帶入歌曲資訊
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}