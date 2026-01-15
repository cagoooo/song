// 歌曲卡片元件 - 純 CSS 動畫版（手機優化）
import { memo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Music, ThumbsUp, Trash2, Edit2 } from 'lucide-react';
import type { Song } from '@/lib/firestore';
import type { AppUser } from '@/lib/auth';

interface SongCardProps {
    song: Song;
    index: number;
    user: AppUser | null;
    votingId: string | null;
    clickCount: Record<string, number>;
    buttonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
    reduceMotion: boolean;
    onVote: (songId: string, song: Song) => void;
    onEdit: (song: Song) => void;
    onDelete: (songId: string) => void;
    onShare?: (song: Song) => void;
}

// 簡化顏色配置 - 使用左側邊框顏色區分
const getAccentColor = (index: number) => {
    const colors = [
        { border: 'border-l-rose-400', accent: 'text-rose-500', bg: 'bg-rose-500' },
        { border: 'border-l-blue-400', accent: 'text-blue-500', bg: 'bg-blue-500' },
        { border: 'border-l-violet-400', accent: 'text-violet-500', bg: 'bg-violet-500' },
        { border: 'border-l-amber-400', accent: 'text-amber-500', bg: 'bg-amber-500' },
        { border: 'border-l-emerald-400', accent: 'text-emerald-500', bg: 'bg-emerald-500' },
    ];
    return colors[index % 5];
};

export const SongCard = memo(function SongCard({
    song,
    index,
    user,
    votingId,
    clickCount,
    buttonRefs,
    reduceMotion,
    onVote,
    onEdit,
    onDelete,
}: SongCardProps) {
    const colors = getAccentColor(index);
    const songId = String(song.id);
    const count = clickCount[songId] || 0;
    const isVoting = votingId === songId;

    // 點擊計數動畫狀態
    const [showCount, setShowCount] = useState(false);

    useEffect(() => {
        if (count > 0) {
            setShowCount(true);
            const timer = setTimeout(() => setShowCount(false), 600);
            return () => clearTimeout(timer);
        }
    }, [count]);

    return (
        <div
            className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl 
                bg-white border border-slate-200
                border-l-4 ${colors.border}
                hover:shadow-md hover:border-slate-300
                transition-shadow duration-200
                animate-in fade-in slide-in-from-bottom-1`}
            style={{
                animationDelay: reduceMotion ? '0ms' : `${Math.min(index * 20, 300)}ms`,
                animationDuration: reduceMotion ? '100ms' : '200ms',
                animationFillMode: 'backwards'
            }}
        >
            {/* 音符圖標 - 手機端隱藏以節省空間 */}
            <div className={`hidden sm:flex w-10 h-10 rounded-lg ${colors.bg} bg-opacity-10 items-center justify-center shrink-0`}>
                <Music className={`h-5 w-5 ${colors.accent}`} />
            </div>

            {/* 歌曲資訊 - 放大字體 */}
            <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-base font-bold text-slate-800 truncate leading-tight">
                    {song.title}
                </h3>
                <p className="text-sm sm:text-sm text-slate-500 truncate mt-0.5">
                    {song.artist}
                </p>
            </div>

            {/* 操作按鈕區 */}
            <div className="flex items-center gap-2 shrink-0">
                {/* 點播按鈕 - 加大尺寸 */}
                <div className="relative">
                    <Button
                        ref={(el) => { buttonRefs.current[songId] = el; }}
                        variant="default"
                        size="default"
                        onClick={() => onVote(songId, song)}
                        aria-label={`為「${song.title}」投票`}
                        className={`
                            flex gap-2 px-5 py-2.5 h-11 sm:h-10
                            text-base sm:text-sm font-semibold
                            bg-gradient-to-r from-amber-500 to-orange-500
                            hover:from-amber-400 hover:to-orange-400
                            text-white
                            shadow-md hover:shadow-lg
                            transition-all duration-150
                            active:scale-95
                            ${isVoting || count > 0 ? 'ring-2 ring-amber-300 ring-offset-1' : ''}
                        `}
                    >
                        <ThumbsUp className="h-5 w-5 sm:h-4 sm:w-4" />
                        <span>點播</span>
                    </Button>

                    {/* 點擊計數 - 純 CSS 動畫 */}
                    {showCount && (
                        <span
                            className="absolute -top-2 left-1/2 -translate-x-1/2 font-bold text-amber-600 text-lg pointer-events-none"
                            style={{
                                animation: 'countFloat 0.6s ease-out forwards'
                            }}
                        >
                            +{count}
                        </span>
                    )}
                </div>

                {/* 管理員操作按鈕 - 精簡版 */}
                {user?.isAdmin && (
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(song)}
                            className="w-10 h-10 sm:w-9 sm:h-9 border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-transform duration-100"
                        >
                            <Edit2 className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onDelete(song.id)}
                            className="w-10 h-10 sm:w-9 sm:h-9 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 active:scale-95 transition-transform duration-100"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* CSS 動畫定義 */}
            <style>{`
                @keyframes countFloat {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(0) scale(0.5);
                    }
                    20% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(-15px) scale(1.2);
                    }
                    80% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(-25px) scale(1.2);
                    }
                    100% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-35px) scale(1);
                    }
                }
            `}</style>
        </div>
    );
});
