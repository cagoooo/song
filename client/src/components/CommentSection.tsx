import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { Song, User } from "@db/schema";
import { motion, AnimatePresence } from "framer-motion";

interface CommentSectionProps {
  song: Song;
  user: User | null;
}

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  username: string;
}

export default function CommentSection({ song, user }: CommentSectionProps) {
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], isError, error } = useQuery<Comment[]>({
    queryKey: ['/api/songs', song.id, 'comments'],
    queryFn: async () => {
      const response = await fetch(`/api/songs/${song.id}/comments`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      return response.json();
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/songs/${song.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ['/api/songs', song.id, 'comments'] });
      toast({
        title: "成功",
        description: "評論已新增",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "錯誤",
        description: error.message || "新增評論失敗",
        variant: "destructive"
      });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await fetch(`/api/songs/${song.id}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/songs', song.id, 'comments'] });
      toast({
        title: "成功",
        description: "評論已刪除",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "錯誤",
        description: error.message || "刪除評論失敗",
        variant: "destructive"
      });
    }
  });

  if (isError) {
    return (
      <div className="text-sm text-destructive">
        {(error as Error).message || "載入評論失敗"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MessageSquare className="w-4 h-4" />
        評論 ({comments.length})
      </div>

      {user && (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (content.trim()) {
              addCommentMutation.mutate();
            }
          }}
          className="space-y-2"
        >
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="寫下你的評論..."
            rows={2}
          />
          <Button 
            type="submit" 
            disabled={!content.trim() || addCommentMutation.isPending} 
            size="sm"
          >
            {addCommentMutation.isPending ? "新增中..." : "新增評論"}
          </Button>
        </form>
      )}

      <ScrollArea className="h-[200px]">
        <AnimatePresence mode="popLayout">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="p-3 mb-2 rounded-lg bg-muted/50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium">{comment.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                      locale: zhTW
                    })}
                  </p>
                </div>
                {user?.isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                    disabled={deleteCommentMutation.isPending}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </ScrollArea>
    </div>
  );
}