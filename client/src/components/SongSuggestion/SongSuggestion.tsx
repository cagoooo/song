import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, ChevronDown, Lightbulb, ListChecks, Music, Sparkles, Trash2, X } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ResponsiveScrollList } from '@/components/ui/ResponsiveScrollList';
import { useToast } from '@/hooks/use-toast';
import { usePendingSuggestionFlush } from '@/hooks/usePendingSuggestionFlush';
import { usePlayedSuggestionCelebration } from '@/hooks/usePlayedSuggestionCelebration';
import { approveSuggestion, rejectSuggestion, removeSuggestion, useSuggestions } from '@/hooks/use-suggestions';
import type { Song } from '@/lib/firestore';
import { MySuggestions } from './MySuggestions';
import { SuggestionCard } from './SuggestionCard';
import { SuggestionForm } from './SuggestionForm';
import { resolveBatchTargets, type BatchAction } from './batchSuggestions';

interface SongSuggestionProps {
    isAdmin?: boolean;
    songs?: Song[];
    onNavigateToSong?: (songId: string) => void;
}

const countByStatus = (suggestions: ReturnType<typeof useSuggestions>['suggestions']) => ({
    pending: suggestions.filter((s) => s.status === 'pending').length,
    approved: suggestions.filter((s) => s.status === 'approved').length,
    added: suggestions.filter((s) => s.status === 'added_to_playlist').length,
});

export default function SongSuggestion({
    isAdmin = false,
    songs = [],
    onNavigateToSong,
}: SongSuggestionProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isListExpanded, setIsListExpanded] = useState(false);
    // 剛送出的推薦 id：展開清單 + 捲到該卡 + 高亮「+1 揪人」，數秒後自動解除
    const [highlightId, setHighlightId] = useState<string | null>(null);
    const [batchMode, setBatchMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const { suggestions } = useSuggestions();
    const { toast } = useToast();
    // 恢復連線 / 啟動時，自動補送離線暫存的點歌建議
    usePendingSuggestionFlush();
    // 你推薦的歌被現場彈出來時，跳慶祝 toast（推薦→採納→演出 正向迴圈）
    usePlayedSuggestionCelebration(songs);

    // 送出成功後：展開清單並高亮剛送出的卡片，引導去「+1 揪人」；4.5s 後解除高亮
    const handleSubmitted = useCallback((id: string) => {
        setIsListExpanded(true);
        setHighlightId(id);
        const t = setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 4500);
        return () => clearTimeout(t);
    }, []);

    const counts = useMemo(() => countByStatus(suggestions), [suggestions]);

    useEffect(() => {
        if (!batchMode) setSelectedIds(new Set());
    }, [batchMode]);

    const statusById = useMemo(() => {
        const m = new Map<string, string>();
        suggestions.forEach((s) => m.set(s.id, s.status));
        return m;
    }, [suggestions]);

    const pendingIds = useMemo(
        () => suggestions.filter((s) => s.status === 'pending').map((s) => s.id),
        [suggestions],
    );

    const selectedPendingCount = useMemo(
        () => Array.from(selectedIds).filter((id) => statusById.get(id) === 'pending').length,
        [selectedIds, statusById],
    );

    const toggleSelect = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const batchMutation = useMutation({
        mutationFn: async (action: BatchAction) => {
            const targets = resolveBatchTargets(action, selectedIds, statusById);
            const fn = action === 'approve' ? approveSuggestion : action === 'reject' ? rejectSuggestion : removeSuggestion;
            const results = await Promise.allSettled(targets.map((id) => fn(id)));
            const failedIds = targets.filter((_, index) => results[index]?.status === 'rejected');

            return {
                action,
                ok: results.length - failedIds.length,
                fail: failedIds.length,
                failedIds,
            };
        },
        onSuccess: ({ action, ok, fail, failedIds }) => {
            const label = action === 'approve' ? '採納' : action === 'reject' ? '拒絕' : '刪除';
            toast({
                title: action === 'delete' ? `已刪除 ${ok} 首推薦` : `已${label} ${ok} 首推薦`,
                description: fail > 0 ? `另有 ${fail} 首處理失敗，已保留選取方便重試。` : undefined,
                variant: fail > 0 ? 'destructive' : 'success',
            });
            setSelectedIds(fail > 0 ? new Set(failedIds) : new Set());
            if (action === 'delete') setDeleteConfirmOpen(false);
        },
        onError: (e: Error) => {
            toast({ title: '批次操作失敗', description: e.message || '請稍後再試。', variant: 'destructive' });
        },
    });

    const runBatch = useCallback((action: BatchAction) => {
        if (selectedIds.size === 0 || batchMutation.isPending) return;
        batchMutation.mutate(action);
    }, [batchMutation, selectedIds]);

    const requestBatchDelete = useCallback(() => {
        if (selectedIds.size === 0 || batchMutation.isPending) return;
        setDeleteConfirmOpen(true);
    }, [batchMutation.isPending, selectedIds.size]);

    return (
        <div className="space-y-5">
            <SuggestionForm
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                songs={songs}
                onNavigateToSong={onNavigateToSong}
                onSubmitted={handleSubmitted}
            />

            <MySuggestions suggestions={suggestions} />

            {suggestions.length > 0 && (
                <Collapsible open={isListExpanded} onOpenChange={setIsListExpanded}>
                    <CollapsibleTrigger
                        className="relative w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-left group animate-in fade-in slide-in-from-bottom-2 duration-300"
                        style={{ animationDelay: '50ms' }}
                    >
                        <div className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-[rgba(17,17,17,0.14)] bg-[#faf7f0] p-4 shadow-[0_1px_0_rgba(17,17,17,0.04),0_12px_30px_-16px_rgba(17,17,17,0.16)] transition-all duration-200 group-hover:border-[rgba(17,17,17,0.28)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
                            <div className="relative z-10 flex items-center gap-3">
                                <div className="relative">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[rgba(17,17,17,0.14)] bg-white sm:h-11 sm:w-11">
                                        <Lightbulb className="h-5 w-5 text-[#2b4dff] sm:h-6 sm:w-6" />
                                    </div>
                                    <Sparkles className="absolute -right-1 -top-1 h-3 w-3 animate-pulse text-[#2b4dff]" />
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <span
                                        style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: 10,
                                            letterSpacing: '0.22em',
                                            textTransform: 'uppercase',
                                            color: 'var(--ed-ink-3)',
                                        }}
                                    >
                                        Reader's Picks
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                            fontStyle: 'italic',
                                            fontWeight: 800,
                                            fontSize: 20,
                                            letterSpacing: '-0.015em',
                                            color: 'var(--ed-ink-1)',
                                            lineHeight: 1.1,
                                        }}
                                    >
                                        社群歌曲推薦
                                    </span>
                                </div>

                                <div className={`ml-1 transition-transform duration-200 ${isListExpanded ? 'rotate-180' : 'rotate-0'}`}>
                                    <ChevronDown className="h-5 w-5 text-slate-400" />
                                </div>
                            </div>

                            <div className="relative z-10 flex flex-wrap items-center gap-2">
                                {counts.pending > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2b4dff]/30 bg-[#2b4dff]/10 px-3 py-1 text-[#2b4dff] font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2b4dff]" />
                                        {counts.pending} 待審核
                                    </span>
                                )}
                                {counts.approved > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-600 font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                                        {counts.approved} 已採納
                                    </span>
                                )}
                                {counts.added > 0 && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2b4dff] px-3 py-1 text-white font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
                                        <Music className="h-3 w-3" />
                                        {counts.added} 已加入
                                    </span>
                                )}
                            </div>
                        </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="overflow-hidden duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2">
                        {isAdmin && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-[rgba(17,17,17,0.12)] bg-white/70 px-3 py-2">
                                <button
                                    type="button"
                                    onClick={() => setBatchMode((v) => !v)}
                                    disabled={batchMutation.isPending}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
                                        batchMode
                                            ? 'bg-[#2b4dff] text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    <ListChecks className="h-3.5 w-3.5" />
                                    {batchMode ? '結束批次' : '批次審核'}
                                </button>

                                {batchMode && (
                                    <>
                                        <span className="text-xs text-slate-500">已選 <b className="text-slate-800">{selectedIds.size}</b> 首</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedIds(new Set(pendingIds))}
                                            disabled={pendingIds.length === 0 || batchMutation.isPending}
                                            className="text-[11px] text-[#2b4dff] hover:underline disabled:opacity-40"
                                        >
                                            全選待審核（{pendingIds.length}）
                                        </button>
                                        {selectedIds.size > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedIds(new Set())}
                                                disabled={batchMutation.isPending}
                                                className="text-[11px] text-slate-400 hover:text-slate-600 disabled:opacity-40"
                                            >
                                                清除
                                            </button>
                                        )}

                                        <div className="ml-auto flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => runBatch('approve')}
                                                disabled={selectedPendingCount === 0 || batchMutation.isPending}
                                                className="inline-flex items-center gap-1 rounded-md bg-[#2b4dff] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1d3bd8] disabled:opacity-40"
                                            >
                                                <Check className="h-3.5 w-3.5" />採納{selectedPendingCount > 0 ? ` ${selectedPendingCount}` : ''}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => runBatch('reject')}
                                                disabled={selectedPendingCount === 0 || batchMutation.isPending}
                                                className="inline-flex items-center gap-1 rounded-md border border-[rgba(17,17,17,0.18)] px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                            >
                                                <X className="h-3.5 w-3.5" />拒絕{selectedPendingCount > 0 ? ` ${selectedPendingCount}` : ''}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={requestBatchDelete}
                                                disabled={selectedIds.size === 0 || batchMutation.isPending}
                                                className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                {batchMutation.isPending ? '刪除中…' : `刪除${selectedIds.size > 0 ? ` ${selectedIds.size}` : ''}`}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <ResponsiveScrollList className="mt-4 grid grid-cols-1 gap-4 pb-2 md:grid-cols-2 xl:grid-cols-3">
                            {suggestions.map((suggestion, index) => (
                                <SuggestionCard
                                    key={suggestion.id}
                                    suggestion={suggestion}
                                    index={index}
                                    isAdmin={isAdmin}
                                    batchMode={batchMode}
                                    selected={selectedIds.has(suggestion.id)}
                                    onToggleSelect={toggleSelect}
                                    highlight={suggestion.id === highlightId}
                                />
                            ))}
                        </ResponsiveScrollList>
                    </CollapsibleContent>
                </Collapsible>
            )}

            <AlertDialog open={deleteConfirmOpen} onOpenChange={(open) => {
                if (!batchMutation.isPending) setDeleteConfirmOpen(open);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確定刪除選取的推薦？</AlertDialogTitle>
                        <AlertDialogDescription>
                            將刪除目前選取的 {selectedIds.size} 首社群歌曲推薦。此動作無法復原，刪除後推薦卡片會從清單中移除。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={batchMutation.isPending}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(event) => {
                                event.preventDefault();
                                runBatch('delete');
                            }}
                            disabled={batchMutation.isPending || selectedIds.size === 0}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            {batchMutation.isPending ? '刪除中…' : `確認刪除 ${selectedIds.size} 首`}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
