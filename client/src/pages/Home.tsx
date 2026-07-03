import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Trophy, Tv, Share2, Award, Printer, Users } from "lucide-react";
import SongList from "../components/SongList";
import { useVoteHistory, type VoteHistoryEntry } from "@/hooks/useVoteHistory";
import { VoteHistoryButton } from "../components/VoteHistoryButton";
import { SortSelector } from "../components/SortSelector";
import { useSortMode } from "@/hooks/useSortMode";
import { useComposingLevel, useComposingWhileTyping } from "@/lib/composingGuard";
import { useComboCounter } from "@/hooks/useComboCounter";
import { ComboOverlay } from "../components/ComboOverlay";
import { useDarkHorse } from "@/hooks/useDarkHorse";
import { useMissedHypeReplay } from "@/hooks/useMissedHypeReplay";
import { trackEvent } from "@/lib/funnelAnalytics";
import { recordHighlight } from "@/lib/liveRecap";
import { LiveRecap } from "../components/LiveRecap";
import { DarkHorseOverlay } from "../components/DarkHorseOverlay";
import { useGlobalHype, HYPE_META } from "@/hooks/useGlobalHype";
import { useVoterLeaderboard } from "@/hooks/useVoterLeaderboard";
import { GlobalHypeOverlay } from "../components/GlobalHypeOverlay";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { BarChart3, Filter } from "lucide-react";
import { useSpaceBranding } from "@/hooks/useSpaceBranding";

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
const FunnelDashboard = lazy(() =>
  import("../components/FunnelDashboard").then((m) => ({ default: m.FunnelDashboard }))
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
const TransposeToolModal = lazy(() =>
  import("../components/TransposeToolModal").then((m) => ({ default: m.TransposeToolModal }))
);

// VoteHistoryModal 不在首屏關鍵路徑，lazy load
const VoteHistoryModal = lazy(() =>
  import("../components/VoteHistoryModal").then((m) => ({ default: m.VoteHistoryModal }))
);
const SongImport = lazy(() => import("../components/SongImport"));
const LoginForm = lazy(() => import("../components/LoginForm"));
// U1 使用者審核後台（root admin 專用）
const UserManagementModal = lazy(() =>
  import("../components/UserManagementModal").then((m) => ({ default: m.UserManagementModal }))
);
const SongDetailModal = lazy(() =>
  import("../components/SongDetail").then((m) => ({ default: m.SongDetailModal }))
);
import { motion, AnimatePresence } from "framer-motion";
import { ShareButton } from "../components/ShareButton";
import { AppLoading } from "@/components/AppLoading";
import { subscribeSongs, type Song } from "@/lib/firestore";
import { saveStageSongsCache } from "@/lib/stageCache";
import { getActiveTenant } from "@/lib/firebase";
import { buildSpaceStageUrl } from "@/lib/spaceUrl";
import { MobileTabView } from "../components/MobileTabView";
import { ScrollToTop } from "../components/ScrollToTop";
import { FloatingStack } from "../components/FloatingStack";
import { NowPlayingNotification } from "../components/NowPlayingNotification";
import { UpNextBar } from "../components/UpNextBar";
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
    <div className="p-4">
      <AppLoading kind="section" compact />
    </div>
  );
}

const PAGE_SIZE = 30;

const preloadStagePage = () => {
  void import("./StagePage");
};

export default function Home() {
  // U1 Phase 3b：目前空間的自訂品牌名稱（沒設定則用預設「吉他彈唱之夜」）
  const branding = useSpaceBranding();
  const brandName = branding.spaceName || '吉他彈唱之夜';
  useEffect(() => {
    document.title = `${brandName} · Guitar Singalong｜吉他彈唱點歌系統`;
  }, [brandName]);

  const [songs, setSongs] = useState<Song[]>([]);
  const [displayedSongs, setDisplayedSongs] = useState<Song[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTabForMobile, setActiveTabForMobile] = useState<'songs' | 'ranking' | 'voters'>('songs');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [funnelOpen, setFunnelOpen] = useState(false);
  // U1 使用者審核後台（root admin 專用）
  const [userMgmtOpen, setUserMgmtOpen] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [curtainOpen, setCurtainOpen] = useState(false);
  const [transposeToolOpen, setTransposeToolOpen] = useState(false);
  const [transposeToolLoaded, setTransposeToolLoaded] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [detailSong, setDetailSong] = useState<Song | null>(null);
  const printCleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 全站任一文字輸入框聚焦時自動進入「專注輸入」模式（涵蓋搜尋、登入、編輯、匯入等所有輸入框）
  useComposingWhileTyping();
  // 專注輸入等級：'hard'（表單）暫停覆蓋層、'soft'（搜尋）淡化、null 正常顯示
  const composingLevel = useComposingLevel();
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

  // 補播佇列：填表單（hard 防干擾）時錯過的黑馬／全站熱度，打完字後補一則精簡提示
  const handleReplayMissed = useCallback((missedLabels: string[]) => {
    trackEvent('missed_replay_shown');
    toast({
      title: '剛剛你忙著打字，錯過了現場高潮 🎉',
      description: (
        <span className="block whitespace-pre-line">{missedLabels.join('\n')}</span>
      ),
    });
  }, [toast]);
  useMissedHypeReplay({ composingLevel, darkHorseEvent, hypeEvent, onReplay: handleReplayMissed });

  // 漏斗埋點：每進入一次 hard 專注輸入記一次（null/soft → hard 的轉換）
  const prevComposingRef = useRef<typeof composingLevel>(null);
  useEffect(() => {
    if (composingLevel === 'hard' && prevComposingRef.current !== 'hard') {
      trackEvent('composing_focus_session');
    }
    prevComposingRef.current = composingLevel;
  }, [composingLevel]);

  // 現場回顧：把黑馬 / 全站熱度記入時間軸（標記是否在打字 hard 時錯過），供 LiveRecap 補看
  const recapDarkHorseRef = useRef(0);
  useEffect(() => {
    if (!darkHorseEvent || darkHorseEvent.triggeredAt === recapDarkHorseRef.current) return;
    recapDarkHorseRef.current = darkHorseEvent.triggeredAt;
    recordHighlight({
      id: `dh-${darkHorseEvent.triggeredAt}`,
      kind: 'darkhorse',
      title: '🐎 黑馬時刻',
      detail: `「${darkHorseEvent.songTitle}」衝進第 ${darkHorseEvent.toRank} 名`,
      missed: composingLevel === 'hard',
    });
  }, [darkHorseEvent, composingLevel]);

  const recapHypeRef = useRef(0);
  useEffect(() => {
    if (!hypeEvent || hypeEvent.triggeredAt === recapHypeRef.current) return;
    recapHypeRef.current = hypeEvent.triggeredAt;
    const meta = HYPE_META[hypeEvent.level];
    recordHighlight({
      id: `hype-${hypeEvent.triggeredAt}`,
      kind: 'hype',
      title: `${meta.emoji} ${meta.label}`,
      detail: `全站 ${hypeEvent.count} 票`,
      missed: composingLevel === 'hard',
    });
  }, [hypeEvent, composingLevel]);
  const { user, logout } = useUser();
  const canUseTransposeTool = !!user?.isAdmin;
  const {
    history: voteHistory,
    todayCount: voteTodayCount,
    todayUniqueCount: voteTodayUnique,
    clearHistory: clearVoteHistory,
  } = useVoteHistory();

  const openStageMode = useCallback(() => {
    preloadStagePage();
    saveStageSongsCache(songs);
    // U1 Phase 2：租戶空間帶 ?space=uid — 投影裝置未登入也落在正確空間
    window.open(buildSpaceStageUrl(getActiveTenant()), '_blank', 'noopener');
  }, [songs]);

  useEffect(() => {
    if (!canUseTransposeTool && transposeToolOpen) {
      setTransposeToolOpen(false);
    }
    if (!canUseTransposeTool && transposeToolLoaded) {
      setTransposeToolLoaded(false);
    }
  }, [canUseTransposeTool, transposeToolLoaded, transposeToolOpen]);

  const openTransposeTool = useCallback(() => {
    setTransposeToolLoaded(true);
    setTransposeToolOpen(true);
  }, []);

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

  // 觸發 A4 直式節目單列印（用瀏覽器原生 window.print + @media print）
  const cleanupPrintMode = useCallback(() => {
    if (printCleanupTimerRef.current) {
      clearTimeout(printCleanupTimerRef.current);
      printCleanupTimerRef.current = null;
    }
    document.body.classList.remove('print-mode');
    setPrintMode(false);
  }, []);
  // Print A4 program. Mobile browsers do not always fire afterprint, so keep fallback cleanup.
  const handlePrintProgram = useCallback(async () => {
    await import("../components/PrintProgram");
    if (printCleanupTimerRef.current) {
      clearTimeout(printCleanupTimerRef.current);
      printCleanupTimerRef.current = null;
    }

    setPrintMode(true);
    document.body.classList.add('print-mode');

    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        // 安全網：萬一 afterprint / matchMedia / visibilitychange 全都沒觸發
        // （極少數瀏覽器），60 秒後強制還原，避免永遠卡在列印預覽覆蓋層。
        // 不可設太短，否則使用者還在看預覽就被踢回主頁（此為先前的 bug）。
        printCleanupTimerRef.current = setTimeout(cleanupPrintMode, 60000);
      });
    });
  }, [cleanupPrintMode]);

  useEffect(() => {
    const onAfterPrint = () => cleanupPrintMode();

    // matchMedia('print') 變化是「列印結束」最可靠的跨瀏覽器訊號：
    // 開始列印時 matches=true，結束時 matches=false。
    const mql = typeof window.matchMedia === 'function' ? window.matchMedia('print') : null;
    const onMqlChange = (e: MediaQueryListEvent) => {
      if (!e.matches) cleanupPrintMode();
    };

    // 行動裝置 fallback：部分手機瀏覽器不觸發 afterprint。
    // 它們會在叫出列印 / 分享面板時把頁面切到隱藏，回來時再顯示。
    // 只有「曾隱藏過後再顯示」才清除，確保桌機同分頁的列印預覽
    // 開著時絕不會被誤清（這正是先前會自動跳回主頁的原因）。
    let wasHidden = false;
    const onVisibility = () => {
      if (document.hidden) {
        wasHidden = true;
      } else if (wasHidden) {
        wasHidden = false;
        cleanupPrintMode();
      }
    };

    // 鍵盤 Esc 關閉螢幕列印預覽
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.body.classList.contains('print-mode')) {
        cleanupPrintMode();
      }
    };

    window.addEventListener('afterprint', onAfterPrint);
    mql?.addEventListener?.('change', onMqlChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('afterprint', onAfterPrint);
      mql?.removeEventListener?.('change', onMqlChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onKeyDown);
      cleanupPrintMode();
    };
  }, [cleanupPrintMode]);
  // Stable shuffle seed for this page load.
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
      saveStageSongsCache(updatedSongs);

      if (!hasConnectedOnce) {
        setIsConnected(true);
        hasConnectedOnce = true;
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

  // 開場儀式不再對訪客自動播放（每次更新 SW / 重新整理都跳出很干擾）。
  // 改為「純管理員手動觸發」：上方工具列「🎭 開場」按鈕按下才播放（setCurtainOpen(true)）。

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
    return <AppLoading kind="data" />;
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-background to-primary/5 has-floating-actions ${user?.isAdmin ? 'has-admin-floating-actions' : ''}`}>
      <div className="editorial-floating-actions" aria-label="常用工具">
        {canUseTransposeTool && (
          <button
            className="ttm-entry ttm-floating-action"
            onClick={openTransposeTool}
            aria-label="快速轉調工具"
            title="管理員快速轉調工具"
          >
            <span aria-hidden="true">🎸</span>
            <span className="hidden sm:inline">轉調工具</span>
          </button>
        )}
        <ShareButton />
      </div>

      {/* Admin: 登出 + 演出模式入口 */}
      {user?.isAdmin && (
        <motion.div
          className="editorial-admin-toolbar"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
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
            onClick={() => setFunnelOpen(true)}
            aria-label="點歌建議漏斗"
            className="bg-white/90 hover:bg-white border-2 border-blue-300 hover:border-blue-400 text-blue-700 hover:text-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 h-9 px-2.5 sm:px-3"
            title="點歌建議漏斗（開啟→打字→送出轉換率、重複提示成效）"
          >
            <Filter className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">漏斗</span>
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
            onPointerEnter={preloadStagePage}
            onFocus={preloadStagePage}
            onClick={openStageMode}
            aria-label="演出模式"
            className="bg-white/90 hover:bg-white border-2 border-amber-300 hover:border-amber-400 text-amber-700 hover:text-amber-800 shadow-lg hover:shadow-xl transition-all duration-300 h-9 px-2.5 sm:px-3"
            title="在新分頁開啟演出模式（適合外接螢幕 / 投影）"
          >
            <Tv className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">演出模式</span>
          </Button>
          {user?.isRootAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUserMgmtOpen(true)}
              aria-label="使用者審核"
              className="bg-white/90 hover:bg-white border-2 border-emerald-300 hover:border-emerald-400 text-emerald-700 hover:text-emerald-800 shadow-lg hover:shadow-xl transition-all duration-300 h-9 px-2.5 sm:px-3"
              title="審核 Google 註冊的新使用者（核准後獲得獨立歌單空間）"
            >
              <Users className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">審核</span>
            </Button>
          )}
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

      {/* U1：待審核 / 已停權使用者的狀態橫幅（登入了但還不能用系統）。
          ⚠️ 必須排除 status === 'approved'：管理員或已核准使用者「逛別人的
          公開空間」時 isAdmin 也是 false（訪客視角），不能誤貼待審核標籤
          （2026-07-03 實戰：Admin 在 ?space=… 網址登入被顯示等待審核） */}
      {user && !user.isAdmin && user.status !== 'approved' && (
        <div className="u1-pending-banner" role="status">
          <span className="u1-pending-dot" aria-hidden="true" />
          <div className="u1-pending-text">
            {user.status === 'rejected' ? (
              <>此帳號目前已停權，如有疑問請聯絡管理員。</>
            ) : (
              <>
                <strong>{user.displayName || user.email}</strong>，你的帳號已註冊成功，
                正在等待管理員審核 — 通過後就能擁有自己的獨立歌單空間。
              </>
            )}
          </div>
          <button onClick={handleLogout} className="u1-pending-logout" aria-label="登出">
            登出
          </button>
        </div>
      )}

      <div className="container mx-auto py-3 sm:py-6 md:py-8 px-2 sm:px-4">
        {/* Editorial topbar — 雜誌品牌列：黑膠圓圈 + 吉他彈唱之夜 · Guitar Singalong + ISSUE №12 mono divider */}
        <div className="editorial-topbar">
          <div className="editorial-topbar-brand">
            <span className="editorial-brand-mark" aria-hidden="true" />
            <span>{brandName} · Guitar Singalong</span>
            <span className="editorial-topbar-issue">ISSUE №12 · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}</span>
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
              <span className="eyebrow">ISSUE №12 · SIDE A · {brandName}</span>
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
                <div className="name">{brandName}</div>
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
                  把你心中的曲目寄給主持人，他會挑出最適合現場彈唱的版本納入。
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
                      {user?.isAdmin && (
                        <Suspense fallback={<SectionSkeleton />}>
                          <SongImport />
                        </Suspense>
                      )}
                      <div className="h-3" />
                      <SongList
                        songs={displayedSongs}
                        allSongs={songs}
                        user={user || null}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={loadMore}
                        totalCount={songs.length}
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
                      {user?.isAdmin && (
                        <Suspense fallback={<SectionSkeleton />}>
                          <SongImport />
                        </Suspense>
                      )}
                      <div className="h-3 sm:h-4" />
                      <SongList
                        songs={displayedSongs}
                        allSongs={songs}
                        user={user || null}
                        hasMore={hasMore}
                        isLoadingMore={isLoadingMore}
                        onLoadMore={loadMore}
                        totalCount={songs.length}
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
          <div>© {new Date().getFullYear()} {brandName} · 桃園 SMES · v2.0 hi-fi</div>
          <div className="editorial-flag-rule">
            <span>Side A</span>
            <span aria-hidden="true" />
            <span>33⅓ RPM · LIVE</span>
          </div>
        </footer>
      </div>

      {/* 右下角 FAB Stack — 登入鈕（下）＋ 返回頂部（上）自動堆疊，免手算 bottom 偏移 */}
      <FloatingStack>
        {!user && (
          <motion.div
            className="home-login-fab"
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
              登入 / 註冊
            </Button>
          </motion.div>
        )}
        <ScrollToTop threshold={400} />
      </FloatingStack>

      {/* 正在彈奏中通知（訪客即時接收）。管理員按「吉他譜」時自動同時開轉調工具（訪客不傳此 callback） */}
      <NowPlayingNotification onOpenTransposeTool={canUseTransposeTool ? openTransposeTool : undefined} />

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

      {/* PWA 安裝提示 */}
      <PWAInstallPrompt />

      {/* Login form modal */}
      {showLoginForm && (
        <Suspense fallback={<AppLoading kind="section" compact />}>
          <LoginForm onClose={() => setShowLoginForm(false)} />
        </Suspense>
      )}

      {/* 歌曲建議通知覆蓋層 - 管理員專用 */}
      <SuggestionNotificationOverlay
        isVisible={isSuggestionVisible}
        suggestion={currentSuggestion}
        onClose={dismissSuggestion}
      />

      {/*
        全螢幕慶祝／互動覆蓋層群組 — 依專注輸入等級調整：
          hard（表單）→ 整組不渲染（完全暫停）
          soft（搜尋）→ 淡化（opacity-30）保留現場感但不糊臉；ComboOverlay 連帶不放彩帶
          null         → 正常顯示
        這些覆蓋層皆 position:fixed，外層 div 無 transform 不影響其定位，opacity 會一併淡化整組。
      */}
      {composingLevel !== 'hard' && (
        <div className={composingLevel === 'soft' ? 'opacity-30 transition-opacity duration-300' : undefined}>
          {/* 互動動畫覆蓋層（全螢幕） */}
          <InteractionOverlay />
          {/* 連擊計數中央大字效果 */}
          <ComboOverlay combo={combo} suppressConfetti={composingLevel === 'soft'} />
          {/* 黑馬時刻全螢幕慶祝 */}
          <DarkHorseOverlay event={darkHorseEvent} />
          {/* 全站投票熱度（1 分鐘 50/100/200 票觸發） */}
          <GlobalHypeOverlay event={hypeEvent} />
        </div>
      )}

      {/* 現場回顧 — 可點開的時間軸，補看打字時錯過的黑馬/熱度（左下浮動 pill，無亮點時隱藏） */}
      <LiveRecap />

      {/* SW 新版本通知 banner (右下角) */}
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
            onOpenStage={openStageMode}
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

      {/* 🎸 快速轉調工具（貼譜 → 自動偵測調性 → 即時轉調） — lazy load */}
      {canUseTransposeTool && transposeToolLoaded && (
        <Suspense fallback={null}>
          <TransposeToolModal
            isOpen={transposeToolOpen}
            onClose={() => setTransposeToolOpen(false)}
            isAdmin={!!user?.isAdmin}
          />
        </Suspense>
      )}

      {/* 歌曲詳情頁（Editorial 雜誌風全螢幕 modal） */}
      {detailSong && (
        <Suspense fallback={<AppLoading kind="section" compact />}>
          <SongDetailModal
            song={detailSong}
            allSongs={songs}
            onClose={() => setDetailSong(null)}
            onSelectSimilar={(s) => setDetailSong(s)}
          />
        </Suspense>
      )}

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

      {funnelOpen && (
        <Suspense fallback={null}>
          <FunnelDashboard
            isOpen={funnelOpen}
            onClose={() => setFunnelOpen(false)}
          />
        </Suspense>
      )}

      {/* U1 使用者審核後台（root admin） */}
      {userMgmtOpen && (
        <Suspense fallback={null}>
          <UserManagementModal
            isOpen={userMgmtOpen}
            onClose={() => setUserMgmtOpen(false)}
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
            onClose={cleanupPrintMode}
          />
        </Suspense>
      )}
    </div>
  );
}
