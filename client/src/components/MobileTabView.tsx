// 手機版 Tab 介面元件 - 支援手勢滑動（效能優化版）
import { useState, useCallback, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music2, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';

interface MobileTabViewProps {
    songListContent: React.ReactNode;
    rankingContent: React.ReactNode;
    isAdmin?: boolean; // 新增：管理員預設顯示排行榜
}

type TabType = 'songs' | 'ranking';
const TABS: TabType[] = ['songs', 'ranking'];

export function MobileTabView({ songListContent, rankingContent, isAdmin = false }: MobileTabViewProps) {
    // 管理員預設顯示排行榜，一般用戶預設顯示歌曲列表
    const [activeTab, setActiveTab] = useState<TabType>(isAdmin ? 'ranking' : 'songs');
    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

    // 追蹤上次的 isAdmin 狀態，用於偵測登入
    const prevIsAdminRef = useRef(isAdmin);

    // 監聽 isAdmin 變化：當用戶從非管理員變成管理員時，自動切換到排行榜
    useEffect(() => {
        if (isAdmin && !prevIsAdminRef.current) {
            // 用戶剛剛登入為管理員，切換到排行榜
            setSwipeDirection('left');
            setActiveTab('ranking');
        }
        prevIsAdminRef.current = isAdmin;
    }, [isAdmin]);

    // 切換到下一個 Tab
    const goToNextTab = useCallback(() => {
        const currentIndex = TABS.indexOf(activeTab);
        if (currentIndex < TABS.length - 1) {
            setSwipeDirection('left');
            setActiveTab(TABS[currentIndex + 1]);
        }
    }, [activeTab]);

    // 切換到上一個 Tab
    const goToPrevTab = useCallback(() => {
        const currentIndex = TABS.indexOf(activeTab);
        if (currentIndex > 0) {
            setSwipeDirection('right');
            setActiveTab(TABS[currentIndex - 1]);
        }
    }, [activeTab]);

    // 手勢滑動設定
    const swipeHandlers = useSwipeable({
        onSwipedLeft: goToNextTab,
        onSwipedRight: goToPrevTab,
        trackMouse: false,
        trackTouch: true,
        delta: 50,
        swipeDuration: 500,
        preventScrollOnSwipe: false,
    });

    // 處理 Tab 變更（點擊）
    const handleTabChange = (value: string) => {
        const newTab = value as TabType;
        setSwipeDirection(TABS.indexOf(newTab) > TABS.indexOf(activeTab) ? 'left' : 'right');
        setActiveTab(newTab);
    };

    // 滑動動畫變體
    const slideVariants = {
        enter: (direction: 'left' | 'right' | null) => ({
            x: direction === 'left' ? 100 : direction === 'right' ? -100 : 0,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: 'left' | 'right' | null) => ({
            x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
            opacity: 0,
        }),
    };

    return (
        <div className="md:hidden" {...swipeHandlers}>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                {/* 優化的 Tab 切換區塊 */}
                <div className="sticky top-0 z-20 bg-gradient-to-b from-background via-background to-background/95 pb-3 pt-1">
                    {/* 提示文字 - 更醒目的設計 */}
                    <div className="flex items-center justify-center gap-2 mb-2 px-4 py-1.5 mx-auto w-fit rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60">
                        <div className="flex items-center text-amber-600">
                            <ChevronLeft className="w-4 h-4 animate-pulse" />
                            <ChevronLeft className="w-4 h-4 -ml-2 opacity-50" />
                        </div>
                        <span className="text-xs font-medium text-amber-700">
                            👆 點擊切換 或 👈👉 左右滑動
                        </span>
                        <div className="flex items-center text-amber-600">
                            <ChevronRight className="w-4 h-4 opacity-50" />
                            <ChevronRight className="w-4 h-4 -ml-2 animate-pulse" />
                        </div>
                    </div>

                    <TabsList className="grid w-full grid-cols-2 h-14 p-1.5 bg-gradient-to-r from-amber-100/80 via-orange-50 to-amber-100/80 rounded-xl shadow-lg border-2 border-amber-200/50">
                        <TabsTrigger
                            value="songs"
                            className="relative flex items-center justify-center gap-2 h-full rounded-lg font-semibold text-base
                                data-[state=inactive]:text-amber-700/70 data-[state=inactive]:hover:text-amber-800 data-[state=inactive]:hover:bg-white/40
                                data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20
                                transition-all duration-300 ease-out"
                        >
                            <Music2 className="w-5 h-5" />
                            <span>歌曲列表</span>
                            {activeTab === 'songs' && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-primary to-primary/70 rounded-full"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="ranking"
                            className="relative flex items-center justify-center gap-2 h-full rounded-lg font-semibold text-base
                                data-[state=inactive]:text-amber-700/70 data-[state=inactive]:hover:text-amber-800 data-[state=inactive]:hover:bg-white/40
                                data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20
                                transition-all duration-300 ease-out"
                        >
                            <Trophy className="w-5 h-5" />
                            <span>排行榜</span>
                            {activeTab === 'ranking' && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-primary to-primary/70 rounded-full"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* 當前位置指示器 - CSS transition（移除 framer-motion） */}
                    <div className="flex justify-center gap-2 mt-3">
                        <div
                            className={`h-2 rounded-full transition-all duration-300 cursor-pointer hover:opacity-80 active:scale-90 ${activeTab === 'songs'
                                ? 'bg-primary w-6'
                                : 'bg-gray-300 hover:bg-gray-400 w-2'
                                }`}
                            onClick={() => handleTabChange('songs')}
                        />
                        <div
                            className={`h-2 rounded-full transition-all duration-300 cursor-pointer hover:opacity-80 active:scale-90 ${activeTab === 'ranking'
                                ? 'bg-primary w-6'
                                : 'bg-gray-300 hover:bg-gray-400 w-2'
                                }`}
                            onClick={() => handleTabChange('ranking')}
                        />
                    </div>
                </div>

                {/* Tab 內容區域 - 滑動動畫 */}
                <div className="overflow-hidden">
                    <AnimatePresence mode="wait" custom={swipeDirection}>
                        {activeTab === 'songs' && (
                            <TabsContent value="songs" className="mt-0 focus-visible:outline-none" forceMount>
                                <motion.div
                                    key="songs"
                                    custom={swipeDirection}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                >
                                    {songListContent}
                                </motion.div>
                            </TabsContent>
                        )}

                        {activeTab === 'ranking' && (
                            <TabsContent value="ranking" className="mt-0 focus-visible:outline-none" forceMount>
                                <motion.div
                                    key="ranking"
                                    custom={swipeDirection}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25, ease: "easeOut" }}
                                >
                                    {rankingContent}
                                </motion.div>
                            </TabsContent>
                        )}
                    </AnimatePresence>
                </div>
            </Tabs>
        </div>
    );
}

export default MobileTabView;
