// 手機版 Tab 介面元件 - 優化 UI/UX
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music2, Trophy, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileTabViewProps {
    songListContent: React.ReactNode;
    rankingContent: React.ReactNode;
}

export function MobileTabView({ songListContent, rankingContent }: MobileTabViewProps) {
    const [activeTab, setActiveTab] = useState<'songs' | 'ranking'>('songs');

    return (
        <div className="md:hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'songs' | 'ranking')} className="w-full">
                {/* 優化的 Tab 切換區塊 */}
                <div className="sticky top-0 z-20 bg-gradient-to-b from-background via-background to-background/95 pb-3 pt-1">
                    {/* 提示文字 */}
                    <div className="flex items-center justify-center gap-1 mb-2 text-xs text-muted-foreground">
                        <ChevronLeft className="w-3 h-3 animate-pulse" />
                        <span>左右滑動或點擊切換</span>
                        <ChevronRight className="w-3 h-3 animate-pulse" />
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

                    {/* 當前位置指示器 */}
                    <div className="flex justify-center gap-2 mt-3">
                        <motion.div
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${activeTab === 'songs'
                                    ? 'bg-primary w-6'
                                    : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                            onClick={() => setActiveTab('songs')}
                            whileTap={{ scale: 0.9 }}
                        />
                        <motion.div
                            className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${activeTab === 'ranking'
                                    ? 'bg-primary w-6'
                                    : 'bg-gray-300 hover:bg-gray-400'
                                }`}
                            onClick={() => setActiveTab('ranking')}
                            whileTap={{ scale: 0.9 }}
                        />
                    </div>
                </div>

                {/* Tab 內容區域 - 添加滑動動畫 */}
                <AnimatePresence mode="wait">
                    <TabsContent value="songs" className="mt-0 focus-visible:outline-none">
                        <motion.div
                            key="songs"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {songListContent}
                        </motion.div>
                    </TabsContent>

                    <TabsContent value="ranking" className="mt-0 focus-visible:outline-none">
                        <motion.div
                            key="ranking"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {rankingContent}
                        </motion.div>
                    </TabsContent>
                </AnimatePresence>
            </Tabs>
        </div>
    );
}

export default MobileTabView;
