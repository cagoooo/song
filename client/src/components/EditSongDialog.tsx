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
import { useMutation } from "@tanstack/react-query";
import type { Song } from "@db/schema";
import { useState } from "react";

interface EditSongDialogProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
}

export function EditSongDialog({ song, isOpen, onClose }: EditSongDialogProps) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [notes, setNotes] = useState(song.notes || "");
  const { toast } = useToast();

  const updateSongMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, artist, notes }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "歌曲資訊已更新",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "錯誤",
        description: "更新歌曲失敗",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSongMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>編輯歌曲資訊</DialogTitle>
            <DialogDescription>
              修改歌曲名稱或歌手名稱。請確認資訊正確性。
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
              disabled={updateSongMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateSongMutation.isPending ? "更新中..." : "確認更新"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
