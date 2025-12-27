import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { Song, Tag as TagType } from "@db/schema";

interface TagSelectorProps {
  song: Song;
  isAdmin: boolean;
}

interface SongTag extends TagType {
  id: number;
  name: string;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<number | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [hasLoadedTags, setHasLoadedTags] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // 清除錯誤訊息
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // 獲取所有標籤 - 只在管理員打開彈窗時載入
  const { data: tags = [], refetch: refetchTags } = useQuery<SongTag[]>({
    queryKey: ['/api/tags'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/tags');
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch tags');
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching tags:", error);
        return [];
      }
    },
    enabled: isPopoverOpen
  });

  // 獲取當前歌曲標籤 - 懶加載，只在需要時才載入
  const { 
    data: songTags = [], 
    refetch: refetchSongTags,
    isLoading: isSongTagsLoading
  } = useQuery<SongTag[]>({
    queryKey: ['/api/songs', song.id, 'tags'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/songs/${song.id}/tags`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch song tags');
        }
        setHasLoadedTags(true);
        return response.json();
      } catch (error) {
        console.error("Error fetching song tags:", error);
        return [];
      }
    },
    enabled: hasLoadedTags || isPopoverOpen
  });

  // 新增標籤
  const addTagMutation = useMutation({
    mutationFn: async () => {
      setIsAdding(true);
      setErrorMessage(null);
      
      try {
        const response = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newTag.trim() }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add tag');
        }
        
        return response.json();
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('標籤新增失敗');
        }
        throw error;
      } finally {
        setIsAdding(false);
      }
    },
    onSuccess: () => {
      setNewTag("");
      toast({
        title: "成功",
        description: "標籤新增成功",
      });
      refetchTags();
    },
    onError: (error) => {
      toast({
        title: "錯誤",
        description: error instanceof Error ? error.message : "標籤新增失敗",
        variant: "destructive"
      });
    }
  });

  // 將標籤添加到歌曲
  const addSongTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      setErrorMessage(null);
      
      try {
        const response = await fetch(`/api/songs/${song.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagId }),
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add song tag');
        }
        
        return response.json();
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "標籤已加入歌曲",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/songs', song.id, 'tags'] });
    },
    onError: (error) => {
      toast({
        title: "錯誤",
        description: error instanceof Error ? error.message : "新增歌曲標籤失敗",
        variant: "destructive"
      });
    }
  });

  // 從歌曲中移除標籤
  const removeSongTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      setIsRemoving(tagId);
      setErrorMessage(null);
      
      try {
        const response = await fetch(`/api/songs/${song.id}/tags/${tagId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to remove song tag');
        }
        
        return response.json();
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        }
        throw error;
      } finally {
        setIsRemoving(null);
      }
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "標籤已從歌曲移除",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/songs', song.id, 'tags'] });
    },
    onError: (error) => {
      toast({
        title: "錯誤",
        description: error instanceof Error ? error.message : "移除歌曲標籤失敗",
        variant: "destructive"
      });
    }
  });
  
  // 完全刪除標籤
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      setErrorMessage(null);
      
      try {
        const response = await fetch(`/api/tags/${tagId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete tag');
        }
        
        return response.json();
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "標籤已完全刪除",
      });
      // 重新加載所有標籤和當前歌曲的標籤
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/songs', song.id, 'tags'] });
    },
    onError: (error) => {
      toast({
        title: "錯誤",
        description: error instanceof Error ? error.message : "刪除標籤失敗",
        variant: "destructive"
      });
    }
  });

  // 非管理員視圖
  if (!isAdmin) {
    return (
      <motion.div 
        className="flex flex-wrap gap-2"
        layout
        transition={{ duration: 0.2 }}
      >
        {songTags.map((tag: SongTag, index) => (
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
        {isSongTagsLoading ? (
          <div className="animate-pulse w-full h-8 bg-gray-200 rounded"></div>
        ) : songTags.length === 0 ? (
          <div className="text-sm text-gray-500 italic">尚未添加標籤</div>
        ) : (
          songTags.map((tag: SongTag, index) => (
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
                  onClick={() => removeSongTagMutation.mutate(tag.id)}
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
      <Popover>
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
                />
                <Button
                  size="sm"
                  onClick={() => addTagMutation.mutate()}
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
              
              {/* 錯誤訊息顯示 */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div 
                    className="text-xs text-red-500 flex items-center gap-1 mt-1 px-2 py-1 bg-red-50 rounded border border-red-200"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 現有標籤列表 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5 text-primary/90">
                <Tag className="w-3.5 h-3.5" />
                現有標籤
              </Label>
              <ScrollArea className="h-[180px] sm:h-[220px] w-full mt-1.5 pr-2 bg-white/70 rounded-md shadow-inner">
                <div className="space-y-1.5 p-2">
                  {tags.length === 0 ? (
                    <div className="text-sm text-gray-500 italic text-center py-8">尚無標籤</div>
                  ) : (
                    tags.map((tag: SongTag, index) => (
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
                          onClick={() => {
                            // 只有當歌曲尚未添加此標籤時才執行添加操作
                            if (!songTags.some((t: SongTag) => t.id === tag.id)) {
                              addSongTagMutation.mutate(tag.id);
                            }
                          }}
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
                                deleteTagMutation.mutate(tag.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          
                            {/* 已添加到歌曲的標籤顯示狀態和刪除選項 */}
                            {songTags.some((t: SongTag) => t.id === tag.id) ? (
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
                                    removeSongTagMutation.mutate(tag.id);
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
                                  addSongTagMutation.mutate(tag.id);
                                }}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </motion.button>
                            )}
                          </div>
                        </Badge>
                      </motion.div>
                    ))
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