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

// 顏色配置
const getColorClasses = (index: number) => {
    const colorIndex = index % 5;
    const colors = [
        { border: 'border-pink-300', bg: 'from-white via-pink-50 to-white', accent: 'text-pink-500', btn: 'from-pink-100 via-rose-100 to-pink-200' },
        { border: 'border-blue-300', bg: 'from-white via-blue-50 to-white', accent: 'text-blue-500', btn: 'from-blue-100 via-indigo-100 to-blue-200' },
        { border: 'border-purple-300', bg: 'from-white via-purple-50 to-white', accent: 'text-purple-500', btn: 'from-purple-100 via-fuchsia-100 to-purple-200' },
        { border: 'border-amber-300', bg: 'from-white via-amber-50 to-white', accent: 'text-amber-500', btn: 'from-amber-100 via-yellow-100 to-amber-200' },
        { border: 'border-emerald-300', bg: 'from-white via-emerald-50 to-white', accent: 'text-emerald-500', btn: 'from-emerald-100 via-green-100 to-emerald-200' },
    ];
    return colors[colorIndex];
};

const getAccentColor = (index: number) => {
    const colors = ['bg-pink-400', 'bg-blue-400', 'bg-purple-400', 'bg-amber-400', 'bg-emerald-400'];
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
    const colorClasses = getColorClasses(index);
    const songId = String(song.id);
    const count = clickCount[songId] || 0;
    const isVoting = votingId === songId;

    return (
        <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduceMotion ? { duration: 0.1 } : { duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
            className={`flex flex-col gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl border-2 
                ${colorClasses.border} bg-gradient-to-br ${colorClasses.bg}
                hover:border-opacity-100
                hover:shadow-lg
                transition-all duration-300 transform-gpu`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative overflow-hidden">
                    <div className={`absolute left-0 top-0 w-2 h-full rounded-full ${getAccentColor(index)}`} />
                    <div className="ml-4">
                        <div className="flex items-center gap-2">
                            <Music className={`h-5 w-5 sm:h-6 sm:w-6 ${colorClasses.accent}`} />
                            <h3 className="text-base sm:text-lg font-semibold text-gray-800 break-all">{song.title}</h3>
                        </div>
                        <p className="text-sm sm:text-base text-gray-600 break-all ml-7 mt-0.5">{song.artist}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-0">
                    {/* 點播按鈕 - CSS transition */}
                    <div className="relative w-full sm:w-auto">
                        <Button
                            ref={(el) => { buttonRefs.current[songId] = el; }}
                            variant="outline"
                            size="default"
                            onClick={() => onVote(songId, song)}
                            aria-label={`為「${song.title}」投票`}
                            className={`
                                flex gap-2 relative overflow-hidden w-full sm:w-auto
                                rounded-xl
                                bg-gradient-to-r ${colorClasses.btn}
                                hover:from-opacity-80 hover:via-opacity-80 hover:to-opacity-80
                                border-2
                                ${isVoting || count > 0
                                    ? `${colorClasses.border.replace('border-', 'border-').replace('-300', '-500')} shadow-lg`
                                    : `${colorClasses.border}/70 hover:${colorClasses.border.replace('-300', '-400')}`}
                                transition-all duration-150
                                transform-gpu
                                hover:scale-105 active:scale-95
                                text-base font-medium
                                cursor-pointer
                            `}
                            style={{
                                transform: `scale(${Math.min(1 + count * 0.05, 1.25)})`,
                                willChange: 'transform',
                                WebkitTapHighlightColor: 'transparent',
                            }}
                        >
                            <ThumbsUp className={`h-4 w-4 ${isVoting ? 'text-primary' : ''}`} />
                            <span className="relative">
                                點播
                                <AnimatePresence>
                                    {count > 0 && (
                                        <motion.div
                                            className="absolute -top-1 left-1/2 -translate-x-1/2"
                                            style={{ pointerEvents: 'none' }}
                                        >
                                            <motion.span
                                                key={`count-${count}`}
                                                initial={{ opacity: 0, y: 5, scale: 0.5 }}
                                                animate={{
                                                    opacity: [0, 1, 1, 0],
                                                    y: [-5, -30, -40],
                                                    scale: Math.min(1 + count * 0.5, 3.0),
                                                }}
                                                transition={{
                                                    duration: 0.8,
                                                    ease: 'easeOut',
                                                    times: [0, 0.2, 0.8, 1]
                                                }}
                                                className="absolute font-bold z-50"
                                                style={{
                                                    fontSize: `${Math.min(16 + count * 2, 30)}px`,
                                                    fontWeight: '900',
                                                }}
                                            >
                                                +{count}
                                            </motion.span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </span>
                        </Button>
                    </div>

                    {/* 管理員操作按鈕 - CSS transition */}
                    {user?.isAdmin && (
                        <>
                            <div className="w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onEdit(song)}
                                    className={`flex gap-2 w-full sm:w-auto rounded-xl
                                        border-2 ${colorClasses.border}/50 bg-gradient-to-r from-white to-${colorClasses.accent.replace('text-', '')}/10
                                        hover:${colorClasses.border.replace('-300', '-400')}
                                        hover:scale-105 active:scale-95
                                        transition-all duration-150`}
                                >
                                    <Edit2 className={`h-4 w-4 ${colorClasses.accent}`} />
                                    編輯
                                </Button>
                            </div>
                            <div className="w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDelete(song.id)}
                                    className="flex gap-2 w-full sm:w-auto rounded-xl
                                        border-2 border-red-300/50 
                                        bg-gradient-to-r from-white to-red-50
                                        text-red-500 hover:text-red-600
                                        hover:border-red-400/70
                                        hover:shadow-sm hover:shadow-red-200
                                        hover:scale-105 active:scale-95
                                        transition-all duration-150"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    刪除
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
});
