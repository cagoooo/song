import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { insertUserSchema } from "@db/schema";
import { useUser } from "@/hooks/use-user";
import { useState } from "react";

export default function AuthPage() {
  const { toast } = useToast();
  const { login, register } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: { username: string; password: string }) {
    setIsLoading(true);
    try {
      const result = await login(data);
      if (!result.ok) {
        toast({
          title: "錯誤",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "成功",
        description: "登入成功",
      });
    } catch (error) {
      toast({
        title: "錯誤",
        description: "發生錯誤，請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegister(data: { username: string; password: string }) {
    setIsLoading(true);
    try {
      const result = await register(data);
      if (!result.ok) {
        toast({
          title: "錯誤",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "成功",
        description: "註冊成功",
      });
    } catch (error) {
      toast({
        title: "錯誤",
        description: "發生錯誤，請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>登入/註冊</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>使用者名稱</FormLabel>
                    <FormControl>
                      <Input placeholder="輸入使用者名稱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密碼</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="輸入密碼" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  登入
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={form.handleSubmit(handleRegister)}
                >
                  註冊
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
