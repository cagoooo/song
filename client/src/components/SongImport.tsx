import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Import, List, Music } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

export default function SongImport() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("");
  const [notes, setNotes] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [batchSongs, setBatchSongs] = useState("");
  const { toast } = useToast();

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 如果有音樂檔案，先上傳檔案
      let audioUrl = "";
      if (audioFile) {
        const formData = new FormData();
        formData.append("audio", audioFile);

        const uploadResponse = await fetch("/api/upload/audio", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload audio file");
        }

        const uploadResult = await uploadResponse.json();
        audioUrl = uploadResult.url;
      }

      // 建立歌曲資料
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          artist, 
          key, 
          notes,
          lyrics,
          audioUrl
        })
      });

      if (!response.ok) throw new Error("Failed to add song");

      toast({
        title: "成功",
        description: "歌曲新增成功",
      });

      setTitle("");
      setArtist("");
      setKey("");
      setNotes("");
      setLyrics("");
      setAudioFile(null);
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
        .filter(song => song !== null);

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="key">調性 (選填)</Label>
                <Input
                  id="key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">備註 (選填)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lyrics">歌詞 (選填)</Label>
              <div className="text-xs text-muted-foreground mb-1">
                格式：[mm:ss.xx]歌詞內容 (例：[00:01.00]第一句歌詞)
              </div>
              <Textarea
                id="lyrics"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={8}
                className="font-mono"
                placeholder="[00:00.00]歌詞第一句
[00:03.45]歌詞第二句"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audio">音樂檔案 (選填)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="audio"
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {audioFile && (
                  <div className="text-sm text-muted-foreground">
                    已選擇：{audioFile.name}
                  </div>
                )}
              </div>
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
              <Textarea
                id="batchSongs"
                value={batchSongs}
                onChange={(e) => setBatchSongs(e.target.value)}
                rows={8}
                className="min-h-[120px] sm:min-h-[200px]"
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