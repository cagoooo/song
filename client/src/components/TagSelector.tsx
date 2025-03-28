import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, Hash, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import type { Song, Tag as TagType } from "@db/schema";

interface TagSelectorProps {
  song: Song;
  isAdmin: boolean;
}

interface SongTag extends TagType {
  id: number;
  name: string;
}

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
  const { toast } = useToast();

  const { data: tags = [] } = useQuery<SongTag[]>({
    queryKey: ['/api/tags'],
    queryFn: async () => {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    }
  });

  const { data: songTags = [] } = useQuery<SongTag[]>({
    queryKey: ['/api/songs', song.id, 'tags'],
    queryFn: async () => {
      const response = await fetch(`/api/songs/${song.id}/tags`);
      if (!response.ok) throw new Error('Failed to fetch song tags');
      return response.json();
    }
  });

  const addTagMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTag }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to add tag');
      return response.json();
    },
    onSuccess: () => {
      setNewTag("");
      toast({
        title: "成功",
        description: "標籤新增成功",
      });
    },
    onError: () => {
      toast({
        title: "錯誤",
        description: "標籤新增失敗",
        variant: "destructive"
      });
    }
  });

  const addSongTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const response = await fetch(`/api/songs/${song.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to add song tag');
      return response.json();
    },
    onError: () => {
      toast({
        title: "錯誤",
        description: "新增歌曲標籤失敗",
        variant: "destructive"
      });
    }
  });

  const removeSongTagMutation = useMutation({
    mutationFn: async (tagId: number) => {
      const response = await fetch(`/api/songs/${song.id}/tags/${tagId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to remove song tag');
      return response.json();
    },
    onError: () => {
      toast({
        title: "錯誤",
        description: "移除歌曲標籤失敗",
        variant: "destructive"
      });
    }
  });

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

  return (
    <motion.div layout transition={{ duration: 0.2 }}>
      <div className="flex flex-wrap gap-2 mb-2">
        {songTags.map((tag: SongTag, index) => (
          <motion.div
            key={tag.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500 }}
          >
            <Badge 
              variant="outline" 
              className={`pr-1 group bg-gradient-to-r ${tagColors[index % tagColors.length]} border-0
                       shadow-[0_2px_8px_rgba(0,0,0,0.05)]`}
            >
              <Hash className="w-3 h-3 mr-1" />
              {tag.name}
              <button
                onClick={() => removeSongTagMutation.mutate(tag.id)}
                className="ml-1 opacity-50 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          </motion.div>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full sm:w-auto border-2 border-primary/20 bg-white/80 hover:bg-white/90
                     shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                     hover:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                     transition-all duration-300"
          >
            <Tag className="w-4 h-4 mr-2" />
            管理標籤
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] sm:w-[320px] border-2 border-primary/20" side="top">
          <div className="space-y-4">
            <div>
              <Label className="text-sm">新增標籤</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="輸入標籤名稱..."
                  className="h-8 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => addTagMutation.mutate()}
                  disabled={!newTag.trim()}
                  className="h-8 px-2"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm">現有標籤</Label>
              <ScrollArea className="h-[160px] sm:h-[200px] w-full mt-1.5">
                <div className="space-y-1">
                  {tags.map((tag: SongTag, index) => (
                    <motion.div
                      key={tag.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge
                        variant="outline"
                        className={`w-full justify-between cursor-pointer
                                bg-gradient-to-r ${tagColors[index % tagColors.length]} border-0
                                hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]
                                transition-all duration-300`}
                        onClick={() => {
                          if (!songTags.some((t: SongTag) => t.id === tag.id)) {
                            addSongTagMutation.mutate(tag.id);
                          }
                        }}
                      >
                        {tag.name}
                        {songTags.some((t: SongTag) => t.id === tag.id) && (
                          <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <motion.button 
                              type="button"
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.9 }}
                              className="ml-1 hover:text-red-500 focus:outline-none"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSongTagMutation.mutate(tag.id);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </motion.button>
                          </div>
                        )}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </motion.div>
  );
}