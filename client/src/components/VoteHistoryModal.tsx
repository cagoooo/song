import { useMemo } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Music, RotateCcw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VoteHistoryEntry } from '@/hooks/useVoteHistory';

interface VoteHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: VoteHistoryEntry[];
    todayCount: number;
    todayUniqueCount: number;
    onClearHistory: () => void;
    /** 點「再次點播」要做的事，由父層注入（通常是觸發搜尋並切到歌單 Tab） */
    onReVote: (entry: VoteHistoryEntry) => void;
}

function formatRelative(ts: number): string {
    const now = Date.now();
    const diff = now - ts;
    const min = 60_000, hour = 3600_000, day = 86_400_000;
    if (diff < min) return '剛剛';
    if (diff < hour) return `${Math.floor(diff / min)} 分鐘前`;
    if (diff < day) return `${Math.floor(diff / hour)} 小時前`;
    if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
    return new Date(ts).toLocaleDateString();
}

function groupByDay(entries: VoteHistoryEntry[]): { label: string; items: VoteHistoryEntry[] }[] {
    const buckets = new Map<string, VoteHistoryEntry[]>();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 86_400_000);

    entries.forEach((e) => {
        const d = new Date(e.timestamp); d.setHours(0, 0, 0, 0);
        let label: string;
        if (d.getTime() === today.getTime()) label = '今天';
        else if (d.getTime() === yesterday.getTime()) label = '昨天';
        else label = d.toLocaleDateString();
        const arr = buckets.get(label) ?? [];
        arr.push(e);
        buckets.set(label, arr);
    });
    return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

export function VoteHistoryModal({
    isOpen, onClose, history, todayCount, todayUniqueCount,
    onClearHistory, onReVote,
}: VoteHistoryModalProps) {
    const grouped = useMemo(() => groupByDay(history), [history]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        我的點播歷史
                    </DialogTitle>
                    <DialogDescription>
                        今日已點播 <span className="font-semibold text-primary">{todayCount}</span> 次
                        ／<span className="font-semibold">{todayUniqueCount}</span> 首不同歌曲
                        ・累積記錄 {history.length} 筆
                    </DialogDescription>
                </DialogHeader>

                {history.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        <Music className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p>還沒有點播紀錄</p>
                        <p className="text-xs mt-1">趕快去點一首歌吧 🎸</p>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="h-[400px] pr-3">
                            <div className="space-y-4">
                                <AnimatePresence initial={false}>
                                    {grouped.map(({ label, items }) => (
                                        <div key={label}>
                                            <div className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background/80 backdrop-blur py-1">
                                                {label}
                                            </div>
                                            <div className="space-y-2">
                                                {items.map((entry, i) => (
                                                    <motion.div
                                                        key={`${entry.songId}_${entry.timestamp}`}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.2, delay: i * 0.02 }}
                                                        className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm truncate">
                                                                {entry.title}
                                                            </div>
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                {entry.artist} · {formatRelative(entry.timestamp)}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => onReVote(entry)}
                                                            aria-label={`再次點播 ${entry.title}`}
                                                            className="shrink-0 h-8 px-2 text-xs"
                                                        >
                                                            <RotateCcw className="w-3 h-3 mr-1" />
                                                            再點
                                                        </Button>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </ScrollArea>
                        <div className="flex justify-end pt-2 border-t">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    if (window.confirm('確定要清除所有點播紀錄嗎？此操作無法復原。')) {
                                        onClearHistory();
                                    }
                                }}
                                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="w-3 h-3 mr-1" />
                                清除全部紀錄
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
