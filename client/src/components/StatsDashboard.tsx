import { useState, useMemo } from 'react';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { useStatsData } from '@/hooks/useStatsData';
import { useAllSongTags } from '@/hooks/useAllSongTags';
import type { Song } from '@/lib/firestore';

interface StatsDashboardProps {
    isOpen: boolean;
    onClose: () => void;
    songs: Song[];
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

/** SVG 折線圖（純 SVG，避免 recharts 視覺與雜誌風衝突） */
function TrendLine({ data }: { data: { label: string; count: number }[] }) {
    if (data.length === 0) {
        return (
            <div className="py-12 text-center text-sm text-slate-400 italic">
                還沒有資料
            </div>
        );
    }
    const w = 600;
    const h = 160;
    const padL = 28;
    const padR = 8;
    const padT = 8;
    const padB = 28;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const max = Math.max(1, ...data.map(d => d.count));
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    const pts = data.map((d, i) => {
        const x = padL + i * stepX;
        const y = padT + innerH - (d.count / max) * innerH;
        return { x, y, d };
    });
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fillPath = `${linePath} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z`;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="editorial-trend-line" preserveAspectRatio="none">
            {/* 底線 */}
            <line x1={padL} y1={padT + innerH} x2={w - padR} y2={padT + innerH} stroke="#111" strokeWidth="1" />
            {/* 填色 */}
            <path d={fillPath} fill="rgba(43, 77, 255, 0.08)" />
            {/* 折線 */}
            <path d={linePath} fill="none" stroke="#2b4dff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* 點 */}
            {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#2b4dff" strokeWidth="2" />
            ))}
            {/* X 軸標籤（只顯示首尾與中間） */}
            {pts.length > 1 && (
                <>
                    <text x={pts[0].x} y={h - 8} fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#8a8a8a" textAnchor="start" style={{ letterSpacing: '0.08em' }}>
                        {data[0].label}
                    </text>
                    <text x={pts[pts.length - 1].x} y={h - 8} fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#8a8a8a" textAnchor="end" style={{ letterSpacing: '0.08em' }}>
                        {data[data.length - 1].label}
                    </text>
                </>
            )}
        </svg>
    );
}

export function StatsDashboard({ isOpen, onClose, songs }: StatsDashboardProps) {
    const { allTags, songTagsMap } = useAllSongTags();
    const [daysBack, setDaysBack] = useState(7);
    const stats = useStatsData({ songs, songTagsMap, allTags, daysBack, topN: 5 });

    // 最大時段值
    const maxHourly = useMemo(
        () => Math.max(1, ...stats.hourlyDistribution.map(p => p.count)),
        [stats.hourlyDistribution]
    );
    const peakHour = useMemo(() => {
        if (stats.hourlyDistribution.length === 0) return null;
        return stats.hourlyDistribution.reduce((a, b) => (b.count > a.count ? b : a));
    }, [stats.hourlyDistribution]);

    // 取 18:00 - 25:00（隔日 01:00）這 8 個時段（演出時間）
    const peakHours = useMemo(() => {
        const wanted = [18, 19, 20, 21, 22, 23, 0, 1];
        return wanted.map(h => {
            const p = stats.hourlyDistribution.find(d => parseInt(d.label, 10) === h);
            return p ? { h, count: p.count } : { h, count: 0 };
        });
    }, [stats.hourlyDistribution]);
    const peakHoursMax = Math.max(1, ...peakHours.map(p => p.count));

    // Top 5 max votes
    const top5Max = Math.max(1, ...stats.topSongs.map(s => s.voteCount));

    // 取最熱風格（Top 5 標籤）
    const topGenres = useMemo(() => {
        return [...stats.tagBars].sort((a, b) => b.votes - a.votes).slice(0, 5);
    }, [stats.tagBars]);
    const genreMax = Math.max(1, ...topGenres.map(g => g.votes));

    const handleExportCsv = () => {
        const rows: (string | number)[][] = [
            ['===KPI==='],
            ['總票數', stats.totalVotes],
            ['投票者', stats.totalVoters],
            ['歌單數', stats.totalSongs],
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
            ['===風格分布==='],
            ['標籤', '歌曲數', '票數'],
            ...stats.tagBars.map(t => [t.name, t.songs, t.votes]),
        ];
        downloadCsv(`stats-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[88vh] p-0 overflow-hidden flex flex-col bg-white">
                <DialogTitle className="sr-only">統計儀表板 — 雜誌特輯</DialogTitle>
                <DialogDescription className="sr-only">
                    今晚累積 {stats.totalVotes} 票，{stats.totalVoters} 位投票者，{stats.totalSongs} 首歌單。
                </DialogDescription>

                <ScrollArea className="flex-1 editorial-stats">
                    {/* 特輯封面 */}
                    <div className="editorial-stats-cover">
                        <div className="editorial-stats-cover-eyebrow">
                            <span className="live-dot" aria-hidden="true" />
                            <span>SPECIAL FEATURE · 點播報告 · ISSUE №12</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportCsv}
                                aria-label="匯出 CSV"
                                className="ml-auto h-7 px-2.5 text-[11px] gap-1.5 rounded-full"
                            >
                                <Download className="w-3 h-3" />
                                CSV
                            </Button>
                        </div>
                        <h1 className="editorial-stats-cover-title">
                            一晚 <span className="accent">{stats.totalVotes.toLocaleString()}</span> 票<br />
                            <span style={{ fontSize: '0.7em' }}>
                                一個老師 <span className="accent">{stats.totalVoters || 0}</span> 個學生
                            </span>
                        </h1>
                        <p className="editorial-stats-cover-sub">
                            純客戶端聚合 — 所有資料即時計算，匯出 CSV 完整保留現場熱度。
                        </p>
                    </div>

                    {/* KPI 卡片 */}
                    <div className="editorial-kpi-grid">
                        <div className="editorial-kpi">
                            <div className="editorial-kpi-label">Total Votes</div>
                            <div className="editorial-kpi-value accent">{stats.totalVotes.toLocaleString()}</div>
                            <div className="editorial-kpi-sub">+{stats.todayVotes} TODAY</div>
                        </div>
                        <div className="editorial-kpi">
                            <div className="editorial-kpi-label">Active Voters</div>
                            <div className="editorial-kpi-value">{stats.totalVoters.toLocaleString()}</div>
                            <div className="editorial-kpi-sub">UNIQUE SESSIONS</div>
                        </div>
                        <div className="editorial-kpi">
                            <div className="editorial-kpi-label">Setlist</div>
                            <div className="editorial-kpi-value">{stats.totalSongs.toLocaleString()}</div>
                            <div className="editorial-kpi-sub">SONGS QUEUED</div>
                        </div>
                        <div className="editorial-kpi">
                            <div className="editorial-kpi-label">Peak Hour</div>
                            <div className="editorial-kpi-value">{peakHour ? `${peakHour.label}:00` : '—'}</div>
                            <div className="editorial-kpi-sub">
                                {peakHour ? `${peakHour.count} VOTES` : 'NO DATA'}
                            </div>
                        </div>
                    </div>

                    {/* Top 5 條圖 */}
                    <div className="editorial-stats-panel">
                        <div className="editorial-stats-panel-title">
                            <span className="chap">№ 01 / 熱門</span>
                            <h3>Top 5 · 今晚最被點的歌</h3>
                            <span className="h-meta">{stats.topSongs.length} TRACKS</span>
                        </div>
                        {stats.topSongs.length === 0 ? (
                            <div className="py-8 text-center text-sm text-slate-400 italic">
                                還沒有票數 — 等第一票進來
                            </div>
                        ) : (
                            stats.topSongs.slice(0, 5).map((s, i) => {
                                const pct = Math.max(4, Math.round((s.voteCount / top5Max) * 100));
                                return (
                                    <div key={s.song.id} className={`editorial-bar-row r${i + 1}`}>
                                        <span className="rank">{String(i + 1).padStart(2, '0')}</span>
                                        <div className="name">
                                            <div className="t">{s.song.title}</div>
                                            <div className="a">{s.song.artist}</div>
                                        </div>
                                        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                                        <div className="v">{s.voteCount}</div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* 時段柱狀 */}
                    <div className="editorial-stats-panel">
                        <div className="editorial-stats-panel-title">
                            <span className="chap">№ 02 / 時段</span>
                            <h3>晚場 8 小時人氣熱度</h3>
                            <span className="h-meta">18:00 — 01:00</span>
                        </div>
                        <div className="editorial-hour-bars" aria-label="晚場 8 小時熱度">
                            {peakHours.map((p) => {
                                const isPeak = peakHour && parseInt(peakHour.label, 10) === p.h && p.count > 0;
                                const ratio = p.count / peakHoursMax;
                                const heightPct = Math.max(2, Math.round(ratio * 100));
                                return (
                                    <div
                                        key={p.h}
                                        className={`editorial-hour-bar ${isPeak ? 'peak' : ''}`}
                                        style={{ height: `${heightPct}%` }}
                                        title={`${String(p.h).padStart(2, '0')}:00 · ${p.count} 票`}
                                    >
                                        {isPeak && <span className="peak-label">PEAK</span>}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="editorial-hour-labels">
                            {peakHours.map(p => (
                                <span key={p.h}>{String(p.h).padStart(2, '0')}</span>
                            ))}
                        </div>
                        {peakHour && (
                            <div className="mt-3 text-xs text-slate-500" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}>
                                · 全日最熱：{peakHour.label}:00 · {peakHour.count} 票
                            </div>
                        )}
                    </div>

                    {/* 7 天趨勢 */}
                    <div className="editorial-stats-panel">
                        <div className="editorial-stats-panel-title">
                            <span className="chap">№ 03 / 趨勢</span>
                            <h3>過去 {daysBack} 天的催歌曲線</h3>
                            <div className="ml-auto flex gap-1">
                                {[7, 14, 30].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setDaysBack(n)}
                                        className={`h-6 px-2 text-[10px] tracking-widest uppercase font-mono rounded-full transition-colors ${
                                            daysBack === n
                                                ? 'bg-[#2b4dff] text-white'
                                                : 'bg-transparent text-slate-500 border border-slate-300 hover:border-slate-500'
                                        }`}
                                    >
                                        {n}D
                                    </button>
                                ))}
                            </div>
                        </div>
                        <TrendLine data={stats.dailyTrend} />
                    </div>

                    {/* 風格分布 */}
                    <div className="editorial-stats-panel">
                        <div className="editorial-stats-panel-title">
                            <span className="chap">№ 04 / 風格</span>
                            <h3>觀眾耳朵偏好</h3>
                            <span className="h-meta">{topGenres.length} GENRES</span>
                        </div>
                        {topGenres.length === 0 ? (
                            <div className="py-6 text-center text-sm text-slate-400 italic">
                                還沒有標籤資料 — 編輯歌曲時可加標籤
                            </div>
                        ) : (
                            topGenres.map(g => {
                                const pct = Math.max(4, Math.round((g.votes / genreMax) * 100));
                                return (
                                    <div key={g.name} className="editorial-genre-row">
                                        <span className="label">{g.name}</span>
                                        <div className="bar"><i style={{ width: `${pct}%` }} /></div>
                                        <span className="v">{g.votes}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pull quote — 主理人 */}
                    <div className="editorial-pullquote">
                        <div className="editorial-pullquote-mark">“</div>
                        <div>
                            <p className="editorial-pullquote-text">
                                數字會說話 —— {stats.totalVotes >= 100
                                    ? `今晚衝到 ${stats.totalVotes} 票，全場真的有在用耳朵投票。`
                                    : '每一票都是一次催歌，現場互動會帶動下半場的氣氛。'}
                            </p>
                            <div className="editorial-pullquote-by">— 主持人</div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
