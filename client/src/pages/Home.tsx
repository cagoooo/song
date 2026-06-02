import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Trophy, Tv, Share2, Award, Printer } from "lucide-react";
import SongList from "../components/SongList";
import SongImport from "../components/SongImport";
import { TagFilterBar } from "../components/TagFilterBar";
import { useAllSongTags } from "@/hooks/useAllSongTags";
import { useVoteHistory, type VoteHistoryEntry } from "@/hooks/useVoteHistory";
import { VoteHistoryButton } from "../components/VoteHistoryButton";
import { SortSelector } from "../components/SortSelector";
import { useSortMode } from "@/hooks/useSortMode";
import { useIsComposing, useComposingWhileTyping } from "@/lib/composingGuard";
import { useComboCounter } from "@/hooks/useComboCounter";
import { ComboOverlay } from "../components/ComboOverlay";
import { useDarkHorse } from "@/hooks/useDarkHorse";
import { DarkHorseOverlay } from "../components/DarkHorseOverlay";
import { useGlobalHype } from "@/hooks/useGlobalHype";
import { useVoterLeaderboard } from "@/hooks/useVoterLeaderboard";
import { GlobalHypeOverlay } from "../components/GlobalHypeOverlay";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { UpdatePrompt } from "../components/UpdatePrompt";
import { BarChart3 } from "lucide-react";

const VoterLeaderboardModal = lazy(() =>
  import("../components/VoterLeaderboardModal").then((m) => ({ default: m.VoterLeaderboardModal }))
);
const CommandPalette = lazy(() =>
  import("../components/CommandPalette").then((m) => ({ default: m.CommandPalette }))
);
const ShortcutsHelpModal = lazy(() =>
  import("../components/ShortcutsHelpModal").then((m) => ({ default: m.ShortcutsHelpModal }))
);
const StatsDashboard = lazy(() =>
  import("../components/StatsDashboard").then((m) => ({ default: m.StatsDashboard }))
);
const ShareCardModal = lazy(() =>
  import("../components/ShareCardModal").then((m) => ({ default: m.ShareCardModal }))
);
const ThankYouModal = lazy(() =>
  import("../components/ThankYouModal").then((m) => ({ default: m.ThankYouModal }))
);
const VoterPassportModal = lazy(() =>
  import("../components/VoterPassportModal").then((m) => ({ default: m.VoterPassportModal }))
);
const OpeningCurtain = lazy(() =>
  import("../components/OpeningCurtain").then((m) => ({ default: m.OpeningCurtain }))
);
const PrintProgram = lazy(() =>
  import("../components/PrintProgram").then((m) => ({ default: m.PrintProgram }))
);

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
import { UpNextBar } from "../components/UpNextBar";
import { PWAInstallPrompt } from "../components/PWAInstallPrompt";
import InteractionOverlay from "../components/InteractionOverlay";
import { useSuggestionNotification } from "@/hooks/useSuggestionNotification";
import { SongDetailModal } from "../components/SongDetail";
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
  const [activeTabForMobile, setActiveTabForMobile] = useState<'songs' | 'ranking' | 'voters'>('songs');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [curtainOpen, setCurtainOpen] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [detailSong, setDetailSong] = useState<Song | null>(null);
  const curtainCheckedRef = useRef(false);
  // 全站任一文字輸入框聚焦時自動進入「專注輸入」模式（涵蓋搜尋、登入、編輯、匯入等所有輸入框）
  useComposingWhileTyping();
  // 使用者正在打字時為 true → 暫停全螢幕慶祝／互動覆蓋層，避免畫面衝擊干擾輸入
  const isComposing = useIsComposing();
  const { combo } = useComboCounter();
  // PrintProgram 需要 topVoters — 只在 printMode 啟用時 mount，
  // 否則訂閱 Firestore VoterLeaderboard 會多送一次 read
  const voterLeaderboard = useVoterLeaderboard(3);

  // 用 useMemo 包起來避免每次 render 都重綁 listener
  const shortcuts = useMemo(() => ([
    {
      keys: 'cmd+k',
      description: '開啟命令面板',
      handler: () => setPaletteOpen(true),
      allowInInput: true,
    },
    {
      keys: '/',
      description: '聚焦搜尋框',
      handler: () => {
        // 派發既有的搜尋事件 — SongList 會接到並 setSearchTerm
        const input = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="搜尋"]');
        input?.focus();
      },
    },
    {
      keys: '?',
      description: '顯示快捷鍵說明',
      handler: () => setShortcutsHelpOpen(true),
    },
    {
      keys: 'escape',
      description: '關閉對話框',
      handler: () => {
        setPaletteOpen(false);
        setShortcutsHelpOpen(false);
      },
      allowInInput: true,
    },
  ]), []);
  useKeyboardShortcuts(shortcuts);
  const darkHorseEvent = useDarkHorse(songs);
  const hypeEvent = useGlobalHype(songs);
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

  // 觸發 A4 直式節目單列印（用瀏覽器原生 window.print + @media print）
  // 📐 設計文件：docs/design/D3-pdf-print.md
  const handlePrintProgram = useCallback(async () => {
    // 1. 先 preload lazy chunk，避免列印對話框打開時 PrintProgram 還沒 mount
    await import("../components/PrintProgram");
    // 2. mount 元件
    setPrintMode(true);
    document.body.classList.add('print-mode');
    // 3. 等 React render + 字型載入完成
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    // 4. 兩個 RAF 等 commit phase 完成
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }, []);

  // 'afterprint' 事件：列印完成 / 取消 後自動清掉 print-mode
  useEffect(() => {
    const onAfter = () => {
      document.body.classList.remove('print-mode');
      setPrintMode(false);
    };
    window.addEventListener('afterprint', onAfter);
    return () => window.removeEventListener('afterprint', onAfter);
  }, []);

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

  // 首次到訪 sessionStorage 沒記號 → 自動播放開場儀式（每瀏覽器 session 一次）
  useEffect(() => {
    if (curtainCheckedRef.current) return;
    if (songs.length === 0) return;          // 等歌單載入再決定要不要播
    curtainCheckedRef.current = true;
    try {
      if (sessionStorage.getItem('opening-curtain-shown-v1')) return;
      // 若帶 ?intro=skip 或從演出模式跳轉 → 不播
      const params = new URLSearchParams(window.location.search);
      if (params.get('intro') === 'skip' || params.get('mode') === 'stage') return;
      sessionStorage.setItem('opening-curtain-shown-v1', '1');
      setCurtainOpen(true);
    } catch {
      // sessionStorage 不可用就放棄，不影響主流程
    }
  }, [songs.length]);

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
          className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 sm:gap-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatsOpen(true)}
            aria-label="統計儀表板"
            className="bg-white/90 hover:bg-white border-2 border-blue-300 hover:border-blue-400 text-blue-700 hover:text-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 h-9 px-2.5 sm:px-3"
            title="查看投票統計（熱門歌曲、趨勢、時段、歌手分布）"
          >
            <BarChart3 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">統計</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareCardOpen(true)}
            aria-label="演唱會節目單分享卡"
            className="bg-white/90 hover:bg-white border-2 border-violet-300 hover:border-violet-400 text-violet-700 hover:text-violet-800 shadow-lg hover:shadow-xl transition-all duration-300 h-9 px-2.5 sm:px-3"
            title="產生今晚的節目單分享卡（IG / FB）— 下載 PNG 或複製到剪貼簿"
          >
            <Share2 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">節目單</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurtainOpen(true)}
            aria-label="開場儀式 — 6 秒儀式為今晚揭幕"
            className="bg-white/90 hover:bg-white border-2 border-indigo-300 hover:border-indigo-400 text-indigo-700 hover:text-indigo-800 shadow-lg hover:shadow-xl transition-all duration-300 h-9 px-2.5 sm:px-3"
            title="6 秒開場儀式：黑膠飛入 + 唱針落下 + 今晚開始 · LIVE"
          >
            <span className="text-base sm:mr-2">🎭</span>
            <span className="hidden sm:inline">開場</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintProgram}
            aria-label="列印節目單"
            className="bg-white/90 hover:bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 h-9 px-2.5 sm:px-3"
            title="列印 A4 直式節目單 — 雜誌風 Top 20 + 統計 + 主理人寄語"
          >
            <Printer className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">列印節目單</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setThankYouOpen(true)}
            aria-label="結束今晚演出 — 開啟感謝卡"
            className="bg-white/90 hover:bg-white border-2 border-rose-300 hover:border-rose-400 text-rose-700 hover:text-rose-800 shadow-lg hover:shadow-xl transition-all duration-300 h-9 px-2.5 sm:px-3"
            title="按下時跳出 END OF SIDE A 感謝卡，給觀眾儀式性收尾"
          >
            <span className="text-base sm:mr-2">🎬</span>
            <span className="hidden sm:inline">結束今晚</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('?mode=stage', '_blank', 'noopener')}
            aria-label="演出模式"
            className="bg-white/90 hover:bg-white border-2 border-amber-300 hover:border-amber-400 text-amber-700 hover:text-amber-800 shadow-lg hover:shadow-xl transition-all duration-300 h-9 px-2.5 sm:px-3"
            title="在新分頁開啟演出模式（適合外接螢幕 / 投影）"
          >
            <Tv className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">演出模式</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            aria-label="登出管理"
            title="登出管理"
            className="bg-white/90 hover:bg-white border-2 border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 shadow-lg hover:shadow-xl transition-all duration-300 h-9 px-2.5 sm:px-3"
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">登出</span>
          </Button>
        </motion.div>
      )}

      <div className="container mx-auto py-3 sm:py-6 md:py-8 px-2 sm:px-4">
        {/* Editorial topbar — 雜誌品牌列：黑膠圓圈 + 阿凱 · Guitar Singalong + ISSUE №12 mono divider */}
        <div className="editorial-topbar">
          <div className="editorial-topbar-brand">
            <span className="editorial-brand-mark" aria-hidden="true" />
            <span>阿凱 · Guitar Singalong</span>
            <span className="editorial-topbar-issue">ISSUE №12 · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <ShareButton />
          </div>
        </div>

        {/* Editorial Masthead — 雜誌風大標：眉標 + 義式襯線大字 + 統計帶 + 90 MIN 卡帶 */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="editorial-hero mb-4 sm:mb-6"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <span className="live-dot" aria-hidden="true" />
              <span className="eyebrow">ISSUE №12 · SIDE A · 阿凱彈唱之夜</span>
            </div>

            <h1 className="editorial-hero-title">
              吉他彈唱<br />
              <span className="ital">點歌系統</span>
            </h1>

            <p className="editorial-hero-sub">
              像一卷 90 分鐘卡帶。<br />
              翻面、按下錄音鍵、把你想聽的歌寫進今晚的歌單。
            </p>

            <div className="editorial-hero-stats">
              <div className="editorial-hero-stat">
                <div className="n">{songs.length}</div>
                <div className="l">Setlist</div>
              </div>
              <div className="editorial-hero-stat-divider" aria-hidden="true" />
              <div className="editorial-hero-stat">
                <div className="n">{songs.reduce((a, s) => a + (s.voteCount || 0), 0)}</div>
                <div className="l">Votes Tonight</div>
              </div>
              <div className="editorial-hero-stat-divider" aria-hidden="true" />
              <div className="editorial-hero-stat">
                <div className="n">{voteTodayUnique || 0}</div>
                <div className="l">Active</div>
              </div>
            </div>
          </div>

          {/* 90 MIN 卡帶主視覺 */}
          <div className="editorial-cassette" aria-hidden="true">
            <div className="editorial-cassette-shell" />
            <span className="editorial-cassette-screw tl" />
            <span className="editorial-cassette-screw tr" />
            <span className="editorial-cassette-screw bl" />
            <span className="editorial-cassette-screw br" />
            <div className="editorial-cassette-toplabel">
              <div>
                <div className="side">SIDE A · 90 MIN</div>
                <div className="name">阿凱彈唱之夜</div>
              </div>
              <div className="issue">N°12</div>
            </div>
            <div className="editorial-cassette-inner">
              <div className="row">
                <span className="lo">HIGH-BIAS</span>
                <span className="mid">type II</span>
                <span className="ro">DOLBY NR</span>
              </div>
              <div className="editorial-cassette-reels">
                <div className="editorial-cassette-reel" />
                <div className="editorial-cassette-tape"><i /></div>
                <div className="editorial-cassette-reel" />
              </div>
              <div className="row time">
                <span>00:00</span>
                <span aria-hidden="true" />
                <span>90:00</span>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Ticker marquee — 雜誌跑馬燈 */}
        <div className="editorial-ticker" aria-hidden="true">
          <div className="track">
            {[
              "Tonight's set · 17 songs queued",
              "誰會唱到天亮？",
              "新歌進榜 · 任性 / 五月天",
              "現場人氣值 +24%",
              "點歌請投票 · 投票即催歌",
              "Side A · 33⅓ RPM · LIVE",
              "Tonight's set · 17 songs queued",
              "誰會唱到天亮？",
              "新歌進榜 · 任性 / 五月天",
              "現場人氣值 +24%",
              "點歌請投票 · 投票即催歌",
              "Side A · 33⅓ RPM · LIVE",
            ].map((t, i) => (
              <span key={i} className="item">
                <span className="star">★</span> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Rest of the content */}
        <AnimatePresence>
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
            layout
            transition={{
              layout: { duration: 0.3 },
            }}
          >
            {/* Song suggestion section — editorial quote style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <div className="editorial-section-head">
                <div className="h-title">
                  <span className="chap">№ 01 / 推 薦</span>
                  <h2>想聽的歌還沒有？</h2>
                </div>
                <div className="h-meta">Reader’s Pick</div>
              </div>
              <div className="editorial-suggest">
                <div className="flex items-center gap-3 mb-1 relative z-10">
                  <span className="font-mono-eyebrow">Editor’s Note</span>
                </div>
                <h3 className="editorial-suggest-title">推薦一首，下一場可能就會排進歌單</h3>
                <p className="editorial-suggest-sub">
                  把你心中的曲目寄給阿凱老師，他會挑出最適合現場彈唱的版本納入。
                </p>
                <div className="mt-5 relative z-10">
                  <Suspense fallback={<SectionSkeleton />}>
                    <SongSuggestion
                      isAdmin={user?.isAdmin ?? false}
                      songs={songs}
                      onNavigateToSong={handleNavigateToSong}
                    />
                  </Suspense>
                </div>
              </div>
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
                  <>
                    <div className="editorial-section-head">
                      <div className="h-title">
                        <span className="chap">№ 02 / 歌 單</span>
                        <h2>可選歌單</h2>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <SortSelector value={sortMode} onChange={setSortMode} />
                        <VoteHistoryButton
                          todayCount={voteTodayCount}
                          totalCount={voteHistory.length}
                          onClick={() => setHistoryOpen(true)}
                        />
                        {voteHistory.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setPassportOpen(true)}
                            aria-label="開啟我的催歌履歷"
                            title="我的催歌履歷 — 累積票數、徽章收藏"
                            className="h-8 px-2 text-xs gap-1.5 shrink-0"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">履歷</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  <Card className="shadow-lg editorial-paper">
                    <CardContent className="p-3 pt-3">
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
                        onOpenDetail={setDetailSong}
                      />
                    </CardContent>
                  </Card>
                  </>
                }
                rankingContent={
                  <>
                    <div className="editorial-section-head">
                      <div className="h-title">
                        <span className="chap">№ 03 / 排 行</span>
                        <h2>人氣點播排行榜</h2>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLeaderboardOpen(true)}
                        aria-label="投票領袖板"
                        title="看誰灌票最猛"
                        className="h-8 px-2 text-xs gap-1.5 shrink-0"
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">領袖板</span>
                      </Button>
                    </div>
                    <Card className="shadow-lg editorial-paper-cream">
                      <CardContent className="p-3 pt-3">
                        <Suspense fallback={<SectionSkeleton />}>
                          <RankingBoard songs={songs} user={user} />
                        </Suspense>
                      </CardContent>
                    </Card>
                  </>
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
                  <div className="editorial-section-head">
                    <div className="h-title">
                      <span className="chap">№ 02 / 歌 單</span>
                      <h2>可選歌單</h2>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <SortSelector value={sortMode} onChange={setSortMode} />
                      <VoteHistoryButton
                        todayCount={voteTodayCount}
                        totalCount={voteHistory.length}
                        onClick={() => setHistoryOpen(true)}
                      />
                    </div>
                  </div>
                  <Card className="shadow-lg editorial-paper">
                    <CardContent className="p-3 sm:p-6 pt-3 sm:pt-6">
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
                        onOpenDetail={setDetailSong}
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
                  <div className="editorial-section-head">
                    <div className="h-title">
                      <span className="chap">№ 03 / 排 行</span>
                      <h2>人氣點播排行榜</h2>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLeaderboardOpen(true)}
                      aria-label="投票領袖板"
                      title="看誰灌票最猛"
                      className="h-8 px-2 text-xs gap-1.5 shrink-0"
                    >
                      <Trophy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">領袖板</span>
                    </Button>
                  </div>
                  <Card className="shadow-lg editorial-paper-cream">
                    <CardContent className="p-3 sm:p-6 pt-3 sm:pt-6">
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

        {/* Editorial footer — 雜誌風版權帶 + 旋轉刻度標記 */}
        <footer className="editorial-footer">
          <div>© {new Date().getFullYear()} 阿凱彈唱之夜 · 桃園 SMES · v2.0 hi-fi</div>
          <div className="editorial-flag-rule">
            <span>Side A</span>
            <span aria-hidden="true" />
            <span>33⅓ RPM · LIVE</span>
          </div>
        </footer>
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

      {/* Up Next 底部 sticky 隊列條 — 演出中 / 觀眾剛投票 / 待開場三種狀態 */}
      <UpNextBar
        songs={songs}
        onOpenDetail={setDetailSong}
        onShowFullQueue={() => {
          setActiveTabForMobile('ranking');
          // 桌機版捲到排行榜區
          requestAnimationFrame(() => {
            const el = document.querySelector('.editorial-paper-cream');
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        }}
      />

      {/* 互動動畫覆蓋層（全螢幕） — 專注輸入時暫停，避免蓋住表單干擾打字 */}
      {!isComposing && <InteractionOverlay />}

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

      {/* 連擊計數中央大字效果 — 專注輸入時暫停 */}
      {!isComposing && <ComboOverlay combo={combo} />}

      {/* 黑馬時刻全螢幕慶祝 — 專注輸入時暫停 */}
      {!isComposing && <DarkHorseOverlay event={darkHorseEvent} />}

      {/* 全站投票熱度（1 分鐘 50/100/200 票觸發） — 專注輸入時暫停 */}
      {!isComposing && <GlobalHypeOverlay event={hypeEvent} />}

      {/* SW 新版本通知 banner (右下角) */}
      <UpdatePrompt />

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

      {/* 投票領袖板 Modal — lazy load */}
      {leaderboardOpen && (
        <Suspense fallback={null}>
          <VoterLeaderboardModal
            isOpen={leaderboardOpen}
            onClose={() => setLeaderboardOpen(false)}
          />
        </Suspense>
      )}

      {/* Cmd+K 命令面板 */}
      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            songs={songs}
            onSearchSong={(q) => {
              setActiveTabForMobile('songs');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('searchSong', { detail: { searchTerm: q } }));
              }, 100);
            }}
            onOpenHistory={() => setHistoryOpen(true)}
            onOpenLeaderboard={() => setLeaderboardOpen(true)}
            onOpenStage={() => window.open('?mode=stage', '_blank', 'noopener')}
            onShowShortcutsHelp={() => setShortcutsHelpOpen(true)}
            isAdmin={!!user?.isAdmin}
          />
        </Suspense>
      )}

      {/* ? 快捷鍵說明 */}
      {shortcutsHelpOpen && (
        <Suspense fallback={null}>
          <ShortcutsHelpModal
            isOpen={shortcutsHelpOpen}
            onClose={() => setShortcutsHelpOpen(false)}
          />
        </Suspense>
      )}

      {/* 歌曲詳情頁（Editorial 雜誌風全螢幕 modal） */}
      <SongDetailModal
        song={detailSong}
        allSongs={songs}
        onClose={() => setDetailSong(null)}
        onSelectSimilar={(s) => setDetailSong(s)}
      />

      {/* 節目單分享卡 (管理員) — lazy load */}
      {shareCardOpen && (
        <Suspense fallback={null}>
          <ShareCardModal
            isOpen={shareCardOpen}
            onClose={() => setShareCardOpen(false)}
            songs={songs}
          />
        </Suspense>
      )}

      {/* END OF SIDE A 演出收尾感謝卡 (管理員) — lazy load
          點分享按鈕會自動關閉 + 開 ShareCard */}
      {thankYouOpen && (
        <Suspense fallback={null}>
          <ThankYouModal
            isOpen={thankYouOpen}
            onClose={() => setThankYouOpen(false)}
            songs={songs}
            onShare={() => {
              setThankYouOpen(false);
              // 等 dismiss 動畫播完 (~420ms) 再開 ShareCard，視覺更順
              setTimeout(() => setShareCardOpen(true), 460);
            }}
          />
        </Suspense>
      )}

      {/* 開場儀式 — 6 秒鏡像反向 thank-you 動畫 */}
      {curtainOpen && (
        <Suspense fallback={null}>
          <OpeningCurtain
            isOpen={curtainOpen}
            onClose={() => setCurtainOpen(false)}
            songCount={songs.length}
          />
        </Suspense>
      )}

      {/* 催歌履歷 — 訪客個人徽章與統計 */}
      {passportOpen && (
        <Suspense fallback={null}>
          <VoterPassportModal
            isOpen={passportOpen}
            onClose={() => setPassportOpen(false)}
            history={voteHistory}
            onShare={() => {
              setPassportOpen(false);
              setTimeout(() => setShareCardOpen(true), 220);
            }}
          />
        </Suspense>
      )}

      {/* 統計儀表板 (管理員) */}
      {statsOpen && (
        <Suspense fallback={null}>
          <StatsDashboard
            isOpen={statsOpen}
            onClose={() => setStatsOpen(false)}
            songs={songs}
          />
        </Suspense>
      )}

      {/* 列印用節目單 — 只在 printMode 啟用時 mount，平常不佔 DOM */}
      {printMode && (
        <Suspense fallback={null}>
          <PrintProgram
            songs={songs}
            totalVotes={voterLeaderboard.totalVotes}
            totalVoters={voterLeaderboard.totalVoters}
            topVoters={voterLeaderboard.topVoters}
          />
        </Suspense>
      )}
    </div>
  );
}