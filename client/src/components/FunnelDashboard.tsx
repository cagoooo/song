import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RotateCcw, RefreshCw, Trash2, Globe } from 'lucide-react';
import { getFunnelSummary, resetFunnel } from '@/lib/funnelAnalytics';
import { getFunnelServerSummary, type FunnelServerSummary } from '@/lib/firestore/funnelEvents';

interface FunnelDashboardProps {
    isOpen: boolean;
    onClose: () => void;
}

type Summary = ReturnType<typeof getFunnelSummary>;

const EVENT_LABELS: Record<string, string> = {
    suggestion_form_open: '開啟表單',
    suggestion_typing_start: '開始打字',
    suggestion_submit_success: '送出成功',
    suggestion_close_without_submit: '打字後放棄',
    suggestion_draft_restored: '回填草稿',
    duplicate_hint_shown: '重複提示出現',
    duplicate_hint_click: '點重複提示前往',
    composing_focus_session: '專注輸入',
    missed_replay_shown: '補播錯過高潮',
};

function fmtTime(ms: number): string {
    if (!ms) return '—';
    return new Date(ms).toLocaleString('zh-TW', { hour12: false });
}

/** 漏斗單階：標籤 + 數量 + 佔開啟數的比例條 */
function FunnelStep({ label, count, pct, tone = 'accent' }: { label: string; count: number; pct: number; tone?: 'accent' | 'amber' | 'slate' }) {
    const bar = tone === 'amber' ? 'bg-amber-400' : tone === 'slate' ? 'bg-slate-400' : 'bg-[#2b4dff]';
    return (
        <div>
            <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-slate-700">{label}</span>
                <span className="font-mono text-slate-500">
                    <b className="text-slate-900">{count}</b>
                    <span className="ml-2 text-xs">{pct}%</span>
                </span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${bar} transition-all duration-300`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
            </div>
        </div>
    );
}

export function FunnelDashboard({ isOpen, onClose }: FunnelDashboardProps) {
    const [summary, setSummary] = useState<Summary | null>(null);
    // 全場（跨裝置）彙整：admin 開啟時讀 Firestore 一次
    const [server, setServer] = useState<FunnelServerSummary | null>(null);
    const [serverError, setServerError] = useState(false);

    const refresh = useCallback(() => {
        setSummary(getFunnelSummary());
        setServerError(false);
        getFunnelServerSummary()
            .then(setServer)
            .catch(() => setServerError(true));
    }, []);

    useEffect(() => {
        if (isOpen) refresh();
    }, [isOpen, refresh]);

    const handleReset = useCallback(() => {
        if (!window.confirm('確定清除本機累積的漏斗數據？此動作無法復原。')) return;
        resetFunnel();
        refresh();
    }, [refresh]);

    const f = summary?.funnel;
    const opens = f?.開啟表單 ?? 0;
    const typed = f?.開始打字 ?? 0;
    const submits = f?.送出成功 ?? 0;
    const abandons = summary?.counts?.suggestion_close_without_submit ?? 0;
    const pctOf = (n: number) => (opens > 0 ? Math.round((n / opens) * 100) : 0);

    return (
        <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-lg gap-0 bg-[#faf7f0] p-0">
                <div className="flex items-start justify-between px-6 pt-6">
                    <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ed-ink-3)' }}>
                            Reader's Pick · Funnel
                        </div>
                        <DialogTitle style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 26, color: 'var(--ed-ink-1)' }}>
                            點歌建議漏斗
                        </DialogTitle>
                        <DialogDescription className="mt-1 text-xs text-slate-500">
                            本機累積數據（單一裝置），用來檢視表單轉換與優化成效。
                        </DialogDescription>
                    </div>
                    <button type="button" onClick={refresh} aria-label="重新整理數據" className="mt-1 inline-flex items-center gap-1 rounded-md border border-[rgba(17,17,17,0.18)] bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:border-[#2b4dff] hover:text-[#2b4dff]">
                        <RefreshCw className="h-3.5 w-3.5" />
                        刷新
                    </button>
                </div>

                <ScrollArea className="max-h-[70vh] px-6 pb-6 pt-4">
                    {opens === 0 ? (
                        <div className="py-12 text-center text-sm italic text-slate-400">
                            還沒有累積資料。打開「建議新歌」表單操作幾次後再回來看。
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* 主漏斗 */}
                            <div className="space-y-4 rounded-xl border border-[rgba(17,17,17,0.12)] bg-white p-4">
                                <FunnelStep label="開啟表單" count={opens} pct={100} />
                                <FunnelStep label="開始打字" count={typed} pct={pctOf(typed)} />
                                <FunnelStep label="送出成功" count={submits} pct={pctOf(submits)} />
                                <FunnelStep label="打字後放棄" count={abandons} pct={pctOf(abandons)} tone="amber" />
                            </div>

                            {/* 關鍵轉換率 */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { k: '打字轉換率', v: f?.打字轉換率 ?? 0, hint: '開啟→打字' },
                                    { k: '送出轉換率', v: f?.送出轉換率 ?? 0, hint: '開啟→送出' },
                                    { k: '打字後放棄率', v: f?.打字後放棄率 ?? 0, hint: '打了卻關掉' },
                                ].map((m) => (
                                    <div key={m.k} className="rounded-lg border border-[rgba(17,17,17,0.12)] bg-white p-3 text-center">
                                        <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 24, color: '#2b4dff' }}>
                                            {m.v}%
                                        </div>
                                        <div className="mt-0.5 text-[11px] font-semibold text-slate-600">{m.k}</div>
                                        <div className="text-[10px] text-slate-400">{m.hint}</div>
                                    </div>
                                ))}
                            </div>

                            {/* 重複偵測 */}
                            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                                <span className="text-amber-800">重複提示出現 <b>{summary?.重複提示.顯示 ?? 0}</b> 次</span>
                                <span className="text-amber-700">點「前往點播」 <b>{summary?.重複提示.點擊前往點播 ?? 0}</b> 次</span>
                            </div>

                            {/* 全場（跨裝置）彙整 */}
                            <div className="rounded-lg border border-[#2b4dff]/20 bg-[#2b4dff]/[0.04] px-4 py-3">
                                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#2b4dff]">
                                    <Globe className="h-3.5 w-3.5" />
                                    全場（跨裝置）
                                </div>
                                {serverError ? (
                                    <p className="text-xs text-slate-400">讀取失敗（需管理員權限 / 網路）。</p>
                                ) : server ? (
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        {[
                                            { k: '觸及人數', v: server.sessions },
                                            { k: '開啟', v: server.opens },
                                            { k: '打字', v: server.typed },
                                            { k: '送出', v: server.submits },
                                        ].map((m) => (
                                            <div key={m.k}>
                                                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 22, color: 'var(--ed-ink-1)' }}>
                                                    {m.v}
                                                </div>
                                                <div className="text-[10px] text-slate-500">{m.k}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400">讀取中…</p>
                                )}
                                <p className="mt-2 text-[10px] text-slate-400">
                                    僅核心 3 事件、所有裝置合計；本機區塊則只含此裝置。
                                </p>
                            </div>

                            {/* 近期事件 */}
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ed-ink-3)' }}>
                                        近期事件
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                        起 {fmtTime(summary?.firstAt ?? 0)}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    {(summary?.recent ?? []).slice(0, 12).map((r, i) => (
                                        <div key={i} className="flex items-center justify-between rounded-md bg-white px-3 py-1.5 text-xs">
                                            <span className="text-slate-700">{EVENT_LABELS[r.e] ?? r.e}</span>
                                            <span className="font-mono text-slate-400">{fmtTime(r.t)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 動作 */}
                            <div className="flex items-center justify-between gap-2 border-t border-[rgba(17,17,17,0.08)] pt-3">
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                    <RotateCcw className="h-3 w-3" />
                                    更新 {fmtTime(summary?.lastAt ?? 0)}
                                </span>
                                <Button variant="outline" size="sm" onClick={handleReset} className="border-red-200 text-red-500 hover:bg-red-50">
                                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                    清除本機數據
                                </Button>
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

export default FunnelDashboard;
