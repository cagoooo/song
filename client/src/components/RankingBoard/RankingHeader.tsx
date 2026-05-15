// 排行榜頂部標題裝飾區 — Editorial 雜誌風
interface RankingHeaderProps {
    reduceMotion: boolean;
}

export function RankingHeader(_: RankingHeaderProps) {
    return (
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <div className="flex items-baseline gap-3 flex-wrap">
                <span className="eyebrow">Top Charts</span>
                <span
                    className="text-slate-900"
                    style={{
                        fontFamily: 'var(--font-display)',
                        fontStyle: 'italic',
                        fontWeight: 800,
                        fontSize: 22,
                        letterSpacing: '-0.015em',
                        lineHeight: 1,
                    }}
                >
                    熱門歌曲排行
                </span>
                <span className="font-mono-eyebrow" style={{ fontSize: 10 }}>
                    LIVE · 即時更新
                </span>
            </div>
        </div>
    );
}
