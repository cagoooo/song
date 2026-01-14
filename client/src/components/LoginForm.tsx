import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

interface LoginFormProps {
  onClose: () => void;
}

export default function LoginForm({ onClose }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login({ username, password });
      if (!result.ok) {
        toast({
          title: "錯誤",
          description: (result as any).message || "登入失敗",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "成功",
        description: "登入成功",
        variant: "success"
      });
      onClose();
    } catch (error) {
      toast({
        title: "錯誤",
        description: "登入失敗",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border-2 border-amber-200/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <LogIn className="w-5 h-5 text-amber-600" />
            管理員登入
          </DialogTitle>
          <DialogDescription>請輸入管理員帳號和密碼</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              帳號
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="請輸入管理員帳號"
              required
              disabled={isLoading}
              className="h-12 text-base bg-white/70 border-2 border-amber-200/50 
                focus:border-amber-400/60 rounded-lg"
              aria-label="管理員帳號"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              密碼
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                required
                disabled={isLoading}
                className="h-12 text-base pr-12 bg-white/70 border-2 border-amber-200/50 
                  focus:border-amber-400/60 rounded-lg"
                aria-label="密碼"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 
                  hover:bg-amber-100/50 rounded-lg"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <Eye className="w-4 h-4 text-gray-500" />
                )}
              </Button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || !username.trim() || !password.trim()}
            className="w-full h-12 text-base font-semibold
              bg-gradient-to-r from-amber-500 to-orange-500 
              hover:from-amber-600 hover:to-orange-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                登入中...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                登入
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}