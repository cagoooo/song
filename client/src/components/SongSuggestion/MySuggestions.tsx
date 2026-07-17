// 「我的推薦」追蹤卡 — 訪客回站看到自己推薦的歌目前狀態
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles, Check, Clock, Music2, X, HeartPulse, Trash2 } from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import {
    addMySuggestion,
    useMySuggestions,
    markSeenStatus,
    removeMySuggestion,
    type MySuggestionEntry,
} from '@/lib/mySuggestions';
import type { SongSuggestion, Song } from '@/lib/firestore';
import { normalizeTitle } from '@/lib/duplicateSong';

const GOOD_STATUSES = new Set(['approved', 'added_to_playlist']);

// 狀態 → 顯示樣式
const STATUS_VIEW: Record<string, { label: string; icon: typeof Check; cls: string }> = {
    pending: { label: '待審核', icon: Clock, cls: 'text-[#2b4dff] bg-[#2b4dff]/10 border-[#2b4dff]/25' },
    approved: { label: '已採納 🎉', icon: Check, cls: 'text-[#2b4dff] bg-[#2b4dff]/12 border-[#2b4dff]/30' },
    added_to_playlist: { label: '已加入歌單 🎉', icon: HeartPulse, cls: 'text-white bg-[#0a0a0c] border-transparent' },
    rejected: { label: '未採納這次', icon: X, cls: 'text-slate-500 bg-slate-100 border-slate-200' },
    removed: { label: '已下架', icon: Trash2, cls: 'text-slate-400 bg-slate-50 border-slate-200' },
};

interface MySuggestionsProps {
    suggestions: SongSuggestion[];
    songs?: Song[];
}

const SWIPE_REMOVE_THRESHOLD = 72;
const SWIPE_REVEAL_LIMIT = 88;

interface MySuggestionRowProps {
    entry: MySuggestionEntry;
    view: (typeof STATUS_VIEW)[string];
    onRemove: (entry: MySuggestionEntry) => void;
}

function MySuggestionRow({ entry, view, onRemove }: MySuggestionRowProps) {
    const [swipeOffset, setSwipeOffset] = useState(0);
    const StatusIcon = view.icon;

    const swipeHandlers = useSwipeable({
        onSwiping: ({ deltaX, absX, absY, dir, event }) => {
            if (dir !== 'Left' || absX <= absY) return;
            event.stopPropagation();
            setSwipeOffset(Math.max(-SWIPE_REVEAL_LIMIT, deltaX));
        },
        onSwipedLeft: ({ absX, absY, event }) => {
            event.stopPropagation();
            setSwipeOffset(0);
            if (absX >= SWIPE_REMOVE_THRESHOLD && absX > absY) onRemove(entry);
        },
        onSwiped: () => setSwipeOffset(0),
        delta: 12,
        swipeDuration: 700,
        preventScrollOnSwipe: false,
        trackMouse: false,
        trackTouch: true,
    });

    return (
        <li
            {...swipeHandlers}
            className="relative overflow-hidden rounded-lg bg-red-500 touch-pan-y"
        >
            <div
                aria-hidden="true"
                className="absolute inset-y-0 right-0 flex w-[88px] items-center justify-center gap-1 text-white"
            >
                <Trash2 className="h-4 w-4" />
                <span className="text-xs font-semibold">移除</span>
            </div>
            <div
                className="relative flex items-center gap-2.5 rounded-lg border border-[rgba(17,17,17,0.1)] bg-white px-3 py-2"
                style={{
                    transform: `translateX(${swipeOffset}px)`,
                    transition: swipeOffset === 0 ? 'transform 180ms ease-out' : 'none',
                }}
            >
                <div className="w-7 h-7 rounded-md bg-slate-100 border border-[rgba(17,17,17,0.1)] flex items-center justify-center shrink-0">
                    <Music2 className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--ed-ink-1)', lineHeight: 1.2 }}>
                        {entry.title || '（未命名）'}
                    </p>
                    {entry.artist && (
                        <p className="truncate text-[11px] text-slate-400" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
                            {entry.artist}
                        </p>
                    )}
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold shrink-0 ${view.cls}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span className="whitespace-nowrap">{view.label}</span>
                </span>
                <button
                    type="button"
                    onClick={() => onRemove(entry)}
                    aria-label={`移除「${entry.title || '未命名歌曲'}」`}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </li>
    );
}

export function MySuggestions({ suggestions, songs = [] }: MySuggestionsProps) {
    const mine = useMySuggestions();
    const { toast } = useToast();

    const byId = useMemo(() => {
        const m = new Map<string, SongSuggestion>();
        suggestions.forEach((s) => m.set(s.id, s));
        return m;
    }, [suggestions]);

    const songsTitles = useMemo(() => {
        return new Set(songs.map((s) => normalizeTitle(s.title)));
    }, [songs]);

    // 狀態變好（被採納 / 加入歌單）時慶祝一次
    useEffect(() => {
        mine.forEach((m) => {
            const live = byId.get(m.id);
            const isAddedInPlaylist = !live && songsTitles.has(normalizeTitle(m.title));
            const currentStatus = live ? live.status : isAddedInPlaylist ? 'added_to_playlist' : 'removed';

            if (GOOD_STATUSES.has(currentStatus) && m.seenStatus !== currentStatus) {
                toast({
                    title: currentStatus === 'added_to_playlist' ? '🎉 你推薦的歌進歌單了！' : '🎉 你的推薦被採納了！',
                    description:
                        currentStatus === 'added_to_playlist'
                            ? `「${m.title}」已加入可點播清單，快去點播吧！`
                            : `「${m.title}」主持人採納了，很快會加入歌單`,
                    variant: 'success',
                });
                markSeenStatus(m.id, currentStatus);
            }
        });
    }, [mine, byId, songsTitles, toast]);

    const rows = useMemo(
        () =>
            mine.map((m) => {
                const live = byId.get(m.id);
                if (live) {
                    return { entry: m, status: live.status };
                }
                if (songsTitles.has(normalizeTitle(m.title))) {
                    return { entry: m, status: 'added_to_playlist' };
                }
                return { entry: m, status: 'removed' };
            }),
        [mine, byId, songsTitles]
    );

    const handleRemove = useCallback((entry: MySuggestionEntry) => {
        removeMySuggestion(entry.id);
        toast({
            title: `已移除「${entry.title || '未命名歌曲'}」`,
            description: '只會清除這台裝置上的推薦追蹤紀錄。',
            action: (
                <ToastAction altText="復原移除" onClick={() => addMySuggestion(entry)}>
                    復原
                </ToastAction>
            ),
        });
    }, [toast]);

    if (rows.length === 0) return null;

    const adoptedCount = rows.filter((r) => GOOD_STATUSES.has(r.status)).length;

    return (
        <div className="rounded-xl border border-[rgba(17,17,17,0.14)] bg-[#faf7f0] p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 標題列 */}
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-md bg-white border border-[rgba(17,17,17,0.14)] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#2b4dff]" />
                </div>
                <div className="flex flex-col">
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ed-ink-3)' }}>
                        My Picks
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 800, fontSize: 17, color: 'var(--ed-ink-1)', lineHeight: 1.1 }}>
                        你推薦的歌
                    </span>
                    <span className="mt-0.5 text-[10px] text-slate-400 sm:hidden">← 左滑即可移除</span>
                </div>
                <span className="ml-auto text-xs text-slate-500">
                    {rows.length} 首{adoptedCount > 0 ? ` · ${adoptedCount} 首已採納` : ''}
                </span>
            </div>

            {/* 清單 */}
            <ul className="space-y-2 max-h-[260px] overflow-y-auto sm:pr-1
                [scrollbar-width:thin] [scrollbar-color:rgba(17,17,17,0.22)_transparent]
                [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(17,17,17,0.2)]">
                {rows.map(({ entry, status }) => (
                    <MySuggestionRow
                        key={entry.id}
                        entry={entry}
                        view={STATUS_VIEW[status] || STATUS_VIEW.pending}
                        onRemove={handleRemove}
                    />
                ))}
            </ul>
        </div>
    );
}
