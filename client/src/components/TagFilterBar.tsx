import { memo } from 'react';
import { Hash, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Tag } from '@/lib/firestore';

interface TagFilterBarProps {
    allTags: Tag[];
    selectedTagIds: string[];
    onToggleTag: (tagId: string) => void;
    onClearAll: () => void;
    tagSongCount: Map<string, number>;
    /** 篩選後的歌曲總數，顯示給訪客看 */
    matchedCount?: number;
    /** 是否正在套用任何標籤 */
    isFiltering: boolean;
}

const colorClasses = [
    'from-rose-500/20 to-pink-500/20 text-rose-700 border-rose-200',
    'from-blue-500/20 to-cyan-500/20 text-blue-700 border-blue-200',
    'from-green-500/20 to-emerald-500/20 text-green-700 border-green-200',
    'from-amber-500/20 to-yellow-500/20 text-amber-700 border-amber-200',
    'from-violet-500/20 to-purple-500/20 text-violet-700 border-violet-200',
    'from-teal-500/20 to-cyan-500/20 text-teal-700 border-teal-200',
];

function getColorIndex(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % colorClasses.length;
}

export const TagFilterBar = memo(function TagFilterBar({
    allTags,
    selectedTagIds,
    onToggleTag,
    onClearAll,
    tagSongCount,
    matchedCount,
    isFiltering,
}: TagFilterBarProps) {
    if (allTags.length === 0) return null;

    return (
        <div className="rounded-lg border bg-card/50 backdrop-blur-sm p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    <span>標籤篩選</span>
                    {isFiltering && typeof matchedCount === 'number' && (
                        <span className="text-xs ml-2">
                            （已選 {selectedTagIds.length} 個 · 找到
                            <span className="font-semibold text-primary mx-1">
                                {matchedCount}
                            </span>
                            首）
                        </span>
                    )}
                </div>
                <AnimatePresence>
                    {isFiltering && (
                        <motion.button
                            type="button"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={onClearAll}
                            aria-label="清除所有標籤"
                            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                        >
                            <X className="h-3 w-3" />
                            清除
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
            <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    const colorIdx = getColorIndex(tag.id);
                    const count = tagSongCount.get(tag.id) ?? 0;
                    return (
                        <button
                            key={tag.id}
                            type="button"
                            onClick={() => onToggleTag(tag.id)}
                            aria-pressed={selected}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all',
                                'bg-gradient-to-r',
                                colorClasses[colorIdx],
                                selected
                                    ? 'ring-2 ring-primary/40 shadow-sm scale-105'
                                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                            )}
                        >
                            <span>{tag.name}</span>
                            <span className="text-[10px] opacity-60">({count})</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});
