import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Plus, CopyCheck } from "lucide-react";

interface SongSuggestion {
  id: number;
  title: string;
  artist: string;
  suggestedBy: string | null;
  notes: string | null;
}

interface Props {
  isAdmin: boolean;
  onImportSong: (songInfo: { title: string; artist: string }) => void;
}

export default function SongSuggestion({ isAdmin, onImportSong }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [suggestedBy, setSuggestedBy] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const { data: suggestions = [], refetch } = useQuery<SongSuggestion[]>({
    queryKey: ['/api/suggestions'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !artist) {
      toast({
        title: "錯誤",
        description: "請填寫歌曲名稱和歌手",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist, suggestedBy, notes })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setIsOpen(false);
      setTitle("");
      setArtist("");
      setSuggestedBy("");
      setNotes("");

      await refetch();

      toast({
        title: "成功",
        description: "您的建議已送出，管理員會盡快審核",
      });
    } catch (error) {
      console.error('Failed to submit suggestion:', error);
      toast({
        title: "錯誤",
        description: "無法送出建議，請稍後再試",
        variant: "destructive"
      });
    }
  };

  const handleImportSongInfo = (suggestion: SongSuggestion) => {
    onImportSong({
      title: suggestion.title,
      artist: suggestion.artist
    });
    toast({
      title: "成功",
      description: "歌曲資訊已匯入到表單",
    });
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
              您的建議將會送交管理員審核，審核通過後，歌曲就會出現在可點播清單中！
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">歌曲名稱</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="請輸入歌曲名稱"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist">歌手</Label>
              <Input
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="請輸入歌手名稱"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggestedBy">您的稱呼 (選填)</Label>
              <Input
                id="suggestedBy"
                value={suggestedBy}
                onChange={(e) => setSuggestedBy(e.target.value)}
                placeholder="請輸入您的稱呼"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">備註 (選填)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="新增備註"
              />
            </div>
            <Button type="submit">送出建議</Button>
          </form>
        </DialogContent>
      </Dialog>

      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">歌曲建議列表</h3>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="p-4 border rounded-lg bg-card"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-medium">{suggestion.title}</h4>
                    <p className="text-sm text-muted-foreground">{suggestion.artist}</p>
                    {suggestion.suggestedBy && (
                      <p className="text-sm text-muted-foreground">
                        推薦者：{suggestion.suggestedBy}
                      </p>
                    )}
                    {suggestion.notes && (
                      <p className="mt-2 text-sm">{suggestion.notes}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImportSongInfo(suggestion)}
                    >
                      <CopyCheck className="w-4 h-4 mr-2" />
                      帶入歌曲資訊
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}