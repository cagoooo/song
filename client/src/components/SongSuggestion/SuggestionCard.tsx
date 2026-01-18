// 單一建議卡片元件 - 效能優化版
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
    HeartPulse, Clock, User2, ExternalLink
} from 'lucide-react';
import {
    approveSuggestion,
    rejectSuggestion,
    removeSuggestion,
    addToPlaylist,
    type SongSuggestion as SongSuggestionType,
} from '@/hooks/use-suggestions';
import { getErrorToast } from '@/lib/error-handler';

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

// 不應加入搜尋的歌手選項
const EXCLUDED_ARTISTS = ['不確定', '多人翻唱', '經典老歌', '未知歌手'];

// 取得有效的歌手名稱（排除預設選項）
const getValidArtist = (artist: string | undefined): string => {
    if (!artist || EXCLUDED_ARTISTS.includes(artist)) {
        return '';
    }
    return artist;
};

const generateGuitarTabsUrl = (song: SongSuggestionType) => {
    const artist = getValidArtist(song.artist);
    const searchQuery = artist
        ? encodeURIComponent(`${song.title} ${artist} guitar tabs`)
        : encodeURIComponent(`${song.title} guitar tabs`);
    return `https://www.google.com/search?q=${searchQuery}`;
};

const generateLyricsUrl = (song: SongSuggestionType) => {
    const artist = getValidArtist(song.artist);
    const searchQuery = artist
        ? encodeURIComponent(`${song.title} ${artist} 歌詞`)
        : encodeURIComponent(`${song.title} 歌詞`);
    return `https://www.google.com/search?q=${searchQuery}`;
};

// 顏色配置 - 增強版
const colorSchemes = {
    pending: {
        gradient: 'from-amber-50/90 via-orange-50/90 to-amber-50/90',
        border: 'border-amber-200/60',
        hoverBorder: 'hover:border-amber-300',
        title: 'from-amber-600 via-orange-600 to-amber-600',
        noteBg: 'from-amber-100/60 to-orange-100/60',
        iconBg: 'from-amber-400 to-orange-500',
        shadowColor: 'shadow-amber-100/50 hover:shadow-amber-200/70',
        statusBg: 'bg-gradient-to-r from-amber-400 to-orange-400',
        statusText: 'text-white',
    },
    approved: {
        gradient: 'from-emerald-50/90 via-green-50/90 to-emerald-50/90',
        border: 'border-emerald-200/60',
        hoverBorder: 'hover:border-emerald-300',
        title: 'from-emerald-600 via-green-600 to-emerald-600',
        noteBg: 'from-emerald-100/60 to-green-100/60',
        iconBg: 'from-emerald-400 to-green-500',
        shadowColor: 'shadow-emerald-100/50 hover:shadow-emerald-200/70',
        statusBg: 'bg-gradient-to-r from-emerald-400 to-green-400',
        statusText: 'text-white',
    },
    added_to_playlist: {
        gradient: 'from-blue-50/90 via-sky-50/90 to-blue-50/90',
        border: 'border-blue-200/60',
        hoverBorder: 'hover:border-blue-300',
        title: 'from-blue-600 via-sky-600 to-blue-600',
        noteBg: 'from-blue-100/60 to-sky-100/60',
        iconBg: 'from-blue-400 to-sky-500',
        shadowColor: 'shadow-blue-100/50 hover:shadow-blue-200/70',
        statusBg: 'bg-gradient-to-r from-blue-400 to-sky-400',
        statusText: 'text-white',
    },
    rejected: {
        gradient: 'from-gray-50/90 via-slate-50/90 to-gray-50/90',
        border: 'border-gray-200/60',
        hoverBorder: 'hover:border-gray-300',
        title: 'from-slate-600 via-gray-600 to-slate-600',
        noteBg: 'from-gray-100/60 to-slate-100/60',
        iconBg: 'from-gray-400 to-slate-500',
        shadowColor: 'shadow-gray-100/50 hover:shadow-gray-200/70',
        statusBg: 'bg-gradient-to-r from-gray-400 to-slate-400',
        statusText: 'text-white',
    },
};

// 狀態標籤配置
const statusConfig = {
    pending: { label: '待審核', icon: Clock },
    approved: { label: '已採納', icon: Check },
    added_to_playlist: { label: '已加入', icon: HeartPulse },
    rejected: { label: '已拒絕', icon: X },
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
    const status = statusConfig[suggestion.status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = status.icon;

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
            toast(getErrorToast(error, '加入歌單失敗'));
        },
    });

    return (
        <div
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color.gradient} 
                border ${color.border} ${color.hoverBorder} shadow-lg ${color.shadowColor}
                transition-all duration-200 ease-out backdrop-blur-sm group
                hover:-translate-y-0.5 hover:shadow-xl
                animate-in fade-in slide-in-from-bottom-2`}
            style={{ animationDelay: `${index * 30}ms`, animationFillMode: 'backwards' }}
        >
            {/* 背景裝飾 */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/30 to-transparent rounded-bl-full" />

            {/* 狀態標籤 */}
            <div className="absolute top-0 right-0 z-10">
                <div className={`${color.statusBg} ${color.statusText} text-[10px] sm:text-xs font-bold 
                    px-2.5 py-1 rounded-bl-xl shadow-sm flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">{status.label}</span>
                </div>
            </div>

            <div className="relative p-3 sm:p-4 pt-6">
                {/* 歌曲資訊 - 加大字體 */}
                <div className="mb-2">
                    <h4 className={`text-lg sm:text-base font-bold truncate bg-gradient-to-r ${color.title} bg-clip-text text-transparent leading-tight`}>
                        {suggestion.title}
                    </h4>
                    <p className="text-sm font-medium text-gray-600 truncate mt-0.5">
                        {suggestion.artist || '未知歌手'}
                    </p>
                    {suggestion.suggestedBy && (
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                <User2 className="w-3 h-3 text-gray-500" />
                            </div>
                            <span className="text-xs text-gray-500 font-medium truncate">
                                {suggestion.suggestedBy} 推薦
                            </span>
                        </div>
                    )}
                </div>

                {/* 快速連結按鈕 - 加大尺寸 */}
                <div className="flex items-center gap-2 mb-2">
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 sm:h-8 px-3 rounded-lg border border-indigo-200 
                                        bg-indigo-50/80 hover:bg-indigo-100 hover:border-indigo-300
                                        shadow-sm transition-all duration-150
                                        active:scale-95"
                                    asChild
                                >
                                    <a href={generateGuitarTabsUrl(suggestion)} target="_blank" rel="noopener noreferrer">
                                        <Music2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-indigo-500 mr-1.5" />
                                        <span className="text-sm sm:text-xs text-indigo-600 font-medium">吉他譜</span>
                                    </a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs font-medium z-[100]">
                                <p className="flex items-center gap-1">搜尋此歌曲的吉他譜 <ExternalLink className="w-3 h-3" /></p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 sm:h-8 px-3 rounded-lg border border-rose-200 
                                        bg-rose-50/80 hover:bg-rose-100 hover:border-rose-300
                                        shadow-sm transition-all duration-150
                                        active:scale-95"
                                    asChild
                                >
                                    <a href={generateLyricsUrl(suggestion)} target="_blank" rel="noopener noreferrer">
                                        <FileText className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-rose-500 mr-1.5" />
                                        <span className="text-sm sm:text-xs text-rose-600 font-medium">歌詞</span>
                                    </a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs font-medium z-[100]">
                                <p className="flex items-center gap-1">搜尋此歌曲的歌詞 <ExternalLink className="w-3 h-3" /></p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* 推薦理由 - 加大字體 */}
                {suggestion.notes && (
                    <div className={`p-2.5 rounded-xl bg-gradient-to-r ${color.noteBg} 
                        border border-white/50 backdrop-blur-sm mb-2`}>
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                            「{suggestion.notes}」
                        </p>
                    </div>
                )}

                {/* 狀態詳情 */}
                {suggestion.status !== 'pending' && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 font-semibold
                            ${suggestion.status === 'approved' ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200' :
                                suggestion.status === 'added_to_playlist' ? 'bg-gradient-to-r from-blue-100 to-sky-100 text-blue-700 border border-blue-200' :
                                    'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border border-gray-200'}`}
                        >
                            {suggestion.status === 'approved' && <><Clock className="w-3 h-3" />即將新增</>}
                            {suggestion.status === 'added_to_playlist' && (
                                <>
                                    <HeartPulse className="w-3 h-3" />歌單已收錄
                                    {suggestion.processedAt && formatFirebaseDate(suggestion.processedAt) && (
                                        <span className="opacity-70 ml-1">({formatFirebaseDate(suggestion.processedAt)})</span>
                                    )}
                                </>
                            )}
                            {suggestion.status === 'rejected' && <><X className="w-3 h-3" />無法採納</>}
                        </span>

                        {isAdmin && suggestion.status === 'approved' && (
                            <Button
                                size="sm"
                                className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-green-500 
                                    hover:from-emerald-600 hover:to-green-600 text-white px-3 rounded-full
                                    shadow-md shadow-emerald-200/50 hover:shadow-lg 
                                    active:scale-95 transition-all duration-150"
                                onClick={() => addToPlaylistMutation.mutate()}
                            >
                                <PlusCircle className="w-3.5 h-3.5 mr-1" />加入歌單
                            </Button>
                        )}
                    </div>
                )}

                {/* 管理員操作區 */}
                {isAdmin && (
                    <div className="flex flex-wrap gap-2 pt-3 mt-2 border-t border-gray-200/50">
                        {suggestion.status === 'pending' && (
                            <>
                                <div className="flex-1">
                                    <Button
                                        onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: 'approved' })}
                                        size="sm"
                                        className="w-full bg-gradient-to-r from-emerald-500 to-green-500 
                                            hover:from-emerald-600 hover:to-green-600 text-white text-xs py-2 rounded-xl
                                            shadow-md shadow-emerald-200/50 hover:shadow-lg 
                                            active:scale-95 transition-all duration-150"
                                    >
                                        <Check className="w-3.5 h-3.5 mr-1.5" />採納
                                    </Button>
                                </div>
                                <div className="flex-1">
                                    <Button
                                        onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: 'rejected' })}
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-2 border-red-200 text-red-600 hover:bg-red-50 
                                            hover:border-red-300 text-xs py-2 rounded-xl 
                                            active:scale-95 transition-all duration-150"
                                    >
                                        <X className="w-3.5 h-3.5 mr-1.5" />拒絕
                                    </Button>
                                </div>
                            </>
                        )}
                        <Button
                            onClick={() => deleteSuggestionMutation.mutate(suggestion.id)}
                            variant="outline"
                            size="sm"
                            className="border-2 border-gray-200 text-gray-500 hover:bg-gray-50 
                                hover:border-gray-300 hover:text-red-500 text-xs py-2 px-3 rounded-xl 
                                active:scale-95 transition-all duration-150"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
});
