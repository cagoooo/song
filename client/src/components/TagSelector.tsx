import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, Hash, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Song } from "@db/schema";

interface TagSelectorProps {
  song: Song;
  isAdmin: boolean;
}

export default function TagSelector({ song, isAdmin }: TagSelectorProps) {
  const [newTag, setNewTag] = useState("");
  const { toast } = useToast();

  // 獲取所有標籤
  const { data: tags = [] } = useQuery({
    queryKey: ['/api/tags'],
    queryFn: async () => {
      const response = await fetch('/api/tags');
      if (!response.ok) throw new Error('Failed to fetch tags');
      return response.json();
    }
  });

  // 獲取歌曲的標籤
  const { data: songTags = [] } = useQuery({
    queryKey: ['/api/songs', song.id, 'tags'],
    queryFn: async () => {
      const response = await fetch(`/api/songs/${song.id}/tags`);
      if (!response.ok) throw new Error('Failed to fetch song tags');
      return response.json();
    }
  });

  // 新增標籤
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

  // 為歌曲新增標籤
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

  // 移除歌曲標籤
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
      <div className="flex flex-wrap gap-2">
        {songTags.map(tag => (
          <Badge key={tag.id} variant="secondary">
            <Hash className="w-3 h-3 mr-1" />
            {tag.name}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {songTags.map(tag => (
          <Badge key={tag.id} variant="secondary" className="pr-1">
            <Hash className="w-3 h-3 mr-1" />
            {tag.name}
            <button
              onClick={() => removeSongTagMutation.mutate(tag.id)}
              className="ml-1 hover:text-destructive"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Tag className="w-4 h-4 mr-2" />
            管理標籤
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div>
              <Label>新增標籤</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="輸入標籤名稱..."
                />
                <Button
                  size="sm"
                  onClick={() => addTagMutation.mutate()}
                  disabled={!newTag.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>現有標籤</Label>
              <ScrollArea className="h-[200px] w-full">
                <div className="space-y-2">
                  {tags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="w-full justify-between cursor-pointer hover:bg-secondary"
                      onClick={() => {
                        if (!songTags.some(t => t.id === tag.id)) {
                          addSongTagMutation.mutate(tag.id);
                        }
                      }}
                    >
                      {tag.name}
                      {songTags.some(t => t.id === tag.id) && (
                        <span className="text-green-500">✓</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
