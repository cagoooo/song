import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Song } from "@db/schema";
import { useState, useEffect } from "react";

interface EditSongDialogProps {
  song: Partial<Song> | null;
  isOpen: boolean;
  onClose: () => void;
  mode?: 'edit' | 'create';
}

export function EditSongDialog({ song, isOpen, onClose, mode = 'edit' }: EditSongDialogProps) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (song) {
      setTitle(song.title || "");
      setArtist(song.artist || "");
      setNotes(song.notes || "");
    }
  }, [song]);

  const songMutation = useMutation({
    mutationFn: async () => {
      const endpoint = mode === 'edit' && song?.id ? `/api/songs/${song.id}` : '/api/songs';
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, notes }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/songs'] });
      toast({
        title: "成功",
        description: mode === 'edit' ? "歌曲資訊已更新" : "歌曲已新增",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "錯誤",
        description: mode === 'edit' ? "更新歌曲失敗" : "新增歌曲失敗",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      toast({
        title: "錯誤",
        description: "請填寫歌曲名稱和歌手名稱",
        variant: "destructive",
      });
      return;
    }
    songMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? '編輯歌曲資訊' : '新增歌曲'}</DialogTitle>
            <DialogDescription>
              {mode === 'edit' 
                ? '修改歌曲名稱或歌手名稱。請確認資訊正確性。'
                : '新增歌曲至可點播清單。請確認資訊正確性。'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                歌名
              </Label>
              <Input
                id="title"
                className="col-span-3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="artist" className="text-right">
                歌手
              </Label>
              <Input
                id="artist"
                className="col-span-3"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                備註
              </Label>
              <Input
                id="notes"
                className="col-span-3"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="選填"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={songMutation.isPending}
              className="w-full sm:w-auto"
            >
              {songMutation.isPending 
                ? (mode === 'edit' ? "更新中..." : "新增中...") 
                : (mode === 'edit' ? "確認更新" : "確認新增")
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}