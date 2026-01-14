// 虛擬滾動歌曲列表元件
// 使用 @tanstack/react-virtual 實現高效能的長列表渲染
import { useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SongCard } from './SongCard';
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
}

// 每個歌曲卡片的預估高度
const ESTIMATED_ITEM_SIZE = 120;

/**
 * 虛擬化歌曲列表
 * 
 * 只渲染可見區域的歌曲卡片，大幅提升長列表的效能。
 * 適合歌曲數量超過 50 首的情況。
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
}: VirtualSongListProps) {
    const parentRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: songs.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_ITEM_SIZE,
        overscan: 5, // 預先渲染上下各 5 個項目，減少滾動時的空白
    });

    const virtualItems = virtualizer.getVirtualItems();

    if (songs.length === 0) {
        return null;
    }

    return (
        <div
            ref={parentRef}
            className="overflow-auto pr-4"
            style={{ height }}
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
        </div>
    );
});

export default VirtualSongList;
