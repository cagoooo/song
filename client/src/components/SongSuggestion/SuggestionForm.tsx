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

// 歌手選項按鈕 — Editorial 雜誌風 chip
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
                    ? 'bg-[#2b4dff] text-white border-[#2b4dff]'
                    : 'bg-white text-slate-600 border-[rgba(17,17,17,0.18)] hover:border-[#2b4dff] hover:text-[#2b4dff]'}`}
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
                        className="w-full text-base py-6 px-4 font-semibold rounded-xl
                           border-0
                           bg-[#2b4dff] hover:bg-[#1d3bd8]
                           text-white
                           shadow-md hover:shadow-lg
                           active:scale-[0.98] transition-all duration-150"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" />
                            <span>想點的歌還沒有？</span>
                            <span className="font-bold">建議新歌給我們！</span>
                        </div>
                    </Button>
                </DialogTrigger>

                <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-0 overflow-hidden bg-[#faf7f0] border-[rgba(17,17,17,0.18)] max-h-[90vh] overflow-y-auto">
                    {/* 雜誌頂條 */}
                    <div className="editorial-modal-flag">
                        <span>Nº 12</span>
                        <span className="center">Reader’s Pick</span>
                        <span className="text-right">Side A</span>
                    </div>

                    <DialogHeader className="px-6 pt-5 pb-3 space-y-1">
                        <div
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.24em',
                                textTransform: 'uppercase',
                                color: 'var(--ed-ink-3)',
                            }}
                        >
                            Chapter · 推薦新歌
                        </div>
                        <DialogTitle
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 900,
                                fontSize: 28,
                                letterSpacing: '-0.02em',
                                color: 'var(--ed-ink-1)',
                                margin: 0,
                                lineHeight: 1.15,
                            }}
                            className="flex items-center gap-2"
                        >
                            <Sparkles className="w-5 h-5 text-[#2b4dff]" />
                            建議<span style={{ color: '#2b4dff' }}>新歌</span>
                        </DialogTitle>
                        <DialogDescription
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontSize: 14,
                                color: 'var(--ed-ink-2)',
                                lineHeight: 1.5,
                            }}
                        >
                            您的建議會交給阿凱老師審核，通過後就會出現在可點播清單中。
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6">
                        {/* 歌曲名稱 */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="title"
                                className="flex items-center gap-1.5"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                    fontWeight: 600,
                                }}
                            >
                                <Music2 className="w-3.5 h-3.5" />
                                Title · 歌曲名稱
                            </Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                className="h-11 bg-white border-[rgba(17,17,17,0.18)] focus:border-[#2b4dff] focus-visible:ring-2 focus-visible:ring-[#2b4dff]/20 rounded-md px-4 text-slate-900"
                                placeholder="輸入歌曲名稱"
                            />
                        </div>

                        {/* 歌手 */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="artist"
                                className="flex items-center gap-1.5"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                    fontWeight: 600,
                                }}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Artist · 歌手 <span className="text-[10px] text-slate-400 normal-case tracking-normal">(選填)</span>
                            </Label>
                            <Input
                                id="artist"
                                value={artist}
                                onChange={(e) => setArtist(e.target.value)}
                                placeholder="如不確定可留空或選擇下方選項"
                                className="h-11 bg-white border-[rgba(17,17,17,0.18)] focus:border-[#2b4dff] focus-visible:ring-2 focus-visible:ring-[#2b4dff]/20 rounded-md px-4 text-slate-900"
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
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="suggestedBy"
                                className="flex items-center gap-1.5"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                    fontWeight: 600,
                                }}
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                                Your Name · 您的稱呼 <span className="text-[10px] text-slate-400 normal-case tracking-normal">(選填)</span>
                            </Label>
                            <Input
                                id="suggestedBy"
                                value={suggestedBy}
                                onChange={(e) => setSuggestedBy(e.target.value)}
                                placeholder="讓大家知道是誰推薦的好歌！"
                                className="h-11 bg-white border-[rgba(17,17,17,0.18)] focus:border-[#2b4dff] focus-visible:ring-2 focus-visible:ring-[#2b4dff]/20 rounded-md px-4 text-slate-900"
                            />
                        </div>

                        {/* 推薦理由 */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="notes"
                                className="flex items-center gap-1.5"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 10,
                                    letterSpacing: '0.22em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                    fontWeight: 600,
                                }}
                            >
                                <Lightbulb className="w-3.5 h-3.5" />
                                Why · 為什麼想推薦 <span className="text-[10px] text-slate-400 normal-case tracking-normal">(選填)</span>
                            </Label>
                            <Textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="分享一下您喜歡這首歌的原因..."
                                className="min-h-[80px] bg-white border-[rgba(17,17,17,0.18)] focus:border-[#2b4dff] focus-visible:ring-2 focus-visible:ring-[#2b4dff]/20 rounded-md px-4 py-3 text-slate-900 resize-none"
                            />
                        </div>

                        {/* 送出按鈕 */}
                        <div className="pt-2">
                            <Button
                                type="submit"
                                disabled={addSuggestionMutation.isPending}
                                className="w-full h-12 rounded-md font-semibold text-white tracking-wide
                                   bg-[#2b4dff] hover:bg-[#1d3bd8]
                                   shadow-md hover:shadow-lg
                                   active:scale-[0.98] transition-all duration-150
                                   disabled:opacity-70 disabled:cursor-not-allowed"
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 13,
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {addSuggestionMutation.isPending ? '送出中…' : '送出建議 →'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 重複歌曲提示 — Editorial 米色卡 + 藍色 CTA */}
            <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                <AlertDialogContent className="max-w-md bg-[#faf7f0] border-[rgba(17,17,17,0.18)]">
                    <AlertDialogHeader>
                        <AlertDialogTitle
                            className="flex items-center gap-2"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 800,
                                fontSize: 22,
                                color: 'var(--ed-ink-1)',
                            }}
                        >
                            <CheckCircle className="w-6 h-6 text-[#2b4dff]" />
                            這首歌<span style={{ color: '#2b4dff' }}>已在</span>歌單中
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontStyle: 'italic',
                                        fontSize: 14,
                                        color: 'var(--ed-ink-2)',
                                    }}
                                >
                                    {matchedSong?.matchType === 'exact'
                                        ? '完全匹配的歌曲：'
                                        : '類似的歌曲：'}
                                </p>
                                {matchedSong && (
                                    <div className="p-4 bg-white rounded-md border border-[rgba(17,17,17,0.12)]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-md bg-slate-100 border border-[rgba(17,17,17,0.12)] flex items-center justify-center">
                                                <Music2 className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p
                                                    style={{
                                                        fontFamily: 'var(--font-display)',
                                                        fontWeight: 700,
                                                        fontSize: 16,
                                                        color: 'var(--ed-ink-1)',
                                                    }}
                                                >
                                                    {matchedSong.song.title}
                                                </p>
                                                <p
                                                    className="text-sm text-slate-500"
                                                    style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: 10,
                                                        letterSpacing: '0.14em',
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    {matchedSong.song.artist || '未知歌手'}
                                                </p>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <span
                                                    style={{
                                                        fontFamily: 'var(--font-display)',
                                                        fontStyle: 'italic',
                                                        fontWeight: 900,
                                                        fontSize: 26,
                                                        color: '#2b4dff',
                                                    }}
                                                >
                                                    {matchedSong.song.voteCount || 0}
                                                </span>
                                                <span className="text-xs text-slate-500 block">票</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <p className="text-sm text-slate-500">
                                    您可以直接前往點播這首歌，或繼續送出建議讓阿凱老師審核。
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel
                            onClick={handleForceSubmit}
                            className="text-slate-600 border-[rgba(17,17,17,0.18)]"
                        >
                            仍要送出建議
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleNavigateToSong}
                            className="bg-[#2b4dff] hover:bg-[#1d3bd8] text-white"
                        >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            前往點播
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
