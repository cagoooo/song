// 「我的推薦」追蹤卡 — 訪客回站看到自己推薦的歌目前狀態
import { useEffect, useMemo } from 'react';
import { Sparkles, Check, Clock, Music2, X, HeartPulse, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMySuggestions, markSeenStatus, removeMySuggestion } from '@/lib/mySuggestions';
import type { SongSuggestion } from '@/lib/firestore';

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
}

export function MySuggestions({ suggestions }: MySuggestionsProps) {
    const mine = useMySuggestions();
    const { toast } = useToast();

    const byId = useMemo(() => {
        const m = new Map<string, SongSuggestion>();
        suggestions.forEach((s) => m.set(s.id, s));
        return m;
    }, [suggestions]);

    // 狀態變好（被採納 / 加入歌單）時慶祝一次
    useEffect(() => {
        mine.forEach((m) => {
            const live = byId.get(m.id);
            if (live && GOOD_STATUSES.has(live.status) && m.seenStatus !== live.status) {
                toast({
                    title: live.status === 'added_to_playlist' ? '🎉 你推薦的歌進歌單了！' : '🎉 你的推薦被採納了！',
                    description:
                        live.status === 'added_to_playlist'
                            ? `「${m.title}」已加入可點播清單，快去點播吧！`
                            : `「${m.title}」阿凱老師採納了，很快會加入歌單`,
                    variant: 'success',
                });
                markSeenStatus(m.id, live.status);
            }
        });
    }, [mine, byId, toast]);

    const rows = useMemo(
        () =>
            mine.map((m) => {
                const live = byId.get(m.id);
                return { entry: m, status: live ? live.status : 'removed' };
            }),
        [mine, byId]
    );

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
                </div>
                <span className="ml-auto text-xs text-slate-500">
                    {rows.length} 首{adoptedCount > 0 ? ` · ${adoptedCount} 首已採納` : ''}
                </span>
            </div>

            {/* 清單 */}
            <ul className="space-y-2 max-h-[260px] overflow-y-auto sm:pr-1
                [scrollbar-width:thin] [scrollbar-color:rgba(17,17,17,0.22)_transparent]
                [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(17,17,17,0.2)]">
                {rows.map(({ entry, status }) => {
                    const view = STATUS_VIEW[status] || STATUS_VIEW.pending;
                    const StatusIcon = view.icon;
                    return (
                        <li
                            key={entry.id}
                            className="flex items-center gap-2.5 rounded-lg bg-white border border-[rgba(17,17,17,0.1)] px-3 py-2"
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
                            {/* 已下架 / 未採納可手動移除這筆追蹤 */}
                            {(status === 'removed' || status === 'rejected') && (
                                <button
                                    type="button"
                                    onClick={() => removeMySuggestion(entry.id)}
                                    aria-label="移除這筆追蹤"
                                    className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
