import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Import, List, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { addSong, batchImportSongs } from "@/lib/firestore";

export default function SongImport() {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notes, setNotes] = useState("");
  const [batchSongs, setBatchSongs] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addSong(title, artist, notes || undefined);

      toast({
        title: "成功",
        description: "歌曲新增成功",
        className: "bg-green-50 border-green-200 text-green-800",
      });

      setTitle("");
      setArtist("");
      setNotes("");
    } catch (error: any) {
      if (error.message?.includes("已存在")) {
        toast({
          title: "歌曲已存在",
          description: error.message,
          className: "bg-amber-50 border-amber-200 text-amber-800",
        });
      } else {
        toast({
          title: "錯誤",
          description: "新增歌曲失敗",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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

      const result = await batchImportSongs(songs);

      toast({
        title: "匯入完成",
        description: `成功匯入 ${result.added} 首歌曲${result.skipped > 0 ? `，跳過 ${result.skipped} 首重複` : ''}`,
        className: result.skipped > 0
          ? "bg-amber-50 border-amber-200 text-amber-800"
          : "bg-green-50 border-green-200 text-green-800",
      });

      setBatchSongs("");
    } catch (error) {
      toast({
        title: "錯誤",
        description: "批次匯入失敗",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full flex items-center justify-between p-3 mb-2
                     bg-gradient-to-r from-primary/5 to-primary/10
                     border-primary/20 hover:border-primary/40
                     hover:from-primary/10 hover:to-primary/20
                     transition-all duration-300"
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            新增歌曲區塊
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full pt-2"
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
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    <Import className="w-4 h-4 mr-2" />
                    {isSubmitting ? "新增中..." : "新增歌曲"}
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
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    <List className="w-4 h-4 mr-2" />
                    {isSubmitting ? "匯入中..." : "批次匯入"}
                  </Button>
                </motion.div>
              </form>
            </TabsContent>
          </Tabs>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}