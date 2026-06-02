// 虛擬滾動歌曲列表元件
// 使用 @tanstack/react-virtual 實現高效能的長列表渲染
import { useRef, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SongCard } from './SongCard';
import { Loader2 } from 'lucide-react';
import { useWideColumns } from '@/hooks/useWideColumns';
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
    /** 整批最大票數 */
    maxVotes?: number;
    /** 點歌名 / 封面開啟詳情頁 */
    onOpenDetail?: (song: Song) => void;
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
    maxVotes,
    onOpenDetail,
    height = 500,
    hasMore,
    isLoadingMore,
    onLoadMore,
    totalCount,
}: VirtualSongListProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    // 超寬螢幕（2xl）排雙欄；其餘單欄（columns=1 時行為與單欄完全一致）
    const columns = useWideColumns();

    const virtualizer = useVirtualizer({
        count: songs.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_ITEM_SIZE,
        overscan: 5, // 預先渲染上下各 5 個項目，減少滾動時的空白
        lanes: columns, // 多欄虛擬捲動：react-virtual 依各欄高度自動分配
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
                                left: `${(virtualItem.lane / columns) * 100}%`,
                                width: `${100 / columns}%`,
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                            className={columns > 1 ? 'pb-4 px-2' : 'pb-4'}
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
                                maxVotes={maxVotes}
                                onOpenDetail={onOpenDetail}
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
