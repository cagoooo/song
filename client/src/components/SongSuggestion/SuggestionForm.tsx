// 建議新歌曲表單對話框
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Lightbulb, Plus, Music2, FileText, PlusCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { submitSuggestion } from '@/hooks/use-suggestions';

interface SuggestionFormProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SuggestionForm({ isOpen, onOpenChange }: SuggestionFormProps) {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [suggestedBy, setSuggestedBy] = useState('');
    const [notes, setNotes] = useState('');
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const addSuggestionMutation = useMutation({
        mutationFn: async () => {
            return submitSuggestion(title, artist, suggestedBy, notes);
        },
        onSuccess: () => {
            toast({
                title: '建議送出成功！',
                description: '感謝您的推薦，我們會盡快審核！',
            });
            setTitle('');
            setArtist('');
            setSuggestedBy('');
            setNotes('');
            onOpenChange(false);
            queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
        },
        onError: (error: Error) => {
            toast({
                title: '提交失敗',
                description: error.message || '請稍後再試',
                variant: 'destructive',
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addSuggestionMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    className="w-full text-base py-6 px-4 font-semibold
                   border-2 border-amber-400 
                   bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 
                   text-white
                   shadow-[0_4px_15px_rgba(245,158,11,0.5)]
                   hover:shadow-[0_8px_25px_rgba(245,158,11,0.6)]
                   transition-all duration-300"
                >
                    <div className="flex items-center">
                        <Plus className="w-5 h-5 mr-3" />
                        <span>想點的歌還沒有？</span>
                        <span className="ml-1 font-bold">建議新歌給我們！</span>
                    </div>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-none shadow-[0_10px_50px_rgba(120,100,255,0.3),0_0_0_1px_rgba(120,113,254,0.3)] overflow-hidden">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,rgba(120,113,255,0.2),transparent_40%),radial-gradient(circle_at_20%_80%,rgba(255,113,200,0.2),transparent_30%)]" />

                {/* 靜態頂部裝飾條 */}
                <div className="absolute -z-5 top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70" />

                <DialogHeader className="pb-2">
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, type: 'spring' }}
                    >
                        <DialogTitle className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                            ✨ 建議新歌曲 ✨
                        </DialogTitle>
                    </motion.div>
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
                        <DialogDescription className="text-center px-4 py-2 bg-white/50 rounded-lg border border-indigo-100/50 shadow-inner text-gray-600">
                            您的建議將會送交管理員審核。審核通過後，歌曲就會出現在可點播清單中！
                        </DialogDescription>
                    </motion.div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <motion.div className="space-y-2" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.3 }}>
                        <Label htmlFor="title" className="flex items-center gap-1.5 font-medium text-indigo-800">
                            <Music2 className="w-4 h-4 text-indigo-500" />
                            歌曲名稱
                        </Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="bg-white/70 border-2 border-indigo-200/50 focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-300/30 rounded-lg pl-3 pr-3 py-5 font-medium text-gray-800 shadow-inner"
                        />
                    </motion.div>

                    <motion.div className="space-y-2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.4 }}>
                        <Label htmlFor="artist" className="flex items-center gap-1.5 font-medium text-purple-800">
                            <FileText className="w-4 h-4 text-purple-500" />
                            歌手 <span className="text-xs text-purple-500/80">(選填)</span>
                        </Label>
                        <Input
                            id="artist"
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                            placeholder="如不確定可留空或選擇下方選項"
                            className="bg-white/70 border-2 border-purple-200/50 focus:border-purple-400/70 focus:ring-2 focus:ring-purple-300/30 rounded-lg pl-3 pr-3 py-5 font-medium text-gray-800 shadow-inner"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {['不確定', '多人翻唱', '經典老歌'].map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setArtist(option)}
                                    className={`px-3 py-1.5 text-xs rounded-full border transition-all duration-200
                    ${artist === option
                                            ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                                            : 'bg-white/70 text-purple-600 border-purple-200 hover:bg-purple-100'}`}
                                >
                                    {option === '不確定' ? '🤔 不確定歌手' : option === '多人翻唱' ? '🎤 多人翻唱' : '🎵 經典老歌'}
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div className="space-y-2" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.5 }}>
                        <Label htmlFor="suggestedBy" className="flex items-center gap-1.5 font-medium text-pink-800">
                            <PlusCircle className="w-4 h-4 text-pink-500" />
                            您的稱呼 <span className="text-xs text-pink-500/80">(選填)</span>
                        </Label>
                        <Input
                            id="suggestedBy"
                            value={suggestedBy}
                            onChange={(e) => setSuggestedBy(e.target.value)}
                            placeholder="讓大家知道是誰推薦的好歌！"
                            className="bg-white/70 border-2 border-pink-200/50 focus:border-pink-400/70 focus:ring-2 focus:ring-pink-300/30 rounded-lg pl-3 pr-3 py-2 shadow-inner"
                        />
                    </motion.div>

                    <motion.div className="space-y-2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.6 }}>
                        <Label htmlFor="notes" className="flex items-center gap-1.5 font-medium text-indigo-800">
                            <Lightbulb className="w-4 h-4 text-indigo-500" />
                            為什麼想推薦這首歌？ <span className="text-xs text-indigo-500/80">(選填)</span>
                        </Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="分享一下您喜歡這首歌的原因..."
                            className="bg-white/60 border-2 border-indigo-200/40 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-300/30 min-h-[100px] shadow-inner"
                        />
                    </motion.div>

                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.7 }} className="pt-2">
                        <Button
                            type="submit"
                            className="w-full py-6 rounded-lg font-bold text-white tracking-wide
                       border-none shadow-lg
                       bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
                       hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700
                       shadow-[0_4px_20px_rgba(120,87,255,0.3)]
                       hover:shadow-[0_6px_25px_rgba(120,87,255,0.5)]
                       transition-all duration-300 ease-out
                       hover:scale-[1.02] active:scale-[0.98]"
                        >
                            送出建議 ✨
                        </Button>
                    </motion.div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
