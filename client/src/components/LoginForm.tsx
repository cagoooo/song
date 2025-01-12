import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

interface LoginFormProps {
  onClose: () => void;
}

export default function LoginForm({ onClose }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const { login } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await login({ username, password });
      if (!result.ok) {
        toast({
          title: "錯誤",
          description: result.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "成功",
        description: "登入成功",
        variant: "success"  // 使用新的 success variant
      });
      onClose();
    } catch (error) {
      toast({
        title: "錯誤",
        description: "登入失敗",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border-2 border-amber-200/30">
        <DialogHeader>
          <DialogTitle>管理員登入</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">帳號</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-white/70 border-amber-200/50 focus:border-amber-300/60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密碼</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white/70 border-amber-200/50 focus:border-amber-300/60"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            登入
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}