// 歌曲卡片元件 - 純 CSS 動畫版（手機優化）
import { memo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, Trash2, Edit2 } from 'lucide-react';
import type { Song } from '@/lib/firestore';
import type { AppUser } from '@/lib/auth';

interface SongCardProps {
    song: Song;
    index: number;
    user: AppUser | null;
    votingId: string | null;
    count: number;
    buttonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
    reduceMotion: boolean;
    onVote: (songId: string, song: Song) => void;
    onEdit: (song: Song) => void;
    onDelete: (songId: string) => void;
    onShare?: (song: Song) => void;
    /** 整批最大票數，給 SongList 算進度條寬度比例用 */
    maxVotes?: number;
    /** 點歌名 / 封面觸發歌曲詳情頁 */
    onOpenDetail?: (song: Song) => void;
}

function SongCardInner({
    song,
    index,
    user,
    votingId,
    count,
    buttonRefs,
    reduceMotion,
    onVote,
    onEdit,
    onDelete,
    maxVotes,
    onOpenDetail,
}: SongCardProps) {
    const songId = String(song.id);
    const isVoting = votingId === songId;
    const voteCount = song.voteCount || 0;
    const barPct = maxVotes && maxVotes > 0
        ? Math.max(6, Math.round((voteCount / maxVotes) * 100))
        : 6;

    // 點擊計數動畫狀態
    const [showCount, setShowCount] = useState(false);

    useEffect(() => {
        if (count > 0) {
            setShowCount(true);
            const timer = setTimeout(() => setShowCount(false), 600);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [count]);

    return (
        <div
            id={`song-${songId}`}
            className="editorial-song-card flex items-center gap-3 p-3 sm:p-4 rounded-lg
                bg-white border border-slate-200/80
                hover:border-slate-300 hover:shadow-sm
                transition-[border-color,box-shadow] duration-150"
        >
            {/* 雜誌風排序編號 — 卡片夠寬才顯示（容器查詢） */}
            <div
                className="song-card-num w-10 shrink-0 items-baseline justify-end tabular-nums text-slate-400"
                style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 26,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                }}
                aria-hidden="true"
            >
                {String(index + 1).padStart(2, '0')}
            </div>

            {/* 黑膠 mini 封面 — 卡片夠寬才顯示（容器查詢）；點擊可開歌曲詳情 */}
            {onOpenDetail ? (
                <button
                    type="button"
                    onClick={() => onOpenDetail(song)}
                    aria-label={`查看「${song.title}」歌曲詳情`}
                    className="song-card-cover editorial-song-cover border-0 p-0 cursor-pointer hover:scale-110 transition-transform"
                />
            ) : (
                <div className="song-card-cover editorial-song-cover" aria-hidden="true" />
            )}

            {/* 歌曲資訊 — 標題可點開啟詳情 */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <h3
                        className="text-lg sm:text-xl font-bold text-slate-900 truncate leading-tight cursor-pointer hover:text-[#2b4dff] transition-colors"
                        style={{
                            fontFamily: 'var(--font-display)',
                            letterSpacing: '-0.015em',
                        }}
                        onClick={() => onOpenDetail?.(song)}
                        role={onOpenDetail ? 'button' : undefined}
                        tabIndex={onOpenDetail ? 0 : undefined}
                        onKeyDown={(e) => {
                            if (onOpenDetail && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                onOpenDetail(song);
                            }
                        }}
                    >
                        {song.title}
                    </h3>
                    {song.difficulty && (
                        <span
                            className="text-xs shrink-0"
                            title={`難度 ${song.difficulty}/3`}
                            aria-label={`難度 ${song.difficulty}/3`}
                        >
                            {'⭐'.repeat(song.difficulty)}
                        </span>
                    )}
                </div>
                <p className="text-sm text-slate-500 truncate mt-0.5">
                    {song.artist}
                </p>
            </div>

            {/* 精簡票數 — 窄卡片（手機 / 投影雙欄）用，避免票數消失（容器查詢） */}
            <div className="song-card-vote-compact items-baseline gap-0.5 shrink-0">
                <span className="text-base font-bold tabular-nums text-slate-900 leading-none">{voteCount}</span>
                <span className="text-[10px] text-slate-400">票</span>
            </div>

            {/* 完整票數 + 漸層進度條 — 卡片夠寬才顯示（容器查詢） */}
            <div className="song-card-votes flex-col items-end gap-1.5 shrink-0 min-w-[110px]">
                <div className="flex items-baseline gap-2">
                    <span className="editorial-vote-num">{voteCount}</span>
                    <span className="text-xs text-slate-500">票</span>
                </div>
                <div className="editorial-votes-bar">
                    <i style={{ width: `${barPct}%` }} />
                </div>
            </div>

            {/* 操作按鈕區 - 手機端更緊湊 */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* 點播按鈕 - editorial 藍色強調 */}
                <div className="relative">
                    <Button
                        ref={(el) => { buttonRefs.current[songId] = el; }}
                        variant="default"
                        size="default"
                        onClick={() => onVote(songId, song)}
                        aria-label={`為「${song.title}」投票`}
                        className={`
                            inline-flex items-center justify-center gap-1
                            px-2.5 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9
                            min-w-[68px] sm:min-w-[80px]
                            text-xs sm:text-sm font-semibold
                            bg-primary hover:bg-primary/90
                            text-primary-foreground
                            shadow-sm hover:shadow-md
                            transition-all duration-150
                            active:scale-95
                            ${isVoting || count > 0 ? 'ring-2 ring-primary/30 ring-offset-1' : ''}
                        `}
                    >
                        <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        <span className="whitespace-nowrap">點播</span>
                    </Button>

                    {/* 點擊計數 - 疊在按鈕上方，不溢出邊界 */}
                    {showCount && (
                        <span
                            className="absolute inset-0 flex items-center justify-center font-bold text-white text-sm pointer-events-none rounded"
                            style={{
                                animation: 'countFade 0.6s ease-out forwards',
                                backgroundColor: 'rgb(43 77 255 / 0.92)',
                            }}
                        >
                            +{count}
                        </span>
                    )}
                </div>

                {/* 管理員操作按鈕 - 手機端更小 */}
                {user?.isAdmin && (
                    <div className="flex gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onEdit(song)}
                            className="w-8 h-8 sm:w-9 sm:h-9 border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-transform duration-100"
                        >
                            <Edit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => onDelete(song.id)}
                            className="w-8 h-8 sm:w-9 sm:h-9 border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 active:scale-95 transition-transform duration-100"
                        >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                    </div>
                )}
            </div>

        </div>
    );
}

export const SongCard = memo(SongCardInner, (prev, next) =>
    prev.song.voteCount === next.song.voteCount &&
    prev.song.isPlayed === next.song.isPlayed &&
    prev.song.isNowPlaying === next.song.isNowPlaying &&
    prev.song.title === next.song.title &&
    prev.song.artist === next.song.artist &&
    prev.song.difficulty === next.song.difficulty &&
    prev.votingId === next.votingId &&
    prev.count === next.count &&
    prev.maxVotes === next.maxVotes &&
    prev.reduceMotion === next.reduceMotion &&
    (prev.user?.isAdmin ?? false) === (next.user?.isAdmin ?? false)
);
