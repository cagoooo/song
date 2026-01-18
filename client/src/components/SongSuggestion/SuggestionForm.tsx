// 建議新歌曲表單對話框 - 含重複檢測功能
import { useState, useCallback, memo, useMemo } from 'react';
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
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Lightbulb, Plus, Music2, FileText, PlusCircle, Sparkles, CheckCircle, ThumbsUp } from 'lucide-react';
import { submitSuggestion } from '@/hooks/use-suggestions';
import type { Song } from '@/lib/firestore';

interface SuggestionFormProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    songs?: Song[];
    onNavigateToSong?: (songId: string) => void;
}

interface MatchedSong {
    song: Song;
    matchType: 'exact' | 'partial';
}

// 歌手選項按鈕 - 使用 memo 避免不必要的重渲染
const ArtistOption = memo(function ArtistOption({
    option,
    isSelected,
    onClick
}: {
    option: string;
    isSelected: boolean;
    onClick: () => void;
}) {
    const labels: Record<string, string> = {
        '不確定': '🤔 不確定歌手',
        '多人翻唱': '🎤 多人翻唱',
        '經典老歌': '🎵 經典老歌'
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors duration-150
                ${isSelected
                    ? 'bg-purple-500 text-white border-purple-500 shadow-md'
                    : 'bg-white/70 text-purple-600 border-purple-200 hover:bg-purple-100 active:bg-purple-200'}`}
        >
            {labels[option] || option}
        </button>
    );
});

export function SuggestionForm({ isOpen, onOpenChange, songs = [], onNavigateToSong }: SuggestionFormProps) {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [suggestedBy, setSuggestedBy] = useState('');
    const [notes, setNotes] = useState('');
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
    const [matchedSong, setMatchedSong] = useState<MatchedSong | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // 檢測歌曲是否已存在
    const checkDuplicate = useCallback((inputTitle: string, inputArtist: string): MatchedSong | null => {
        if (!inputTitle.trim() || songs.length === 0) return null;

        const normalizedTitle = inputTitle.trim().toLowerCase();
        const normalizedArtist = inputArtist.trim().toLowerCase();

        for (const song of songs) {
            const songTitle = song.title.toLowerCase();
            const songArtist = (song.artist || '').toLowerCase();

            // 完全匹配標題
            if (songTitle === normalizedTitle) {
                return { song, matchType: 'exact' };
            }

            // 部分匹配（包含關係）
            if (songTitle.includes(normalizedTitle) || normalizedTitle.includes(songTitle)) {
                // 如果歌手也相符，視為高度匹配
                if (normalizedArtist && songArtist.includes(normalizedArtist)) {
                    return { song, matchType: 'exact' };
                }
                return { song, matchType: 'partial' };
            }
        }

        return null;
    }, [songs]);

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

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();

        // 先檢測是否有重複歌曲
        const duplicate = checkDuplicate(title, artist);
        if (duplicate) {
            setMatchedSong(duplicate);
            setShowDuplicateDialog(true);
            return;
        }

        // 沒有重複，直接提交
        addSuggestionMutation.mutate();
    }, [title, artist, checkDuplicate, addSuggestionMutation]);

    const handleNavigateToSong = useCallback(() => {
        if (matchedSong && onNavigateToSong) {
            onOpenChange(false);
            setShowDuplicateDialog(false);
            onNavigateToSong(matchedSong.song.id);
            toast({
                title: '🎵 找到了！',
                description: `已跳轉至「${matchedSong.song.title}」，快來點播吧！`,
                variant: 'success',
            });
        }
    }, [matchedSong, onNavigateToSong, onOpenChange, toast]);

    const handleForceSubmit = useCallback(() => {
        setShowDuplicateDialog(false);
        addSuggestionMutation.mutate();
    }, [addSuggestionMutation]);

    const handleArtistSelect = useCallback((option: string) => {
        setArtist(option);
    }, []);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogTrigger asChild>
                    <Button
                        variant="default"
                        className="w-full text-base py-6 px-4 font-semibold
                           border-2 border-amber-400 
                           bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 
                           text-white
                           shadow-lg shadow-amber-400/30
                           active:scale-[0.98] transition-transform duration-150"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" />
                            <span>想點的歌還沒有？</span>
                            <span className="font-bold">建議新歌給我們！</span>
                        </div>
                    </Button>
                </DialogTrigger>

                <DialogContent className="w-[calc(100vw-2rem)] max-w-md bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 
                    border-none shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto rounded-xl">
                    {/* 頂部裝飾條 - 靜態 */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-80" />

                    {/* 背景裝飾 - 靜態 */}
                    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-200/40 to-transparent rounded-bl-full" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-200/40 to-transparent rounded-tr-full" />
                    </div>

                    <DialogHeader className="pb-2">
                        <DialogTitle className="text-xl sm:text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-500" />
                            建議新歌曲
                            <Sparkles className="w-5 h-5 text-purple-500" />
                        </DialogTitle>
                        <DialogDescription className="text-center px-3 py-2 bg-white/60 rounded-lg border border-indigo-100/50 text-gray-600 text-sm">
                            您的建議將會送交管理員審核。審核通過後，歌曲就會出現在可點播清單中！
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        {/* 歌曲名稱 */}
                        <div className="space-y-2">
                            <Label htmlFor="title" className="flex items-center gap-1.5 font-medium text-indigo-800">
                                <Music2 className="w-4 h-4 text-indigo-500" />
                                歌曲名稱
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="bg-white/80 border-2 border-indigo-200/60 focus:border-indigo-400 
                                    rounded-xl px-4 py-3 font-medium text-gray-800 
                                    transition-colors duration-150"
                                placeholder="輸入歌曲名稱"
                            />
                        </div>

                        {/* 歌手 */}
                        <div className="space-y-2">
                            <Label htmlFor="artist" className="flex items-center gap-1.5 font-medium text-purple-800">
                                <FileText className="w-4 h-4 text-purple-500" />
                                歌手 <span className="text-xs text-purple-500/80">(選填)</span>
                            </Label>
                            <Input
                                id="artist"
                                value={artist}
                                onChange={(e) => setArtist(e.target.value)}
                                placeholder="如不確定可留空或選擇下方選項"
                                className="bg-white/80 border-2 border-purple-200/60 focus:border-purple-400 
                                    rounded-xl px-4 py-3 font-medium text-gray-800 
                                    transition-colors duration-150"
                            />
                            <div className="flex flex-wrap gap-2 mt-2">
                                {['不確定', '多人翻唱', '經典老歌'].map((option) => (
                                    <ArtistOption
                                        key={option}
                                        option={option}
                                        isSelected={artist === option}
                                        onClick={() => handleArtistSelect(option)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* 您的稱呼 */}
                        <div className="space-y-2">
                            <Label htmlFor="suggestedBy" className="flex items-center gap-1.5 font-medium text-pink-800">
                                <PlusCircle className="w-4 h-4 text-pink-500" />
                                您的稱呼 <span className="text-xs text-pink-500/80">(選填)</span>
                            </Label>
                            <Input
                                id="suggestedBy"
                                value={suggestedBy}
                                onChange={(e) => setSuggestedBy(e.target.value)}
                                placeholder="讓大家知道是誰推薦的好歌！"
                                className="bg-white/80 border-2 border-pink-200/60 focus:border-pink-400 
                                    rounded-xl px-4 py-2.5 transition-colors duration-150"
                            />
                        </div>

                        {/* 推薦理由 */}
                        <div className="space-y-2">
                            <Label htmlFor="notes" className="flex items-center gap-1.5 font-medium text-indigo-800">
                                <Lightbulb className="w-4 h-4 text-indigo-500" />
                                為什麼想推薦這首歌？ <span className="text-xs text-indigo-500/80">(選填)</span>
                            </Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="分享一下您喜歡這首歌的原因..."
                                className="bg-white/70 border-2 border-indigo-200/50 focus:border-indigo-400 
                                    min-h-[80px] rounded-xl transition-colors duration-150 resize-none"
                            />
                        </div>

                        {/* 送出按鈕 */}
                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={addSuggestionMutation.isPending}
                                className="w-full py-5 rounded-xl font-bold text-white tracking-wide
                                   bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
                                   hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700
                                   shadow-lg shadow-purple-300/40
                                   active:scale-[0.98] transition-transform duration-150
                                   disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {addSuggestionMutation.isPending ? '送出中...' : '送出建議 ✨'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 重複歌曲提示對話框 */}
            <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                <AlertDialogContent className="max-w-md bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle className="w-6 h-6" />
                            🎉 好消息！這首歌已經在歌單中了
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p className="text-slate-600">
                                    {matchedSong?.matchType === 'exact'
                                        ? '我們找到了完全匹配的歌曲：'
                                        : '我們找到了類似的歌曲：'}
                                </p>
                                {matchedSong && (
                                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center">
                                                <Music2 className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-lg">{matchedSong.song.title}</p>
                                                <p className="text-sm text-slate-500">{matchedSong.song.artist || '未知歌手'}</p>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <span className="text-2xl font-bold text-emerald-600">{matchedSong.song.voteCount || 0}</span>
                                                <span className="text-xs text-slate-500 block">票</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <p className="text-sm text-slate-500">
                                    您可以直接前往點播這首歌，或繼續送出建議讓管理員審核。
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel
                            onClick={handleForceSubmit}
                            className="text-slate-600"
                        >
                            仍要送出建議
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleNavigateToSong}
                            className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                        >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            前往點播這首歌！
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
