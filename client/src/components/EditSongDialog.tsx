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
import { useState } from "react";

export interface EditSongDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues?: {
    title: string;
    artist: string;
    notes?: string | null;
  };
}

export function EditSongDialog({ isOpen, onClose, defaultValues }: EditSongDialogProps) {
  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [artist, setArtist] = useState(defaultValues?.artist ?? "");
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const songMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, artist, notes }),
        credentials: 'include'
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
        description: "歌曲已新增到清單中",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "錯誤",
        description: "新增歌曲失敗",
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
            <DialogTitle>新增歌曲</DialogTitle>
            <DialogDescription>
              將歌曲新增至可點播清單。請確認資訊正確性。
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
              {songMutation.isPending ? "新增中..." : "確認新增"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}