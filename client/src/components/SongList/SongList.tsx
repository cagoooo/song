// 重構後的歌曲列表主元件
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { Music, ThumbsUp, Trash2, RotateCcw, Edit2, Loader2, ChevronDown, Search } from 'lucide-react';
import SearchBar from '../SearchBar';
import { AnimatePresence, motion } from 'framer-motion';
import {
    deleteSong as firestoreDeleteSong,
    updateSong as firestoreUpdateSong,
    resetAllVotes as firestoreResetAllVotes,
    type Song,
} from '@/lib/firestore';
import type { AppUser } from '@/lib/auth';

// 拆分的子元件
import { VoteOverlay } from './VoteOverlay';
import { useSongSearch } from './useSongSearch';
import { useVoting } from './useVoting';

// 延遲載入對話框以減少初始 bundle 大小
const EditDialog = lazy(() => import('./EditDialog').then(m => ({ default: m.EditDialog })));
const ResetDialog = lazy(() => import('./ResetDialog').then(m => ({ default: m.ResetDialog })));
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
    const [showResetDialog, setShowResetDialog] = useState(false);
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

    const resetAllVotes = useCallback(async () => {
        try {
            await firestoreResetAllVotes();
            toast({
                title: '成功',
                description: '所有點播次數已歸零',
            });
            setShowResetDialog(false);
        } catch (error) {
            toast({
                title: '錯誤',
                description: '無法重置點播次數',
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
                {user?.isAdmin && (
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setShowResetDialog(true)}
                        className="w-full sm:w-12 h-12 border-2 border-primary/20 bg-white/80 hover:bg-white/90
                     shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                     hover:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                     transition-all duration-300"
                    >
                        <RotateCcw className="h-5 w-5" />
                    </Button>
                )}
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

                    {/* 載入更多按鈕 - 搜尋模式下隱藏 */}
                    {!isInSearchMode && hasMore && onLoadMore && (
                        <div className="flex flex-col items-center py-4 mt-2">
                            <Button
                                onClick={onLoadMore}
                                disabled={isLoadingMore}
                                variant="outline"
                                className="w-full max-w-xs bg-gradient-to-r from-primary/5 to-primary/10 
                         border-primary/20 hover:border-primary/40 
                         hover:from-primary/10 hover:to-primary/20
                         transition-all duration-300"
                            >
                                {isLoadingMore ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        載入中...
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-4 w-4 mr-2" />
                                        載入更多歌曲 ({songs.length} / {totalCount || 0})
                                    </>
                                )}
                            </Button>
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

                <ResetDialog
                    open={showResetDialog}
                    onOpenChange={setShowResetDialog}
                    onConfirm={resetAllVotes}
                />

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
