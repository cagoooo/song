import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Music2, Trophy, Lightbulb, Tv } from "lucide-react";
import SongList from "../components/SongList";
import SongImport from "../components/SongImport";
import { TagFilterBar } from "../components/TagFilterBar";
import { useAllSongTags } from "@/hooks/useAllSongTags";
import { useVoteHistory, type VoteHistoryEntry } from "@/hooks/useVoteHistory";
import { VoteHistoryButton } from "../components/VoteHistoryButton";
import { SortSelector } from "../components/SortSelector";
import { useSortMode } from "@/hooks/useSortMode";

// VoteHistoryModal 不在首屏關鍵路徑，lazy load
const VoteHistoryModal = lazy(() =>
  import("../components/VoteHistoryModal").then((m) => ({ default: m.VoteHistoryModal }))
);
import LoginForm from "../components/LoginForm";
import { motion, AnimatePresence } from "framer-motion";
import { ShareButton } from "../components/ShareButton";
import { Skeleton } from "@/components/ui/skeleton";
import { subscribeSongs, type Song } from "@/lib/firestore";
import { MobileTabView } from "../components/MobileTabView";
import { ScrollToTop } from "../components/ScrollToTop";
import { NowPlayingNotification } from "../components/NowPlayingNotification";
import { PWAInstallPrompt } from "../components/PWAInstallPrompt";
import InteractionOverlay from "../components/InteractionOverlay";
import { useSuggestionNotification } from "@/hooks/useSuggestionNotification";
import { SuggestionNotificationOverlay } from "../components/SuggestionNotificationOverlay";

// 延遲載入大型元件以減少初始 bundle 大小
const RankingBoard = lazy(() => import("../components/RankingBoard"));
const SongSuggestion = lazy(() => import("../components/SongSuggestion"));

// 載入中的骨架屏
function SectionSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-8 w-3/4" />
    </div>
  );
}

const PAGE_SIZE = 30;

export default function Home() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [displayedSongs, setDisplayedSongs] = useState<Song[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTabForMobile, setActiveTabForMobile] = useState<'songs' | 'ranking'>('songs');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { toast } = useToast();
  const { user, logout } = useUser();
  const { allTags, songTagsMap, tagSongCount } = useAllSongTags();
  const {
    history: voteHistory,
    todayCount: voteTodayCount,
    todayUniqueCount: voteTodayUnique,
    clearHistory: clearVoteHistory,
  } = useVoteHistory();

  // 從歷史按「再點」：切到歌單 Tab → 派發搜尋事件，讓 SongList 顯示該首歌
  const handleReVoteFromHistory = useCallback((entry: VoteHistoryEntry) => {
    setHistoryOpen(false);
    setActiveTabForMobile('songs');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('searchSong', {
        detail: { searchTerm: entry.title },
      }));
    }, 350);
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }, []);
  const clearAllTags = useCallback(() => setSelectedTagIds([]), []);

  // 篩選後符合所有勾選標籤的歌曲總數（給 TagFilterBar 顯示）
  const tagMatchedCount = useMemo(() => {
    if (selectedTagIds.length === 0) return songs.length;
    return songs.filter((s) => {
      const ids = songTagsMap.get(s.id) ?? [];
      return selectedTagIds.every((sel) => ids.includes(sel));
    }).length;
  }, [songs, selectedTagIds, songTagsMap]);

  // 每次進入頁面時產生隨機 seed（只在首次渲染時產生）
  const [shuffleSeed] = useState(() => Math.floor(Math.random() * 1000000));

  // 追蹤上次的 isAdmin 狀態，用於偵測登入
  const prevIsAdminRef = useRef(user?.isAdmin ?? false);

  // 管理員登入後自動切換到排行榜 Tab
  useEffect(() => {
    const currentIsAdmin = user?.isAdmin ?? false;
    if (currentIsAdmin && !prevIsAdminRef.current) {
      // 用戶剛剛登入為管理員，切換到排行榜
      setActiveTabForMobile('ranking');
    }
    prevIsAdminRef.current = currentIsAdmin;
  }, [user?.isAdmin]);

  // 排序模式（隨機 / 票數 / 最新 / 字母）— URL 同步 + localStorage 持久化
  const { sortMode, setSortMode, sortedSongs } = useSortMode(songs, shuffleSeed);

  // 歌曲建議通知 - 訪客建議新歌曲時通知管理員（全螢幕中央顯示）
  const {
    currentSuggestion,
    isVisible: isSuggestionVisible,
    dismiss: dismissSuggestion,
  } = useSuggestionNotification({
    isAdmin: !!user?.isAdmin,
  });

  // 使用 Firestore onSnapshot 即時監聯歌曲更新
  useEffect(() => {
    let hasConnectedOnce = false;

    const unsubscribe = subscribeSongs((updatedSongs) => {
      setSongs(updatedSongs);
      setIsLoading(false);

      if (!hasConnectedOnce) {
        setIsConnected(true);
        hasConnectedOnce = true;
        toast({
          title: "連線成功",
          description: "即時更新已啟用",
          className: "bg-green-50 border-green-200 text-green-800",
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [toast]);

  // 根據顯示限制更新顯示的歌曲（使用隨機排序後的列表）
  useEffect(() => {
    setDisplayedSongs(sortedSongs.slice(0, displayLimit));
  }, [sortedSongs, displayLimit]);

  // 載入更多歌曲
  const loadMore = useCallback(() => {
    if (displayLimit >= sortedSongs.length) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => Math.min(prev + PAGE_SIZE, sortedSongs.length));
      setIsLoadingMore(false);
    }, 300);
  }, [displayLimit, sortedSongs.length]);

  const hasMore = displayLimit < sortedSongs.length;

  // 跳轉到指定歌曲 - 透過搜尋歌曲名稱的方式
  const handleNavigateToSong = useCallback((songId: string) => {
    // 統一轉換為字串
    const targetId = String(songId);

    // 切換到歌曲列表 Tab (手機版)
    setActiveTabForMobile('songs');

    // 從完整歌曲列表中找到該歌曲
    const targetSong = songs.find(s => String(s.id) === targetId);

    if (!targetSong) {
      toast({
        title: '找不到歌曲',
        description: '這首歌可能已被移除',
        variant: 'destructive',
      });
      return;
    }

    // 延遲派發事件，確保 Tab 切換動畫完成且 SongList 元件已渲染
    // MobileTabView 動畫時間為 250ms，加上額外 buffer
    setTimeout(() => {
      const searchEvent = new CustomEvent('searchSong', {
        detail: { searchTerm: targetSong.title }
      });
      window.dispatchEvent(searchEvent);
    }, 350);

    toast({
      title: '🎵 找到了！',
      description: `已搜尋「${targetSong.title}」，快來點播吧！`,
    });
  }, [songs, toast]);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (!result.ok) {
        toast({
          title: "錯誤",
          description: "登出失敗",
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "成功",
        description: "已登出",
      });
    } catch (error) {
      toast({
        title: "錯誤",
        description: "登出失敗",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
        <div className="container mx-auto py-3 sm:py-6 md:py-8 px-2 sm:px-4">
          <div className="flex flex-col items-center justify-center mb-6 sm:mb-8 md:mb-10 lg:mb-12 px-3 sm:px-4 md:px-6 lg:px-8 w-full">
            <Skeleton className="h-16 sm:h-20 md:h-24 w-full max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-3xl rounded-lg" />
            <Skeleton className="mt-4 h-10 w-32 rounded-md" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="lg:col-span-3 shadow-lg bg-gradient-to-br from-amber-50/50 via-white to-amber-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="h-6 w-40" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-2/3" />
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card className="shadow-lg h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between py-2">
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-1" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                      <Skeleton className="h-9 w-20 rounded-md" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="shadow-lg h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-6 h-6 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-3/4 mb-1" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                      <Skeleton className="h-6 w-12 rounded-md" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      {/* Admin: 登出 + 演出模式入口 */}
      {user?.isAdmin && (
        <motion.div
          className="fixed top-4 right-4 z-50 flex items-center gap-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('?mode=stage', '_blank', 'noopener')}
            className="bg-white/90 hover:bg-white border-2 border-amber-300 hover:border-amber-400 text-amber-700 hover:text-amber-800 shadow-lg hover:shadow-xl transition-all duration-300"
            title="在新分頁開啟演出模式（適合外接螢幕 / 投影）"
          >
            <Tv className="w-4 h-4 mr-2" />
            演出模式
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="bg-white/90 hover:bg-white border-2 border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <LogOut className="w-4 h-4 mr-2" />
            登出管理
          </Button>
        </motion.div>
      )}

      <div className="container mx-auto py-3 sm:py-6 md:py-8 px-2 sm:px-4">
        {/* Title container */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center mb-6 sm:mb-8 md:mb-10 lg:mb-12 px-3 sm:px-4 md:px-6 lg:px-8 w-full"
        >
          <motion.div
            className="relative p-3 sm:p-4 md:p-5 lg:p-6 rounded-lg border-2 border-primary/50 bg-gradient-to-br from-white/95 via-primary/5 to-white/90 backdrop-blur-sm shadow-[0_0_20px_rgba(var(--primary),0.4)] w-full max-w-[90%] sm:max-w-[85%] md:max-w-[80%] lg:max-w-3xl mx-auto overflow-hidden hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all duration-300"
            initial={{ scale: 0.95 }}
            animate={{
              scale: 1,
              transition: {
                type: "spring",
                stiffness: 100,
                damping: 15
              }
            }}
            whileHover={{ scale: 1.02 }}
          >
            {/* 簡化版標題 - 移除複雜動畫以提升效能 */}
            <div className="relative">
              <h1
                className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-black text-center bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 px-2 sm:px-3 md:px-4 py-2 relative z-10 leading-[1.2] sm:leading-[1.2] md:leading-[1.2] lg:leading-[1.2] tracking-tight text-white shadow-lg rounded-lg"
              >
                <div className="flex justify-center items-baseline">
                  <span>吉他彈唱</span>
                  <span className="px-2">🎸</span>
                  <span>點歌系統</span>
                  <span className="ml-1">🎵</span>
                </div>
              </h1>
            </div>

            {/* 簡化背景效果 - 使用靜態漸層取代動態blur */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-rose-500/10 to-amber-400/10 rounded-lg"
              style={{ pointerEvents: "none" }}
            />
          </motion.div>

          <motion.div
            className="mt-4 sm:mt-5 md:mt-6 lg:mt-8 scale-90 sm:scale-95 md:scale-100 lg:scale-105"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <ShareButton />
          </motion.div>
        </motion.div>

        {/* Rest of the content */}
        <AnimatePresence>
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
            layout
            transition={{
              layout: { duration: 0.3 },
            }}
          >
            {/* Song suggestion section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <Card className="shadow-lg bg-gradient-to-br from-amber-50/50 via-white to-amber-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
                    想聽的歌還沒有？
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<SectionSkeleton />}>
                    <SongSuggestion
                      isAdmin={user?.isAdmin ?? false}
                      songs={songs}
                      onNavigateToSong={handleNavigateToSong}
                    />
                  </Suspense>
                </CardContent>
              </Card>
            </motion.div>

            {/* 響應式佈局：手機 Tab / 桌面平板雙欄 */}
            <motion.div
              className="lg:col-span-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {/* 手機版 Tab 介面 (< 768px) */}
              <MobileTabView
                isAdmin={user?.isAdmin ?? false}
                activeTab={activeTabForMobile}
                onTabChange={setActiveTabForMobile}
                songListContent={
                  <Card className="shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Music2 className="w-5 h-5 text-primary" />
                          可選歌單
                        </CardTitle>
                        <div className="flex items-center gap-1.5">
                          <SortSelector value={sortMode} onChange={setSortMode} />
                          <VoteHistoryButton
                            todayCount={voteTodayCount}
                            totalCount={voteHistory.length}
                            onClick={() => setHistoryOpen(true)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3">
                      {user?.isAdmin && <SongImport />}
                      <div className="h-3" />
                      <TagFilterBar
                        allTags={allTags}
                        selectedTagIds={selectedTagIds}
                        onToggleTag={toggleTag}
                        onClearAll={clearAllTags}
                        tagSongCount={tagSongCount}
                        matchedCount={tagMatchedCount}
                        isFiltering={selectedTagIds.length > 0}
                      />
                      <SongList
                        songs={displayedSongs}
                        allSongs={songs}
                        user={user || null}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={loadMore}
                        totalCount={songs.length}
                        selectedTagIds={selectedTagIds}
                        songTagsMap={songTagsMap}
                      />
                    </CardContent>
                  </Card>
                }
                rankingContent={
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Trophy className="w-5 h-5 text-primary" />
                        人氣點播排行榜
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <Suspense fallback={<SectionSkeleton />}>
                        <RankingBoard songs={songs} user={user} />
                      </Suspense>
                    </CardContent>
                  </Card>
                }
              />

              {/* 桌面/平板版雙欄佈局 (>= 768px) */}
              <div className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Song list section */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className={user?.isAdmin ? "order-2 lg:order-1" : ""}
                >
                  <Card className="shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                          <Music2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                          可選歌單
                        </CardTitle>
                        <div className="flex items-center gap-1.5">
                          <SortSelector value={sortMode} onChange={setSortMode} />
                          <VoteHistoryButton
                            todayCount={voteTodayCount}
                            totalCount={voteHistory.length}
                            onClick={() => setHistoryOpen(true)}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                      {user?.isAdmin && <SongImport />}
                      <div className="h-3 sm:h-4" />
                      <TagFilterBar
                        allTags={allTags}
                        selectedTagIds={selectedTagIds}
                        onToggleTag={toggleTag}
                        onClearAll={clearAllTags}
                        tagSongCount={tagSongCount}
                        matchedCount={tagMatchedCount}
                        isFiltering={selectedTagIds.length > 0}
                      />
                      <SongList
                        songs={displayedSongs}
                        allSongs={songs}
                        user={user || null}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={loadMore}
                        totalCount={songs.length}
                        selectedTagIds={selectedTagIds}
                        songTagsMap={songTagsMap}
                      />
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Ranking board section */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className={user?.isAdmin ? "order-1 lg:order-2" : ""}
                >
                  <Card className="shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        人氣點播排行榜
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                      <Suspense fallback={<SectionSkeleton />}>
                        <RankingBoard songs={songs} user={user} />
                      </Suspense>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Login button for non-admin users */}
      {!user && (
        <motion.div
          className="fixed bottom-4 right-4 z-50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLoginForm(true)}
            className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 backdrop-blur-sm border-2 border-amber-200/30 hover:border-amber-300/40 transition-all duration-300"
          >
            <LogIn className="w-4 h-4 mr-2" />
            管理員登入
          </Button>
        </motion.div>
      )}

      {/* 返回頂部按鈕 */}
      <ScrollToTop threshold={400} bottom={80} />

      {/* 正在彈奏中通知（訪客即時接收） */}
      <NowPlayingNotification />

      {/* 互動動畫覆蓋層（全螢幕） */}
      <InteractionOverlay />

      {/* PWA 安裝提示 */}
      <PWAInstallPrompt />

      {/* Login form modal */}
      {showLoginForm && (
        <LoginForm onClose={() => setShowLoginForm(false)} />
      )}

      {/* 歌曲建議通知覆蓋層 - 管理員專用 */}
      <SuggestionNotificationOverlay
        isVisible={isSuggestionVisible}
        suggestion={currentSuggestion}
        onClose={dismissSuggestion}
      />

      {/* 點播歷史 Modal — lazy load，未開啟時不影響首屏 */}
      {historyOpen && (
        <Suspense fallback={null}>
          <VoteHistoryModal
            isOpen={historyOpen}
            onClose={() => setHistoryOpen(false)}
            history={voteHistory}
            todayCount={voteTodayCount}
            todayUniqueCount={voteTodayUnique}
            onClearHistory={clearVoteHistory}
            onReVote={handleReVoteFromHistory}
          />
        </Suspense>
      )}
    </div>
  );
}