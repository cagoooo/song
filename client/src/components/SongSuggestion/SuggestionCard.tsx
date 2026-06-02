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
    HeartPulse, Clock, User2, ExternalLink, CheckSquare, Square
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

// Editorial 雜誌風配色 — 4 種狀態用色相一致但深淺不同
// pending=藍底 / approved=米色+藍邊 / added=藍底全填 / rejected=灰
const colorSchemes = {
    pending: {
        cardBg: '#ffffff',
        cardBorder: 'rgba(43, 77, 255, 0.18)',
        statusBg: '#2b4dff',
        statusText: 'text-white',
        accentColor: '#2b4dff',
    },
    approved: {
        cardBg: '#faf7f0',
        cardBorder: 'rgba(17, 17, 17, 0.18)',
        statusBg: 'rgba(43, 77, 255, 0.12)',
        statusText: 'text-[#2b4dff]',
        accentColor: '#2b4dff',
    },
    added_to_playlist: {
        cardBg: '#ffffff',
        cardBorder: 'rgba(43, 77, 255, 0.4)',
        statusBg: '#0a0a0c',
        statusText: 'text-white',
        accentColor: '#2b4dff',
    },
    rejected: {
        cardBg: '#f6f4ef',
        cardBorder: 'rgba(17, 17, 17, 0.10)',
        statusBg: 'rgba(17, 17, 17, 0.08)',
        statusText: 'text-slate-500',
        accentColor: '#8a8a8a',
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
    /** 批次審核模式（管理員）：顯示勾選框、點卡片切換選取、隱藏單張操作鈕 */
    batchMode?: boolean;
    selected?: boolean;
    onToggleSelect?: (id: string) => void;
}

export const SuggestionCard = memo(function SuggestionCard({
    suggestion,
    index,
    isAdmin,
    batchMode = false,
    selected = false,
    onToggleSelect,
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
            onClick={batchMode ? () => onToggleSelect?.(suggestion.id) : undefined}
            role={batchMode ? 'checkbox' : undefined}
            aria-checked={batchMode ? selected : undefined}
            className={`relative overflow-hidden rounded-xl border transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2
                ${batchMode
                    ? `cursor-pointer ${selected ? 'ring-2 ring-[#2b4dff] ring-offset-1' : 'hover:ring-1 hover:ring-[#2b4dff]/40'}`
                    : 'hover:-translate-y-0.5 hover:shadow-md'}`}
            style={{
                background: color.cardBg,
                borderColor: color.cardBorder,
                animationDelay: `${index * 30}ms`,
                animationFillMode: 'backwards',
            }}
        >
            {/* 批次選取勾選框 */}
            {batchMode && (
                <div className="absolute top-2 left-2 z-20">
                    {selected
                        ? <CheckSquare className="h-5 w-5 text-[#2b4dff]" />
                        : <Square className="h-5 w-5 text-slate-300" />}
                </div>
            )}

            {/* 狀態標籤 — Editorial mono uppercase */}
            <div className="absolute top-0 right-0 z-10">
                <div
                    className={`${color.statusText} flex items-center gap-1 px-2.5 py-1 rounded-bl-md`}
                    style={{
                        background: color.statusBg,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                    }}
                >
                    <StatusIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">{status.label}</span>
                </div>
            </div>

            <div className={`relative p-4 pt-7 ${batchMode ? 'pointer-events-none' : ''}`}>
                {/* 歌曲資訊 — Playfair italic */}
                <div className="mb-3">
                    <h4
                        className="truncate"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            fontSize: 18,
                            letterSpacing: '-0.015em',
                            color: 'var(--ed-ink-1)',
                            lineHeight: 1.2,
                        }}
                    >
                        {suggestion.title}
                    </h4>
                    <p
                        className="truncate mt-1"
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: 'var(--ed-ink-3)',
                        }}
                    >
                        {suggestion.artist || '未知歌手'}
                    </p>
                    {suggestion.suggestedBy && (
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-5 h-5 rounded-full bg-slate-100 border border-[rgba(17,17,17,0.10)] flex items-center justify-center">
                                <User2 className="w-3 h-3 text-slate-500" />
                            </div>
                            <span className="text-xs text-slate-500 font-medium truncate">
                                {suggestion.suggestedBy} 推薦
                            </span>
                        </div>
                    )}
                </div>

                {/* 快速連結按鈕 — Editorial 中性灰 + hover 藍 */}
                <div className="flex items-center gap-2 mb-3">
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-3 rounded-full border border-[rgba(17,17,17,0.18)] bg-white hover:border-[#2b4dff] hover:bg-[#2b4dff]/5 hover:text-[#2b4dff] transition-colors"
                                    asChild
                                >
                                    <a href={generateGuitarTabsUrl(suggestion)} target="_blank" rel="noopener noreferrer">
                                        <Music2 className="w-3.5 h-3.5 mr-1.5" />
                                        <span className="text-xs">吉他譜</span>
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
                                    className="h-8 px-3 rounded-full border border-[rgba(17,17,17,0.18)] bg-white hover:border-[#2b4dff] hover:bg-[#2b4dff]/5 hover:text-[#2b4dff] transition-colors"
                                    asChild
                                >
                                    <a href={generateLyricsUrl(suggestion)} target="_blank" rel="noopener noreferrer">
                                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                                        <span className="text-xs">歌詞</span>
                                    </a>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs font-medium z-[100]">
                                <p className="flex items-center gap-1">搜尋此歌曲的歌詞 <ExternalLink className="w-3 h-3" /></p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* 推薦理由 — Editorial 義式引文框 */}
                {suggestion.notes && (
                    <div
                        className="p-3 rounded-md mb-3"
                        style={{
                            background: 'rgba(43, 77, 255, 0.04)',
                            borderLeft: '3px solid rgba(43, 77, 255, 0.4)',
                        }}
                    >
                        <p
                            className="line-clamp-2"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 500,
                                fontSize: 14,
                                color: 'var(--ed-ink-1)',
                                lineHeight: 1.5,
                            }}
                        >
                            「{suggestion.notes}」
                        </p>
                    </div>
                )}

                {/* 狀態詳情 */}
                {suggestion.status !== 'pending' && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                background:
                                    suggestion.status === 'approved' ? 'rgba(43, 77, 255, 0.10)' :
                                    suggestion.status === 'added_to_playlist' ? '#0a0a0c' :
                                    'rgba(17, 17, 17, 0.05)',
                                color:
                                    suggestion.status === 'approved' ? '#2b4dff' :
                                    suggestion.status === 'added_to_playlist' ? '#ffffff' :
                                    '#8a8a8a',
                                border: suggestion.status === 'rejected' ? '1px solid rgba(17, 17, 17, 0.10)' : 'none',
                            }}
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
                                className="h-7 text-xs bg-[#2b4dff] hover:bg-[#1d3bd8] text-white px-3 rounded-full"
                                onClick={() => addToPlaylistMutation.mutate()}
                            >
                                <PlusCircle className="w-3.5 h-3.5 mr-1" />加入歌單
                            </Button>
                        )}
                    </div>
                )}

                {/* 管理員操作區（批次模式下隱藏，改用上方批次工具列） */}
                {isAdmin && !batchMode && (
                    <div className="flex flex-wrap gap-2 pt-3 mt-2 border-t border-[rgba(17,17,17,0.10)]">
                        {suggestion.status === 'pending' && (
                            <>
                                <Button
                                    onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: 'approved' })}
                                    size="sm"
                                    className="flex-1 bg-[#2b4dff] hover:bg-[#1d3bd8] text-white text-xs py-2 rounded-md transition-colors"
                                >
                                    <Check className="w-3.5 h-3.5 mr-1.5" />採納
                                </Button>
                                <Button
                                    onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: 'rejected' })}
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 border border-[rgba(17,17,17,0.18)] text-slate-600 hover:bg-slate-50 hover:border-slate-400 text-xs py-2 rounded-md"
                                >
                                    <X className="w-3.5 h-3.5 mr-1.5" />拒絕
                                </Button>
                            </>
                        )}
                        <Button
                            onClick={() => deleteSuggestionMutation.mutate(suggestion.id)}
                            variant="outline"
                            size="sm"
                            className="border border-[rgba(17,17,17,0.18)] text-slate-500 hover:bg-slate-50 hover:text-red-500 hover:border-red-300 text-xs py-2 px-3 rounded-md"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
});
