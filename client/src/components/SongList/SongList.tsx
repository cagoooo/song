// 重構後的歌曲列表主元件
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { Music, ThumbsUp, Trash2, Edit2, Loader2, ChevronDown, Search } from 'lucide-react';
import SearchBar from '../SearchBar';
import { AnimatePresence, motion } from 'framer-motion';
import {
    deleteSong as firestoreDeleteSong,
    updateSong as firestoreUpdateSong,
    type Song,
} from '@/lib/firestore';
import type { AppUser } from '@/lib/auth';

// 拆分的子元件
import { VoteOverlay } from './VoteOverlay';
import { useSongSearch } from './useSongSearch';
import { useVoting } from './useVoting';

// 延遲載入對話框以減少初始 bundle 大小
const EditDialog = lazy(() => import('./EditDialog').then(m => ({ default: m.EditDialog })));
const QRCodeShareModal = lazy(() => import('../QRCodeShareModal'));

// 歌曲卡片和虛擬滾動
import { SongCard } from './SongCard';
import { VirtualSongList } from './VirtualSongList';

// 對話框載入中的佔位符
const DialogFallback = () => <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50" />;

// 超過此數量時啟用虛擬滾動
const VIRTUAL_SCROLL_THRESHOLD = 30;

interface SongListProps {
    songs: Song[];
    allSongs?: Song[]; // 完整歌曲列表，用於搜尋所有曲庫
    user: AppUser | null;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    onLoadMore?: () => void;
    totalCount?: number;
}

export default function SongList({
    songs,
    allSongs,
    user,
    hasMore,
    isLoadingMore,
    onLoadMore,
    totalCount
}: SongListProps) {
    const { toast } = useToast();
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [selectedSongForShare, setSelectedSongForShare] = useState<Song | null>(null);
    const [editingSong, setEditingSong] = useState<Song | null>(null);

    // 使用全局 Hook 檢測是否應減少動畫
    const reduceMotion = useReduceMotion();

    // 使用拆分的 Hooks - 使用完整歌曲列表 (allSongs) 進行搜尋，確保能搜尋所有曲庫
    const searchSongsSource = allSongs || songs;
    const {
        searchTerm,
        setSearchTerm,
        isInSearchMode,
        filteredSongs: searchFilteredSongs,
        isFuzzyMode,
        toggleFuzzyMode,
    } = useSongSearch(searchSongsSource);

    // 顯示的歌曲：搜尋模式下使用搜尋結果，否則使用分頁的歌曲
    const filteredSongs = isInSearchMode ? searchFilteredSongs : songs;

    const {
        votingId,
        clickCount,
        showVoteOverlay,
        buttonRefs,
        handleVoteStart,
    } = useVoting();

    const isSearching = false; // 本地搜尋不需要 loading 狀態

    // 載入更多的哨兵元素 ref
    const loadMoreRef = useRef<HTMLDivElement>(null);

    // Intersection Observer 自動載入 - 滾動至底部時自動觸發載入更多
    useEffect(() => {
        if (!hasMore || !onLoadMore || isLoadingMore || isInSearchMode) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    onLoadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [hasMore, onLoadMore, isLoadingMore, isInSearchMode]);

    // 管理員操作
    const deleteSong = useCallback(async (songId: string) => {
        try {
            await firestoreDeleteSong(songId);
            toast({
                title: '成功',
                description: '歌曲已刪除',
            });
        } catch (error) {
            toast({
                title: '錯誤',
                description: '無法刪除歌曲',
                variant: 'destructive'
            });
        }
    }, [toast]);

    const handleShareClick = useCallback((song: Song) => {
        setSelectedSongForShare(song);
        setQrModalOpen(true);
    }, []);

    const getShareUrl = useCallback((songId: string) => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/songs/${songId}`;
    }, []);

    const handleEditSave = useCallback(async (title: string, artist: string) => {
        if (!editingSong) return;

        try {
            await firestoreUpdateSong(editingSong.id, title, artist);
            toast({
                title: '成功',
                description: '歌曲已更新',
            });
            setEditingSong(null);
        } catch (error) {
            toast({
                title: '錯誤',
                description: '無法更新歌曲',
                variant: 'destructive'
            });
        }
    }, [editingSong, toast]);

    return (
        <div className="space-y-4 relative">
            {/* 點播成功覆蓋動畫 */}
            <VoteOverlay
                show={!!showVoteOverlay}
                songTitle={showVoteOverlay?.title || ''}
                songArtist={showVoteOverlay?.artist || ''}
            />

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <SearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        isFuzzyMode={isFuzzyMode}
                        onToggleFuzzyMode={toggleFuzzyMode}
                    />
                </div>
            </div>
            {/* 條件式虛擬滾動：超過 30 首時啟用 */}
            {filteredSongs.length > VIRTUAL_SCROLL_THRESHOLD ? (
                <VirtualSongList
                    songs={filteredSongs}
                    user={user}
                    votingId={votingId}
                    clickCount={clickCount}
                    buttonRefs={buttonRefs}
                    reduceMotion={reduceMotion}
                    onVote={handleVoteStart}
                    onEdit={setEditingSong}
                    onDelete={deleteSong}
                    onShare={handleShareClick}
                    height={typeof window !== 'undefined' && window.innerWidth < 640 ? 400 : 500}
                    hasMore={!isInSearchMode && hasMore}
                    isLoadingMore={isLoadingMore}
                    onLoadMore={onLoadMore}
                    totalCount={totalCount}
                />
            ) : (
                <ScrollArea className="h-[400px] sm:h-[500px] w-full pr-4">
                    <div className="space-y-4">
                        {filteredSongs.map((song, index) => (
                            <SongCard
                                key={song.id}
                                song={song}
                                index={index}
                                user={user}
                                votingId={votingId}
                                clickCount={clickCount}
                                buttonRefs={buttonRefs}
                                reduceMotion={reduceMotion}
                                onVote={handleVoteStart}
                                onEdit={setEditingSong}
                                onDelete={deleteSong}
                                onShare={handleShareClick}
                            />
                        ))}
                    </div>

                    {/* 搜尋結果提示 */}
                    {isInSearchMode && (
                        <div className="flex items-center justify-center py-3 mt-2">
                            {isSearching ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">搜尋中...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm">
                                    <Search className="h-4 w-4 text-primary" />
                                    <span className="text-muted-foreground">
                                        搜尋「{searchTerm}」找到 <span className="font-semibold text-primary">{filteredSongs.length}</span> 首歌曲
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 載入更多區塊 - 自動載入，搜尋模式下隱藏 */}
                    {!isInSearchMode && hasMore && onLoadMore && (
                        <div
                            ref={loadMoreRef}
                            className="flex flex-col items-center py-4 mt-2"
                        >
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">
                                    載入更多歌曲中... ({songs.length} / {totalCount || 0})
                                </span>
                            </div>
                        </div>
                    )}
                </ScrollArea>
            )}

            {/* 延遲載入的對話框 */}
            <Suspense fallback={<DialogFallback />}>
                {selectedSongForShare && (
                    <QRCodeShareModal
                        isOpen={qrModalOpen}
                        onClose={() => {
                            setQrModalOpen(false);
                            setSelectedSongForShare(null);
                        }}
                        songTitle={selectedSongForShare.title}
                        songArtist={selectedSongForShare.artist}
                        shareUrl={getShareUrl(selectedSongForShare.id)}
                        songId={selectedSongForShare.id}
                    />
                )}

                {editingSong && (
                    <EditDialog
                        song={editingSong}
                        isOpen={!!editingSong}
                        onClose={() => setEditingSong(null)}
                        onSave={handleEditSave}
                    />
                )}
            </Suspense>
        </div>
    );
}
