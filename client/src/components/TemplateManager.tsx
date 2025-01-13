import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Settings2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Template } from "@db/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const templateSchema = z.object({
  name: z.string().min(1, "模板名稱不能為空"),
  settings: z.object({
    theme: z.string(),
    maxVotesPerSession: z.number(),
    allowDuplicates: z.boolean(),
  }).default({
    theme: "default",
    maxVotesPerSession: 3,
    allowDuplicates: false,
  }),
});

export default function TemplateManager() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  const form = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      settings: {
        theme: "default",
        maxVotesPerSession: 3,
        allowDuplicates: false,
      },
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (data: z.infer<typeof templateSchema>) => {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "成功",
        description: "模板建立成功",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "錯誤",
        description: error.message || "建立模板失敗",
        variant: "destructive",
      });
    },
  });

  async function onSubmit(data: z.infer<typeof templateSchema>) {
    createTemplate.mutate(data);
  }

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <PlusCircle className="w-4 h-4 mr-2" />
            建立新模板
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>建立新的點歌系統模板</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>模板名稱</FormLabel>
                    <FormControl>
                      <Input placeholder="輸入模板名稱" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={createTemplate.isPending}
              >
                {createTemplate.isPending ? "建立中..." : "建立模板"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {templates.length > 0 && (
        <div className="flex items-center gap-2">
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="選擇模板" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={String(template.id)}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon">
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
