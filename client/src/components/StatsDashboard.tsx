import { useState, useMemo } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    BarChart3, Music2, Users, Calendar, TrendingUp, Clock, PieChart as PieIcon, Hash,
    Download,
} from 'lucide-react';
import { useStatsData } from '@/hooks/useStatsData';
import { useAllSongTags } from '@/hooks/useAllSongTags';
import type { Song } from '@/lib/firestore';

interface StatsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    songs: Song[];
}

// 圖表色盤
const CHART_COLORS = [
    '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#10b981',
    '#ec4899', '#3b82f6', '#eab308', '#84cc16', '#f97316',
    '#94a3b8',
];

function KpiCard({ icon, label, value, sub }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
}) {
    return (
        <div className="rounded-xl border bg-gradient-to-br from-white to-amber-50/30 dark:from-stone-900 dark:to-stone-800 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium mb-2">
                {icon}
                {label}
            </div>
            <div className="text-3xl font-black tabular-nums text-amber-600 dark:text-amber-400">{value}</div>
            {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
    );
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function StatsDashboard({ isOpen, onClose, songs }: StatsDashboardProps) {
    const { allTags, songTagsMap } = useAllSongTags();
    const [daysBack, setDaysBack] = useState(14);
    const stats = useStatsData({ songs, songTagsMap, allTags, daysBack, topN: 10 });

    // 熱力 — 找出最高小時值, 用於配色
    const maxHourly = useMemo(
        () => Math.max(1, ...stats.hourlyDistribution.map(p => p.count)),
        [stats.hourlyDistribution]
    );

    const handleExportCsv = () => {
        const rows: (string | number)[][] = [
            ['===KPI==='],
            ['總票數', stats.totalVotes],
            ['總歌曲', stats.totalSongs],
            ['投票者數', stats.totalVoters],
            ['今日票數', stats.todayVotes],
            [''],
            ['===Top 歌曲==='],
            ['排名', '歌曲', '歌手', '票數'],
            ...stats.topSongs.map((s, i) => [i + 1, s.song.title, s.song.artist, s.voteCount]),
            [''],
            [`===過去 ${daysBack} 天每日趨勢===`],
            ['日期', '票數'],
            ...stats.dailyTrend.map(d => [d.date, d.count]),
            [''],
            ['===24h 時段分布==='],
            ['小時', '票數'],
            ...stats.hourlyDistribution.map(h => [`${h.label}:00`, h.count]),
            [''],
            ['===歌手分布==='],
            ['歌手', '票數'],
            ...stats.artistSlices.map(a => [a.name, a.value]),
            [''],
            ['===標籤使用==='],
            ['標籤', '歌曲數', '票數'],
            ...stats.tagBars.map(t => [t.name, t.songs, t.votes]),
        ];
        downloadCsv(`stats-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                統計儀表板
                            </DialogTitle>
                            <DialogDescription>
                                即時聚合所有投票資料 — 純客戶端計算，不寫 Firestore
                            </DialogDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCsv}
                            className="shrink-0 gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" />
                            匯出 CSV
                        </Button>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 pb-6">
                    {/* KPI 卡片 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <KpiCard
                            icon={<TrendingUp className="w-3.5 h-3.5" />}
                            label="總票數"
                            value={stats.totalVotes.toLocaleString()}
                            sub={`今日 +${stats.todayVotes}`}
                        />
                        <KpiCard
                            icon={<Music2 className="w-3.5 h-3.5" />}
                            label="總歌曲"
                            value={stats.totalSongs.toLocaleString()}
                        />
                        <KpiCard
                            icon={<Users className="w-3.5 h-3.5" />}
                            label="投票者"
                            value={stats.totalVoters.toLocaleString()}
                            sub="獨立 session"
                        />
                        <KpiCard
                            icon={<Calendar className="w-3.5 h-3.5" />}
                            label="今日票數"
                            value={stats.todayVotes.toLocaleString()}
                        />
                    </div>

                    <Tabs defaultValue="top">
                        <TabsList className="grid w-full grid-cols-5 mb-4">
                            <TabsTrigger value="top" className="text-xs">
                                <BarChart3 className="w-3.5 h-3.5 mr-1" /> Top 10
                            </TabsTrigger>
                            <TabsTrigger value="trend" className="text-xs">
                                <TrendingUp className="w-3.5 h-3.5 mr-1" /> 趨勢
                            </TabsTrigger>
                            <TabsTrigger value="hourly" className="text-xs">
                                <Clock className="w-3.5 h-3.5 mr-1" /> 時段
                            </TabsTrigger>
                            <TabsTrigger value="artist" className="text-xs">
                                <PieIcon className="w-3.5 h-3.5 mr-1" /> 歌手
                            </TabsTrigger>
                            <TabsTrigger value="tags" className="text-xs">
                                <Hash className="w-3.5 h-3.5 mr-1" /> 標籤
                            </TabsTrigger>
                        </TabsList>

                        {/* Top 10 */}
                        <TabsContent value="top" className="mt-2">
                            <div className="rounded-lg border p-4 bg-card">
                                <h3 className="text-sm font-semibold mb-3">熱門歌曲 Top 10</h3>
                                {stats.topSongs.length === 0 ? (
                                    <EmptyChart />
                                ) : (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart data={stats.topSongs.map(s => ({ name: s.song.title, votes: s.voteCount, artist: s.song.artist }))} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis type="number" />
                                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                                            <Tooltip
                                                content={({ active, payload }) => active && payload?.[0] ? (
                                                    <div className="rounded-md border bg-background p-2 shadow-md text-xs">
                                                        <div className="font-bold">{payload[0].payload.name}</div>
                                                        <div className="text-muted-foreground">{payload[0].payload.artist}</div>
                                                        <div className="text-amber-600 font-bold">{payload[0].value} 票</div>
                                                    </div>
                                                ) : null}
                                            />
                                            <Bar dataKey="votes" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </TabsContent>

                        {/* 趨勢 */}
                        <TabsContent value="trend" className="mt-2">
                            <div className="rounded-lg border p-4 bg-card">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold">每日投票趨勢</h3>
                                    <div className="flex gap-1">
                                        {[7, 14, 30].map(n => (
                                            <Button
                                                key={n}
                                                variant={daysBack === n ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setDaysBack(n)}
                                                className="h-7 px-2 text-xs"
                                            >
                                                {n} 天
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                {stats.totalVotes === 0 ? <EmptyChart /> : (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={stats.dailyTrend}>
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="count" name="票數" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </TabsContent>

                        {/* 時段熱度 */}
                        <TabsContent value="hourly" className="mt-2">
                            <div className="rounded-lg border p-4 bg-card">
                                <h3 className="text-sm font-semibold mb-3">24 小時時段分布</h3>
                                {stats.totalVotes === 0 ? <EmptyChart /> : (
                                    <>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={stats.hourlyDistribution}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                                <YAxis tick={{ fontSize: 11 }} />
                                                <Tooltip
                                                    content={({ active, payload }) => active && payload?.[0] ? (
                                                        <div className="rounded-md border bg-background p-2 shadow-md text-xs">
                                                            <div className="font-bold">{payload[0].payload.label}:00 - {payload[0].payload.label}:59</div>
                                                            <div className="text-amber-600 font-bold">{payload[0].value} 票</div>
                                                        </div>
                                                    ) : null}
                                                />
                                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                    {stats.hourlyDistribution.map((entry, idx) => {
                                                        const intensity = entry.count / maxHourly;
                                                        const opacity = 0.3 + intensity * 0.7;
                                                        return <Cell key={idx} fill="#f59e0b" fillOpacity={opacity} />;
                                                    })}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <p className="text-xs text-muted-foreground mt-3 text-center">
                                            最熱時段：
                                            <span className="font-bold text-amber-600 mx-1">
                                                {stats.hourlyDistribution.reduce((a, b) => b.count > a.count ? b : a).label}:00
                                            </span>
                                        </p>
                                    </>
                                )}
                            </div>
                        </TabsContent>

                        {/* 歌手分布 */}
                        <TabsContent value="artist" className="mt-2">
                            <div className="rounded-lg border p-4 bg-card">
                                <h3 className="text-sm font-semibold mb-3">歌手票數分布 (Top 10)</h3>
                                {stats.artistSlices.length === 0 ? <EmptyChart /> : (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <PieChart>
                                            <Pie
                                                data={stats.artistSlices}
                                                cx="50%" cy="50%"
                                                outerRadius={130}
                                                dataKey="value"
                                                label={(entry) => `${entry.name} ${entry.value}`}
                                                labelLine={false}
                                            >
                                                {stats.artistSlices.map((_, i) => (
                                                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </TabsContent>

                        {/* 標籤 */}
                        <TabsContent value="tags" className="mt-2">
                            <div className="rounded-lg border p-4 bg-card">
                                <h3 className="text-sm font-semibold mb-3">標籤使用分布</h3>
                                {stats.tagBars.length === 0 ? (
                                    <div className="py-12 text-center text-sm text-muted-foreground">
                                        還沒有標籤資料 — 編輯歌曲時可加上標籤
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={Math.max(220, stats.tagBars.length * 35)}>
                                        <BarChart data={stats.tagBars} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                            <XAxis type="number" tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Legend wrapperStyle={{ fontSize: 12 }} />
                                            <Bar dataKey="songs" name="歌曲數" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                                            <Bar dataKey="votes" name="累積票數" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function EmptyChart() {
    return (
        <div className="py-12 text-center text-sm text-muted-foreground">
            <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            還沒有資料
        </div>
    );
}
