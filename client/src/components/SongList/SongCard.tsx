// 歌曲卡片元件
import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Music, ThumbsUp, Trash2, Edit2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
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

    return (
        <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.1 } : { duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
            className={`flex flex-col gap-3 p-4 rounded-xl 
                bg-white border border-slate-200
                border-l-4 ${colors.border}
                hover:shadow-md hover:border-slate-300
                transition-shadow duration-200`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* 歌曲資訊 */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-lg ${colors.bg} bg-opacity-10 flex items-center justify-center shrink-0`}>
                        <Music className={`h-5 w-5 ${colors.accent}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-slate-800 truncate">{song.title}</h3>
                        <p className="text-sm text-slate-500 truncate mt-0.5">{song.artist}</p>
                    </div>
                </div>

                {/* 操作按鈕 */}
                <div className="flex flex-wrap gap-2 sm:shrink-0">
                    {/* 點播按鈕 */}
                    <div className="relative">
                        <Button
                            ref={(el) => { buttonRefs.current[songId] = el; }}
                            variant="default"
                            size="default"
                            onClick={() => onVote(songId, song)}
                            aria-label={`為「${song.title}」投票`}
                            className={`
                                flex gap-2 px-4
                                bg-gradient-to-r from-amber-500 to-orange-500
                                hover:from-amber-400 hover:to-orange-400
                                text-white font-medium
                                shadow-sm hover:shadow-md
                                transition-all duration-150
                                hover:scale-105 active:scale-95
                                ${isVoting || count > 0 ? 'ring-2 ring-amber-300 ring-offset-1' : ''}
                            `}
                        >
                            <ThumbsUp className="h-4 w-4" />
                            <span>點播</span>
                            <AnimatePresence>
                                {count > 0 && (
                                    <motion.span
                                        key={`count-${count}`}
                                        initial={{ opacity: 0, y: 5, scale: 0.5 }}
                                        animate={{
                                            opacity: [0, 1, 1, 0],
                                            y: [-5, -25, -35],
                                            scale: 1.2,
                                        }}
                                        transition={{
                                            duration: 0.6,
                                            ease: 'easeOut',
                                            times: [0, 0.2, 0.8, 1]
                                        }}
                                        className="absolute -top-2 left-1/2 -translate-x-1/2 font-bold text-amber-600 text-lg pointer-events-none"
                                    >
                                        +{count}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </Button>
                    </div>

                    {/* 管理員操作按鈕 */}
                    {user?.isAdmin && (
                        <>
                            <Button
                                variant="outline"
                                size="default"
                                onClick={() => onEdit(song)}
                                className="flex gap-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            >
                                <Edit2 className="h-4 w-4 text-slate-500" />
                                編輯
                            </Button>
                            <Button
                                variant="outline"
                                size="default"
                                onClick={() => onDelete(song.id)}
                                className="flex gap-2 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                刪除
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
});
