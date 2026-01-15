// 虛擬滾動歌曲列表元件
// 使用 @tanstack/react-virtual 實現高效能的長列表渲染
import { useRef, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SongCard } from './SongCard';
import { Loader2 } from 'lucide-react';
import type { Song } from '@/lib/firestore';
import type { AppUser } from '@/lib/auth';

interface VirtualSongListProps {
    songs: Song[];
    user: AppUser | null;
    votingId: string | null;
    clickCount: Record<string, number>;
    buttonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
    reduceMotion: boolean;
    onVote: (songId: string, song: Song) => void;
    onEdit: (song: Song) => void;
    onDelete: (songId: string) => void;
    onShare?: (song: Song) => void;
    /** 列表容器高度 */
    height?: number;
    /** 是否還有更多歌曲可載入 */
    hasMore?: boolean;
    /** 是否正在載入更多 */
    isLoadingMore?: boolean;
    /** 載入更多歌曲的回調函式 */
    onLoadMore?: () => void;
    /** 歌曲總數 */
    totalCount?: number;
}

// 每個歌曲卡片的預估高度
const ESTIMATED_ITEM_SIZE = 120;
// 距離底部多少像素時觸發載入
const LOAD_MORE_THRESHOLD = 200;

/**
 * 虛擬化歌曲列表
 * 
 * 只渲染可見區域的歌曲卡片，大幅提升長列表的效能。
 * 適合歌曲數量超過 50 首的情況。
 * 支援無限滾動自動載入功能。
 */
export const VirtualSongList = memo(function VirtualSongList({
    songs,
    user,
    votingId,
    clickCount,
    buttonRefs,
    reduceMotion,
    onVote,
    onEdit,
    onDelete,
    onShare,
    height = 500,
    hasMore,
    isLoadingMore,
    onLoadMore,
    totalCount,
}: VirtualSongListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: songs.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_ITEM_SIZE,
        overscan: 5, // 預先渲染上下各 5 個項目，減少滾動時的空白
    });

    const virtualItems = virtualizer.getVirtualItems();

    // 處理滾動事件，在接近底部時自動載入更多
    const handleScroll = useCallback(() => {
        if (!hasMore || !onLoadMore || isLoadingMore) return;

        const scrollElement = parentRef.current;
        if (!scrollElement) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;

        if (distanceToBottom < LOAD_MORE_THRESHOLD) {
            onLoadMore();
        }
    }, [hasMore, onLoadMore, isLoadingMore]);

    if (songs.length === 0) {
        return null;
    }

    return (
        <div
            ref={parentRef}
            className="overflow-auto pr-4"
            style={{ height }}
            onScroll={handleScroll}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualItems.map((virtualItem) => {
                    const song = songs[virtualItem.index];
                    return (
                        <div
                            key={song.id}
                            data-index={virtualItem.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                            className="pb-4"
                        >
                            <SongCard
                                song={song}
                                index={virtualItem.index}
                                user={user}
                                votingId={votingId}
                                clickCount={clickCount}
                                buttonRefs={buttonRefs}
                                reduceMotion={reduceMotion}
                                onVote={onVote}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onShare={onShare}
                            />
                        </div>
                    );
                })}
            </div>
            {/* 載入更多指示器 */}
            {hasMore && (
                <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                        載入更多歌曲中... ({songs.length} / {totalCount || 0})
                    </span>
                </div>
            )}
        </div>
    );
});

export default VirtualSongList;
