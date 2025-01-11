import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Import, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useSongImport } from "@/lib/songImportContext";

export default function SongImport() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notes, setNotes] = useState("");
  const [batchSongs, setBatchSongs] = useState("");
  const { toast } = useToast();
  const { importedSong } = useSongImport();

  // 監聽從 Context 傳來的歌曲資訊
  useEffect(() => {
    if (importedSong) {
      setTitle(importedSong.title);
      setArtist(importedSong.artist);
      if (importedSong.notes) setNotes(importedSong.notes);
    }
  }, [importedSong]);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          artist, 
          notes,
        })
      });

      if (!response.ok) throw new Error("Failed to add song");

      toast({
        title: "成功",
        description: "歌曲新增成功",
      });

      setTitle("");
      setArtist("");
      setNotes("");
    } catch (error) {
      toast({
        title: "錯誤",
        description: "新增歌曲失敗",
        variant: "destructive"
      });
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Parse the batch input
      const songs = batchSongs.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
          const match = line.match(/「(.+)」-\s*(.+)/);
          if (!match) return null;
          return {
            title: match[1],
            artist: match[2].trim(),
          };
        })
        .filter((song): song is { title: string; artist: string } => song !== null);

      if (songs.length === 0) {
        toast({
          title: "錯誤",
          description: "請輸入有效的歌曲清單，格式：「歌名」- 歌手",
          variant: "destructive"
        });
        return;
      }

      const response = await fetch("/api/songs/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songs })
      });

      if (!response.ok) throw new Error("Failed to add songs");

      toast({
        title: "成功",
        description: `成功匯入 ${songs.length} 首歌曲`,
      });

      setBatchSongs("");
    } catch (error) {
      toast({
        title: "錯誤",
        description: "批次匯入失敗",
        variant: "destructive"
      });
    }
  };

  return (
    <motion.div
      layout
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Tabs defaultValue="single" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="single" className="text-sm sm:text-base">單首新增</TabsTrigger>
          <TabsTrigger value="batch" className="text-sm sm:text-base">批次匯入</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備註 (選填)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Button type="submit" className="w-full">
                <Import className="w-4 h-4 mr-2" />
                新增歌曲
              </Button>
            </motion.div>
          </form>
        </TabsContent>

        <TabsContent value="batch">
          <form onSubmit={handleBatchSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batchSongs" className="flex items-center gap-2">
                歌曲清單
                <span className="text-xs text-muted-foreground">
                  (每行一首，格式：「歌名」- 歌手)
                </span>
              </Label>
              <textarea
                id="batchSongs"
                value={batchSongs}
                onChange={(e) => setBatchSongs(e.target.value)}
                rows={8}
                className="min-h-[120px] sm:min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="「範例歌曲」- 範例歌手"
                required
              />
            </div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Button type="submit" className="w-full">
                <List className="w-4 h-4 mr-2" />
                批次匯入
              </Button>
            </motion.div>
          </form>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}