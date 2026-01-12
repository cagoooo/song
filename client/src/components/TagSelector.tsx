import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, Hash, X, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { type Song } from "@/lib/firestore";
import { useTags } from "@/hooks/use-tags";

interface TagSelectorProps {
  song: Song;
  isAdmin: boolean;
}

// 標籤顏色方案
const tagColors = [
  'from-rose-500/20 to-pink-500/20 text-rose-700',
  'from-blue-500/20 to-cyan-500/20 text-blue-700',
  'from-green-500/20 to-emerald-500/20 text-green-700',
  'from-amber-500/20 to-yellow-500/20 text-amber-700',
  'from-violet-500/20 to-purple-500/20 text-violet-700',
  'from-teal-500/20 to-cyan-500/20 text-teal-700',
];

export default function TagSelector({ song, isAdmin }: TagSelectorProps) {
  const [newTag, setNewTag] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { toast } = useToast();

  // 使用 Firestore hook
  const {
    tags,
    songTags,
    isLoadingTags,
    isLoadingSongTags,
    loadTags,
    loadSongTags,
    addTag,
    deleteTag,
    addSongTag,
    removeSongTag,
    error,
    clearError,
  } = useTags({ songId: song.id, autoLoad: false });

  // 當彈窗打開時載入標籤
  useEffect(() => {
    if (isPopoverOpen) {
      loadTags();
      loadSongTags(song.id);
    }
  }, [isPopoverOpen, song.id, loadTags, loadSongTags]);

  // 顯示錯誤訊息
  useEffect(() => {
    if (error) {
      toast({
        title: "錯誤",
        description: error,
        variant: "destructive"
      });
      clearError();
    }
  }, [error, toast, clearError]);

  // 新增標籤
  const handleAddTag = async () => {
    if (!newTag.trim()) return;

    setIsAdding(true);
    const result = await addTag(newTag.trim());
    setIsAdding(false);

    if (result) {
      toast({
        title: "成功",
        description: "標籤新增成功",
      });
      setNewTag("");
    }
  };

  // 刪除標籤
  const handleDeleteTag = async (tagId: string) => {
    const success = await deleteTag(tagId);
    if (success) {
      toast({
        title: "成功",
        description: "標籤已完全刪除",
      });
    }
  };

  // 為歌曲新增標籤
  const handleAddSongTag = async (tagId: string) => {
    // 檢查是否已存在
    if (songTags.some(t => t.id === tagId)) return;

    const success = await addSongTag(song.id, tagId);
    if (success) {
      toast({
        title: "成功",
        description: "標籤已加入歌曲",
      });
    }
  };

  // 從歌曲移除標籤
  const handleRemoveSongTag = async (tagId: string) => {
    setIsRemoving(tagId);
    const success = await removeSongTag(song.id, tagId);
    setIsRemoving(null);

    if (success) {
      toast({
        title: "成功",
        description: "標籤已從歌曲移除",
      });
    }
  };

  // 非管理員視圖
  if (!isAdmin) {
    return (
      <motion.div
        className="flex flex-wrap gap-2"
        layout
        transition={{ duration: 0.2 }}
      >
        {songTags.map((tag, index) => (
          <motion.div
            key={tag.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500 }}
          >
            <Badge
              variant="outline"
              className={`bg-gradient-to-r ${tagColors[index % tagColors.length]} border-0
                       shadow-[0_2px_8px_rgba(0,0,0,0.05)]`}
            >
              <Hash className="w-3 h-3 mr-1" />
              {tag.name}
            </Badge>
          </motion.div>
        ))}
      </motion.div>
    );
  }

  // 管理員視圖
  return (
    <motion.div layout transition={{ duration: 0.2 }}>
      {/* 當前歌曲標籤 */}
      <div className="flex flex-wrap gap-2 mb-2">
        {isLoadingSongTags ? (
          <div className="animate-pulse w-full h-8 bg-gray-200 rounded"></div>
        ) : songTags.length === 0 ? (
          <div className="text-sm text-gray-500 italic">尚未添加標籤</div>
        ) : (
          songTags.map((tag, index) => (
            <motion.div
              key={tag.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500 }}
            >
              <Badge
                variant="outline"
                className={`pr-1 group bg-gradient-to-r ${tagColors[index % tagColors.length]} border-0
                         hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]
                         transition-all duration-300`}
              >
                <Hash className="w-3 h-3 mr-1" />
                {tag.name}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleRemoveSongTag(tag.id)}
                  disabled={isRemoving === tag.id}
                  className={cn(
                    "ml-1.5 opacity-70 group-hover:opacity-100 transition-all duration-200 hover:text-red-600 focus:outline-none",
                    isRemoving === tag.id && "animate-pulse opacity-50"
                  )}
                >
                  {isRemoving === tag.id ? (
                    <span className="w-3 h-3 block rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                </motion.button>
              </Badge>
            </motion.div>
          ))
        )}
      </div>

      {/* 管理按鈕和彈出層 */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto border-2 border-primary/20 bg-gradient-to-r from-white to-primary/5 hover:from-primary/5 hover:to-white
                     shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                     hover:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                     hover:border-primary/40
                     transition-all duration-300"
          >
            <Tag className="w-4 h-4 mr-2 text-primary" />
            管理標籤
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[300px] sm:w-[340px] border-2 border-primary/20 bg-gradient-to-b from-white to-primary/5 shadow-lg p-4 rounded-xl"
          side="top"
          sideOffset={5}
        >
          <div className="space-y-5">
            {/* 新增標籤區塊 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5 text-primary/90">
                <Plus className="w-3.5 h-3.5" />
                新增標籤
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="輸入標籤名稱..."
                  className="h-9 text-sm bg-white/80 focus:bg-white focus:border-primary/40 focus:ring-1 focus:ring-primary/20 shadow-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button
                  size="sm"
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || isAdding}
                  className={cn(
                    "h-9 px-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white shadow-md hover:shadow-lg transition-all duration-300",
                    isAdding && "animate-pulse opacity-80"
                  )}
                >
                  {isAdding ? (
                    <span className="w-4 h-4 block rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 現有標籤列表 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5 text-primary/90">
                <Tag className="w-3.5 h-3.5" />
                現有標籤
              </Label>
              <ScrollArea className="h-[180px] sm:h-[220px] w-full mt-1.5 pr-2 bg-white/70 rounded-md shadow-inner">
                <div className="space-y-1.5 p-2">
                  {isLoadingTags ? (
                    <div className="animate-pulse space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : tags.length === 0 ? (
                    <div className="text-sm text-gray-500 italic text-center py-8">尚無標籤</div>
                  ) : (
                    tags.map((tag, index) => {
                      const isInSong = songTags.some(t => t.id === tag.id);

                      return (
                        <motion.div
                          key={tag.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                        >
                          <Badge
                            variant="outline"
                            className={`w-full justify-between cursor-pointer
                                    bg-gradient-to-r ${tagColors[index % tagColors.length]} border-0
                                    hover:shadow-md hover:scale-[1.01]
                                    transition-all duration-300 py-1.5 pl-2 pr-1`}
                            onClick={() => !isInSong && handleAddSongTag(tag.id)}
                          >
                            <div className="flex items-center">
                              <Hash className="w-3 h-3 mr-1.5 opacity-70" />
                              <span className="font-medium">{tag.name}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* 刪除標籤按鈕 */}
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                className="hover:text-red-600 focus:outline-none transition-colors duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTag(tag.id);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </motion.button>

                              {/* 已添加到歌曲的標籤顯示狀態和刪除選項 */}
                              {isInSong ? (
                                <div className="flex items-center gap-1.5 ml-1">
                                  <motion.span
                                    className="text-green-600"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                  >
                                    ✓
                                  </motion.span>

                                  <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.2 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="hover:text-red-600 focus:outline-none transition-colors duration-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSongTag(tag.id);
                                    }}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </motion.button>
                                </div>
                              ) : (
                                // 添加按鈕
                                <motion.button
                                  type="button"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="text-primary/70 hover:text-primary focus:outline-none ml-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddSongTag(tag.id);
                                  }}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </motion.button>
                              )}
                            </div>
                          </Badge>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </motion.div>
  );
}