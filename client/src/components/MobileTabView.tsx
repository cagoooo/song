// 手機版 Tab 介面元件
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music2, Trophy } from 'lucide-react';

interface MobileTabViewProps {
    songListContent: React.ReactNode;
    rankingContent: React.ReactNode;
}

export function MobileTabView({ songListContent, rankingContent }: MobileTabViewProps) {
    const [activeTab, setActiveTab] = useState<'songs' | 'ranking'>('songs');

    return (
        <div className="md:hidden">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'songs' | 'ranking')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4 bg-gradient-to-r from-primary/10 to-primary/5 p-1 rounded-lg">
                    <TabsTrigger
                        value="songs"
                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
                    >
                        <Music2 className="w-4 h-4" />
                        <span className="font-medium">歌曲列表</span>
                    </TabsTrigger>
                    <TabsTrigger
                        value="ranking"
                        className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-200"
                    >
                        <Trophy className="w-4 h-4" />
                        <span className="font-medium">排行榜</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="songs" className="mt-0 focus-visible:outline-none">
                    {songListContent}
                </TabsContent>

                <TabsContent value="ranking" className="mt-0 focus-visible:outline-none">
                    {rankingContent}
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default MobileTabView;
