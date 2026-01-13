// 單一建議卡片元件
import { memo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Check, X, Trash2, Music2, FileText, PlusCircle,
    HeartPulse, Clock, User2
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    approveSuggestion,
    rejectSuggestion,
    removeSuggestion,
    addToPlaylist,
    type SongSuggestion as SongSuggestionType,
} from '@/hooks/use-suggestions';

// 工具函式
const formatFirebaseDate = (timestamp: any): string => {
    if (!timestamp) return '';
    try {
        let date: Date;
        if (timestamp.seconds !== undefined) {
            date = new Date(timestamp.seconds * 1000);
        } else if (timestamp._seconds !== undefined) {
            date = new Date(timestamp._seconds * 1000);
        } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
            date = new Date(timestamp);
        } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            date = timestamp.toDate();
        } else {
            date = new Date(timestamp);
        }
        if (isNaN(date.getTime())) return '';
        return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
        return '';
    }
};

const generateGuitarTabsUrl = (song: SongSuggestionType) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} guitar tabs`);
    return `https://www.google.com/search?q=${searchQuery}`;
};

const generateLyricsUrl = (song: SongSuggestionType) => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} 歌詞`);
    return `https://www.google.com/search?q=${searchQuery}`;
};

// 顏色配置
const colorSchemes = {
    pending: {
        gradient: 'from-amber-50 via-orange-50 to-amber-50',
        border: 'border-amber-200/40',
        title: 'from-amber-600 via-orange-600 to-amber-600',
        noteBg: 'from-amber-100/40 to-orange-100/40',
    },
    approved: {
        gradient: 'from-emerald-50 via-green-50 to-emerald-50',
        border: 'border-emerald-200/40',
        title: 'from-emerald-600 via-green-600 to-emerald-600',
        noteBg: 'from-emerald-100/40 to-green-100/40',
    },
    added_to_playlist: {
        gradient: 'from-blue-50 via-sky-50 to-blue-50',
        border: 'border-blue-200/40',
        title: 'from-blue-600 via-sky-600 to-blue-600',
        noteBg: 'from-blue-100/40 to-sky-100/40',
    },
    rejected: {
        gradient: 'from-gray-50 via-slate-50 to-gray-50',
        border: 'border-gray-200/40',
        title: 'from-slate-600 via-gray-600 to-slate-600',
        noteBg: 'from-gray-100/40 to-slate-100/40',
    },
};

interface SuggestionCardProps {
    suggestion: SongSuggestionType;
    index: number;
    isAdmin: boolean;
}

export const SuggestionCard = memo(function SuggestionCard({
    suggestion,
    index,
    isAdmin,
}: SuggestionCardProps) {
    const { toast } = useToast();
    const color = colorSchemes[suggestion.status as keyof typeof colorSchemes] || colorSchemes.pending;

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
            return status === 'approved' ? approveSuggestion(id) : rejectSuggestion(id);
        },
        onSuccess: (_, variables) => {
            toast({
                title: variables.status === 'approved' ? '建議已採納' : '建議已拒絕',
                description: variables.status === 'approved' ? '該歌曲將很快加入清單' : '該建議已被標記為拒絕',
            });
        },
    });

    const deleteSuggestionMutation = useMutation({
        mutationFn: async (id: string) => removeSuggestion(id),
        onSuccess: () => {
            toast({ title: '已刪除建議', description: '歌曲建議已被移除' });
        },
    });

    const addToPlaylistMutation = useMutation({
        mutationFn: async () => addToPlaylist(suggestion.id, suggestion.title, suggestion.artist),
        onSuccess: () => {
            toast({
                title: '成功加入歌單！',
                description: `「${suggestion.title} - ${suggestion.artist}」已加入歌單`,
            });
        },
        onError: (error: Error) => {
            toast({ title: '加入歌單失敗', description: error.message || '請稍後再試', variant: 'destructive' });
        },
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${color.gradient} border ${color.border} shadow-sm hover:shadow-md transition-all duration-300`}
        >
            {/* 狀態標籤 */}
            <div className="absolute top-0 right-0">
                {suggestion.status === 'pending' && <div className="bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md">待審</div>}
                {suggestion.status === 'approved' && <div className="bg-green-400 text-green-900 text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md">已採納</div>}
                {suggestion.status === 'added_to_playlist' && <div className="bg-blue-400 text-blue-900 text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md">已加入</div>}
                {suggestion.status === 'rejected' && <div className="bg-gray-400 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-bl-md">拒絕</div>}
            </div>

            <div className="p-3 sm:p-4">
                <div className="flex justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <h4 className={`text-base sm:text-lg font-bold truncate bg-gradient-to-r ${color.title} bg-clip-text text-transparent`}>
                            {suggestion.title}
                        </h4>
                        <p className="text-sm font-medium text-gray-700 truncate">{suggestion.artist}</p>
                        {suggestion.suggestedBy && (
                            <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                                <User2 className="w-3 h-3 text-gray-400" />
                                <span className="truncate">{suggestion.suggestedBy}</span>
                            </p>
                        )}
                    </div>

                    <div className="flex items-start gap-1.5 flex-shrink-0">
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="w-7 h-7 sm:w-8 sm:h-8 border border-primary/20 bg-white/90 hover:bg-white shadow-sm" asChild>
                                        <a href={generateGuitarTabsUrl(suggestion)} target="_blank" rel="noopener noreferrer">
                                            <Music2 className="w-3.5 h-3.5 text-primary" />
                                        </a>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs"><p>搜尋吉他譜</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" className="w-7 h-7 sm:w-8 sm:h-8 border border-primary/20 bg-white/90 hover:bg-white shadow-sm" asChild>
                                        <a href={generateLyricsUrl(suggestion)} target="_blank" rel="noopener noreferrer">
                                            <FileText className="w-3.5 h-3.5 text-primary" />
                                        </a>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs"><p>搜尋歌詞</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>

                {suggestion.notes && (
                    <p className={`text-xs sm:text-sm mt-2 p-2 rounded-md line-clamp-2 bg-gradient-to-r ${color.noteBg} text-gray-600`}>
                        {suggestion.notes}
                    </p>
                )}

                {suggestion.status !== 'pending' && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1
              ${suggestion.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' :
                                suggestion.status === 'added_to_playlist' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                    'bg-red-100 text-red-700 border border-red-200'}`}
                        >
                            {suggestion.status === 'approved' && <><Clock className="w-3 h-3" />即將新增</>}
                            {suggestion.status === 'added_to_playlist' && (
                                <>
                                    <HeartPulse className="w-3 h-3" />已加入
                                    {suggestion.processedAt && formatFirebaseDate(suggestion.processedAt) && (
                                        <span className="opacity-70">{formatFirebaseDate(suggestion.processedAt)}</span>
                                    )}
                                </>
                            )}
                            {suggestion.status === 'rejected' && <><X className="w-3 h-3" />無法採納</>}
                        </span>

                        {isAdmin && suggestion.status === 'approved' && (
                            <Button
                                size="sm"
                                className="h-6 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-2"
                                onClick={() => addToPlaylistMutation.mutate()}
                            >
                                <PlusCircle className="w-3 h-3 mr-1" />加入歌單
                            </Button>
                        )}
                    </div>
                )}

                {isAdmin && (
                    <div className="flex flex-wrap gap-1.5 pt-2 mt-2 border-t border-primary/10">
                        {suggestion.status === 'pending' && (
                            <>
                                <Button onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: 'approved' })} size="sm" className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-1">
                                    <Check className="w-3 h-3 mr-1" />採納
                                </Button>
                                <Button onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: 'rejected' })} variant="outline" size="sm" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 text-xs py-1">
                                    <X className="w-3 h-3 mr-1" />拒絕
                                </Button>
                            </>
                        )}
                        <Button onClick={() => deleteSuggestionMutation.mutate(suggestion.id)} variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 text-xs py-1">
                            <Trash2 className="w-3 h-3 mr-1" />刪除
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
});
