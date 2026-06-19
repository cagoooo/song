// 手機版 Tab 介面 — Editorial 雜誌風（№02 歌單 / №03 排行 / №04 催歌王）
import { useState, useCallback, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { VoterBoard } from './VoterBoard';

interface MobileTabViewProps {
    songListContent: React.ReactNode;
    rankingContent: React.ReactNode;
    isAdmin?: boolean;
    activeTab?: TabType;
    onTabChange?: (tab: TabType) => void;
}

type TabType = 'songs' | 'ranking' | 'voters';
const TABS: TabType[] = ['songs', 'ranking', 'voters'];

const TAB_META: Record<TabType, { chap: string; label: string }> = {
    songs:   { chap: 'No. 02', label: '歌單' },
    ranking: { chap: 'No. 03', label: '排行' },
    voters:  { chap: 'No. 04', label: '催歌王' },
};

export function MobileTabView({
    songListContent,
    rankingContent,
    isAdmin = false,
    activeTab: controlledActiveTab,
    onTabChange,
}: MobileTabViewProps) {
    const [internalActiveTab, setInternalActiveTab] = useState<TabType>(isAdmin ? 'ranking' : 'songs');

    const activeTab = controlledActiveTab ?? internalActiveTab;
    const setActiveTab = useCallback((tab: TabType) => {
        if (onTabChange) {
            onTabChange(tab);
        } else {
            setInternalActiveTab(tab);
        }
    }, [onTabChange]);

    const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
    const prevIsAdminRef = useRef(isAdmin);

    useEffect(() => {
        if (!controlledActiveTab && isAdmin && !prevIsAdminRef.current) {
            setSwipeDirection('left');
            setActiveTab('ranking');
        }
        prevIsAdminRef.current = isAdmin;
    }, [isAdmin, controlledActiveTab, setActiveTab]);

    const goToNextTab = useCallback(() => {
        const currentIndex = TABS.indexOf(activeTab);
        if (currentIndex < TABS.length - 1) {
            setSwipeDirection('left');
            setActiveTab(TABS[currentIndex + 1]);
        }
    }, [activeTab, setActiveTab]);

    const goToPrevTab = useCallback(() => {
        const currentIndex = TABS.indexOf(activeTab);
        if (currentIndex > 0) {
            setSwipeDirection('right');
            setActiveTab(TABS[currentIndex - 1]);
        }
    }, [activeTab, setActiveTab]);

    const swipeHandlers = useSwipeable({
        onSwipedLeft: goToNextTab,
        onSwipedRight: goToPrevTab,
        trackMouse: false,
        trackTouch: true,
        delta: 50,
        swipeDuration: 500,
        preventScrollOnSwipe: false,
    });

    const handleTabChange = (value: string) => {
        const newTab = value as TabType;
        setSwipeDirection(TABS.indexOf(newTab) > TABS.indexOf(activeTab) ? 'left' : 'right');
        setActiveTab(newTab);
    };

    const slideVariants = {
        enter: (direction: 'left' | 'right' | null) => ({
            x: direction === 'left' ? 60 : direction === 'right' ? -60 : 0,
            opacity: 0,
        }),
        center: { x: 0, opacity: 1 },
        exit: (direction: 'left' | 'right' | null) => ({
            x: direction === 'left' ? -60 : direction === 'right' ? 60 : 0,
            opacity: 0,
        }),
    };

    return (
        <div className="md:hidden" {...swipeHandlers}>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                {/* Editorial 雜誌風 tab 列 */}
                <div
                    className="sticky top-0 z-20 bg-white pb-3 pt-2"
                    style={{ borderBottom: '2px solid var(--ed-ink-1)' }}
                >
                    <TabsList
                        className="grid w-full grid-cols-3 h-auto p-0 bg-transparent gap-0"
                        style={{ borderRadius: 0 }}
                    >
                        {TABS.map((t) => {
                            const meta = TAB_META[t];
                            const isActive = activeTab === t;
                            return (
                                <TabsTrigger
                                    key={t}
                                    value={t}
                                    onClick={() => handleTabChange(t)}
                                    className="relative flex flex-col items-start py-2 px-3 gap-0.5 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none focus-visible:outline-none focus-visible:ring-0"
                                    style={{ textAlign: 'left' }}
                                >
                                    <span
                                        style={{
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: 9,
                                            letterSpacing: '0.24em',
                                            textTransform: 'uppercase',
                                            color: isActive ? 'var(--ed-accent)' : 'var(--ed-ink-3)',
                                        }}
                                    >
                                        {meta.chap}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                            fontStyle: 'italic',
                                            fontWeight: 800,
                                            fontSize: 17,
                                            letterSpacing: '-0.01em',
                                            lineHeight: 1.1,
                                            color: isActive ? 'var(--ed-ink-1)' : 'var(--ed-ink-3)',
                                        }}
                                    >
                                        {meta.label}
                                    </span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobileTabUnderline"
                                            className="absolute -bottom-[2px] left-0 right-0"
                                            style={{
                                                height: 3,
                                                background: 'var(--ed-accent)',
                                            }}
                                            initial={false}
                                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        />
                                    )}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </div>

                {/* Tab 內容區 — 滑動動畫 */}
                <div className="overflow-hidden">
                    <AnimatePresence mode="wait" custom={swipeDirection}>
                        {activeTab === 'songs' && (
                            <TabsContent value="songs" className="mt-3 focus-visible:outline-none" forceMount>
                                <motion.div
                                    key="songs"
                                    custom={swipeDirection}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                >
                                    {songListContent}
                                </motion.div>
                            </TabsContent>
                        )}

                        {activeTab === 'ranking' && (
                            <TabsContent value="ranking" className="mt-3 focus-visible:outline-none" forceMount>
                                <motion.div
                                    key="ranking"
                                    custom={swipeDirection}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                >
                                    {rankingContent}
                                </motion.div>
                            </TabsContent>
                        )}

                        {activeTab === 'voters' && (
                            <TabsContent value="voters" className="mt-3 focus-visible:outline-none" forceMount>
                                <motion.div
                                    key="voters"
                                    custom={swipeDirection}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    className="px-3 pb-4"
                                >
                                    {/* 雜誌風章節 + 催歌王內容 */}
                                    <div className="editorial-section-head" style={{ marginBottom: 12, paddingBottom: 8 }}>
                                        <div className="h-title">
                                            <span className="chap">№ 04 / 催 歌 王</span>
                                            <h2>今晚最會催歌的人</h2>
                                        </div>
                                    </div>
                                    <div
                                        className="rounded-2xl p-4"
                                        style={{
                                            background: 'var(--ed-paper)',
                                            border: '1px solid rgba(17, 17, 17, 0.14)',
                                        }}
                                    >
                                        <VoterBoard topN={20} height={460} />
                                    </div>
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
