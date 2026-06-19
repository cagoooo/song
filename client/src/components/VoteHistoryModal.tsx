import { useMemo } from 'react';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ResponsiveScrollList } from '@/components/ui/ResponsiveScrollList';
import { Music, Trash2, X } from 'lucide-react';
import type { VoteHistoryEntry } from '@/hooks/useVoteHistory';

interface VoteHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: VoteHistoryEntry[];
    todayCount: number;
    todayUniqueCount: number;
    onClearHistory: () => void;
    /** 點「再次點播」要做的事，由父層注入（通常是觸發搜尋並切到歌單 Tab） */
    onReVote: (entry: VoteHistoryEntry) => void;
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

export function VoteHistoryModal({
    isOpen, onClose, history, todayCount, todayUniqueCount,
    onClearHistory, onReVote,
}: VoteHistoryModalProps) {
    // 倒序排列（最新在上）
    const sortedHistory = useMemo(() => {
        return [...history].sort((a, b) => b.timestamp - a.timestamp);
    }, [history]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="vh-modal max-w-2xl p-0 overflow-hidden bg-[#faf7f0] border-[rgba(17,17,17,0.18)]">
                <button
                    type="button"
                    className="vh-close"
                    onClick={onClose}
                    aria-label="關閉點播日記"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                    <span>關閉</span>
                </button>
                {/* a11y: 給螢幕閱讀器看的標題與描述 — 視覺上由下方雜誌頂條 + 自訂 h2 呈現 */}
                <DialogTitle className="sr-only">點播日記 — 今晚你點過什麼歌</DialogTitle>
                <DialogDescription className="sr-only">
                    今晚累積 {todayCount} 票、{todayUniqueCount} 首不同歌曲；共 {history.length} 筆紀錄。
                </DialogDescription>

                {/* 雜誌風頂條 — Nº 12 · POINT-OF-RECORD · SIDE A */}
                <div className="editorial-modal-flag">
                    <span>Nº 12</span>
                    <span className="center">Point-of-Record</span>
                    <span className="text-right">Side A</span>
                </div>

                {/* 章節眉標 + 義式標題 */}
                <div className="vh-intro px-6 sm:px-8 pt-6 pb-4">
                    <div
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 11,
                            letterSpacing: '0.24em',
                            textTransform: 'uppercase',
                            color: 'var(--ed-ink-3)',
                            marginBottom: 6,
                        }}
                    >
                        Chapter · 點播日記
                    </div>
                    <h2
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontStyle: 'italic',
                            fontWeight: 900,
                            fontSize: 28,
                            letterSpacing: '-0.02em',
                            color: 'var(--ed-ink-1)',
                            margin: 0,
                            lineHeight: 1.15,
                        }}
                    >
                        今晚<span style={{ color: 'var(--ed-accent)' }}>你</span>點過什麼歌
                    </h2>
                    <p
                        className="mt-2"
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontStyle: 'italic',
                            fontWeight: 500,
                            fontSize: 14,
                            color: 'var(--ed-ink-2)',
                            lineHeight: 1.5,
                        }}
                    >
                        按下「我要點」就是把一票寫進今晚的歌單。<br />
                        下面是你所有點播紀錄，照時間倒序排列，最近的在最上面。
                    </p>
                </div>

                {history.length === 0 ? (
                    <div className="py-12 px-8 text-center text-slate-500">
                        <Music className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16 }}>
                            還沒有點播紀錄
                        </p>
                        <p className="text-xs mt-1">趕快去點一首歌吧 🎸</p>
                    </div>
                ) : (
                    <>
                        {/* 表格抬頭 */}
                        <div
                            className="vh-history-head grid items-center px-6 sm:px-8 py-2 border-y border-[rgba(17,17,17,0.12)]"
                            style={{
                                gridTemplateColumns: '36px 1fr 90px 72px 70px',
                                gap: 14,
                                fontFamily: 'var(--font-mono)',
                                fontSize: 10,
                                letterSpacing: '0.22em',
                                textTransform: 'uppercase',
                                color: 'var(--ed-ink-3)',
                            }}
                        >
                            <span>#</span>
                            <span>歌名</span>
                            <span>歌手</span>
                            <span>時間</span>
                            <span aria-hidden="true" />
                        </div>

                        <ResponsiveScrollList cap="always" maxHeightClass="max-h-[420px]">
                            <ul className="divide-y divide-[rgba(17,17,17,0.08)]">
                                {sortedHistory.map((entry, i) => (
                                    <li
                                        key={`${entry.songId}_${entry.timestamp}`}
                                        className="vh-history-row grid items-center px-6 sm:px-8 py-3"
                                        style={{
                                            gridTemplateColumns: '36px 1fr 90px 72px 70px',
                                            gap: 14,
                                        }}
                                    >
                                        <span
                                            className="vh-history-no"
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontStyle: 'italic',
                                                fontWeight: 700,
                                                fontSize: 16,
                                                color: 'var(--ed-ink-3)',
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {String(sortedHistory.length - i).padStart(2, '0')}
                                        </span>
                                        <span
                                            className="vh-history-title truncate"
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontWeight: 700,
                                                fontSize: 15,
                                                letterSpacing: '-0.01em',
                                                color: 'var(--ed-ink-1)',
                                            }}
                                        >
                                            {entry.title}
                                        </span>
                                        <span
                                            className="vh-history-artist truncate"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 10,
                                                letterSpacing: '0.14em',
                                                textTransform: 'uppercase',
                                                color: 'var(--ed-ink-3)',
                                            }}
                                        >
                                            {entry.artist}
                                        </span>
                                        <span
                                            className="vh-history-time"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 12,
                                                color: 'var(--ed-ink-2)',
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {formatTime(entry.timestamp)}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onReVote(entry)}
                                            aria-label={`再點一次 ${entry.title}`}
                                            className="vh-history-action h-7 px-2 text-xs hover:bg-[rgba(43,77,255,0.08)] hover:text-[#2b4dff]"
                                        >
                                            再點一次
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </ResponsiveScrollList>

                        {/* 底部摘要 + 清除按鈕 */}
                        <div
                            className="vh-history-footer flex items-center justify-between px-6 sm:px-8 py-3 border-t border-[rgba(17,17,17,0.12)]"
                        >
                            <span
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 11,
                                    letterSpacing: '0.18em',
                                    textTransform: 'uppercase',
                                    color: 'var(--ed-ink-3)',
                                }}
                            >
                                共 {history.length} 筆 · 今晚累積 {todayCount} 票 · {todayUniqueCount} 首
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (window.confirm('確定要清除所有點播紀錄嗎？此操作無法復原。')) {
                                        onClearHistory();
                                    }
                                }}
                                className="h-7 px-3 text-xs rounded-full border-[rgba(17,17,17,0.18)] hover:bg-white"
                            >
                                <Trash2 className="w-3 h-3 mr-1" />
                                清除歷史
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
