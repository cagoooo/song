// 「現場回顧」浮動 pill + 時間軸面板
//
// 把錯過的現場高潮（黑馬 / 全站熱度）做成可點開的時間軸，讓打完字的人快速補看。
// 只在有亮點時出現；有未讀時 pill 脈動 + 顯示數字。開啟即標記已讀。
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Clapperboard, Trophy, Flame, EyeOff } from 'lucide-react';
import { useLiveRecap, markAllSeen, type RecapItem } from '@/lib/liveRecap';

function timeAgo(ts: number, now: number): string {
    const s = Math.max(0, Math.floor((now - ts) / 1000));
    if (s < 60) return '剛剛';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} 分鐘前`;
    return `${Math.floor(m / 60)} 小時前`;
}

function RecapRow({ item, now }: { item: RecapItem; now: number }) {
    const Icon = item.kind === 'darkhorse' ? Trophy : Flame;
    return (
        <li className="flex items-start gap-2.5 py-2 border-b border-[rgba(17,17,17,0.06)] last:border-0">
            <div className={`mt-0.5 w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${item.kind === 'darkhorse' ? 'bg-[#2b4dff]/10 text-[#2b4dff]' : 'bg-orange-100 text-orange-500'}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--ed-ink-1)' }}>
                        {item.title}
                    </span>
                    {item.missed && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold">
                            <EyeOff className="w-2.5 h-2.5" />打字時錯過
                        </span>
                    )}
                </div>
                <p className="truncate text-xs text-slate-500">{item.detail}</p>
            </div>
            <span className="shrink-0 text-[10px] text-slate-400" style={{ fontFamily: 'var(--font-mono)' }}>
                {timeAgo(item.ts, now)}
            </span>
        </li>
    );
}

export function LiveRecap() {
    const { items, unseen } = useLiveRecap();
    const [open, setOpen] = useState(false);

    if (items.length === 0) return null;

    const now = Date.now();
    const missedCount = items.filter((i) => i.missed).length;

    const onOpenChange = (next: boolean) => {
        setOpen(next);
        if (next) markAllSeen();
    };

    return (
        <div className="fixed left-3 bottom-24 sm:left-4 sm:bottom-28 z-40">
            <Popover open={open} onOpenChange={onOpenChange}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        aria-label="現場回顧"
                        className={`relative inline-flex items-center gap-1.5 rounded-full border border-[rgba(17,17,17,0.14)] bg-white/95 backdrop-blur px-3 py-2 shadow-lg hover:shadow-xl transition-all
                            ${unseen > 0 ? 'animate-pulse ring-2 ring-[#2b4dff]/30' : ''}`}
                    >
                        <Clapperboard className="w-4 h-4 text-[#2b4dff]" />
                        <span className="text-xs font-semibold text-slate-700">現場回顧</span>
                        {unseen > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#2b4dff] text-white text-[10px] font-bold flex items-center justify-center">
                                {unseen > 9 ? '9+' : unseen}
                            </span>
                        )}
                    </button>
                </PopoverTrigger>
                <PopoverContent align="start" side="top" className="w-80 max-w-[calc(100vw-1.5rem)] bg-[#faf7f0] border-[rgba(17,17,17,0.16)] p-0">
                    <div className="px-4 pt-3 pb-2 border-b border-[rgba(17,17,17,0.1)]">
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ed-ink-3)' }}>
                            Live Recap
                        </div>
                        <div className="flex items-center gap-2">
                            <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 800, fontSize: 18, color: 'var(--ed-ink-1)' }}>
                                剛剛現場
                            </span>
                            {missedCount > 0 && (
                                <span className="text-[11px] text-amber-600">你打字時錯過 {missedCount} 個</span>
                            )}
                        </div>
                    </div>
                    <ul className="px-4 py-1 max-h-[300px] overflow-y-auto
                        [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(17,17,17,0.2)]">
                        {items.map((item) => (
                            <RecapRow key={item.id} item={item} now={now} />
                        ))}
                    </ul>
                </PopoverContent>
            </Popover>
        </div>
    );
}
