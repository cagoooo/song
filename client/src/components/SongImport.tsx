import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Import } from "lucide-react";

interface ImportSongInfo {
  title: string;
  artist: string;
}

interface SongImportProps {
  importSongInfo?: ImportSongInfo | null;
}

export default function SongImport({ importSongInfo }: SongImportProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  // 當 importSongInfo 變更時更新表單
  useEffect(() => {
    if (importSongInfo) {
      setTitle(importSongInfo.title);
      setArtist(importSongInfo.artist);
    }
  }, [importSongInfo]);

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
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          title, 
          artist, 
          notes,
        })
      });

      if (!response.ok) throw new Error("新增歌曲失敗");

      toast({
        title: "成功",
        description: "歌曲新增成功",
      });

      // 清空表單
      setTitle("");
      setArtist("");
      setNotes("");
    } catch (error) {
      toast({
        title: "錯誤",
        description: "新增歌曲失敗",
        variant: "destructive"
      });
      console.error('Failed to add song:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">歌曲名稱</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="請輸入歌曲名稱"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="artist">歌手</Label>
          <Input
            id="artist"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            required
            placeholder="請輸入歌手名稱"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">備註 (選填)</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="新增備註"
        />
      </div>

      <Button type="submit" className="w-full">
        <Import className="w-4 h-4 mr-2" />
        新增歌曲
      </Button>
    </form>
  );
}