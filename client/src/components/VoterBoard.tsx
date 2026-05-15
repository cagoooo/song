// 催歌王內容 — editorial 雜誌風，給 tab + modal 共用
import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoterLeaderboard } from '@/hooks/useVoterLeaderboard';

interface VoterBoardProps {
    /** 顯示前 N 位 */
    topN?: number;
    /** 容器高度，預設 460px */
    height?: number | string;
}

export function VoterBoard({ topN = 20, height = 460 }: VoterBoardProps) {
    const { topVoters, totalVotes, totalVoters, yourRank, yourCount } = useVoterLeaderboard(topN);

    const youInTop = useMemo(
        () => topVoters.some((v) => v.isYou),
        [topVoters]
    );

    return (
        <div className="font-sans">
            {/* 摘要列 */}
            <div
                className="grid items-baseline mb-3 px-1 py-2"
                style={{
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 16,
                    borderBottom: '1px solid var(--ed-line)',
                }}
            >
                <div>
                    <div className="font-mono-eyebrow">Total Votes</div>
                    <div
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 900,
                            fontSize: 24,
                            letterSpacing: '-0.02em',
                            color: 'var(--ed-accent)',
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                            marginTop: 4,
                        }}
                    >
                        {totalVotes}
                    </div>
                </div>
                <div>
                    <div className="font-mono-eyebrow">Voters</div>
                    <div
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 900,
                            fontSize: 24,
                            letterSpacing: '-0.02em',
                            color: 'var(--ed-ink-1)',
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                            marginTop: 4,
                        }}
                    >
                        {totalVoters}
                    </div>
                </div>
                <div>
                    <div className="font-mono-eyebrow">Your Rank</div>
                    <div
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 900,
                            fontSize: 24,
                            letterSpacing: '-0.02em',
                            color: 'var(--ed-ink-1)',
                            fontVariantNumeric: 'tabular-nums',
                            lineHeight: 1,
                            marginTop: 4,
                        }}
                    >
                        {yourRank ? `#${yourRank}` : '—'}
                        {yourCount > 0 && (
                            <span
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 11,
                                    color: 'var(--ed-ink-3)',
                                    marginLeft: 6,
                                    letterSpacing: '0.08em',
                                }}
                            >
                                · {yourCount} 票
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {topVoters.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                    <div className="text-3xl mb-2 opacity-30">👑</div>
                    <p
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontStyle: 'italic',
                            fontSize: 16,
                            color: 'var(--ed-ink-2)',
                        }}
                    >
                        還沒有投票紀錄
                    </p>
                    <p className="text-xs mt-1 text-slate-400">第一票就是你的 🎸</p>
                </div>
            ) : (
                <ScrollArea style={{ height }} className="pr-2">
                    <ul className="divide-y divide-[rgba(17,17,17,0.08)]">
                        <AnimatePresence initial={false}>
                            {topVoters.map((voter, i) => (
                                <motion.li
                                    key={voter.sessionId}
                                    layout
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2, delay: i * 0.02 }}
                                    className="grid items-center"
                                    style={{
                                        gridTemplateColumns: '40px 36px 1fr auto',
                                        gap: 12,
                                        padding: '12px 8px',
                                        background: voter.isYou ? 'rgba(43,77,255,0.06)' : 'transparent',
                                    }}
                                >
                                    {/* 排名 */}
                                    <span
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                            fontStyle: 'italic',
                                            fontWeight: 800,
                                            fontSize: 22,
                                            color: i === 0 ? 'var(--ed-gold)' :
                                                   i === 1 ? 'var(--ed-silver)' :
                                                   i === 2 ? 'var(--ed-bronze)' :
                                                   'var(--ed-ink-3)',
                                            letterSpacing: '-0.04em',
                                            textAlign: 'center',
                                            fontVariantNumeric: 'tabular-nums',
                                            lineHeight: 1,
                                        }}
                                    >
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    {/* avatar */}
                                    <span
                                        style={{
                                            fontSize: 26,
                                            textAlign: 'center',
                                            lineHeight: 1,
                                        }}
                                    >
                                        {voter.avatar}
                                    </span>
                                    {/* 名稱 */}
                                    <div className="min-w-0">
                                        <div
                                            className="truncate"
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontWeight: 700,
                                                fontSize: 15,
                                                letterSpacing: '-0.01em',
                                                color: voter.isYou ? 'var(--ed-accent)' : 'var(--ed-ink-1)',
                                            }}
                                        >
                                            {voter.displayName}
                                            {voter.isYou && (
                                                <span
                                                    className="ml-2"
                                                    style={{
                                                        fontFamily: 'var(--font-mono)',
                                                        fontSize: 10,
                                                        letterSpacing: '0.18em',
                                                        textTransform: 'uppercase',
                                                        color: 'var(--ed-accent)',
                                                    }}
                                                >
                                                    YOU
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {/* 票數 */}
                                    <div className="text-right">
                                        <span
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontStyle: 'italic',
                                                fontWeight: 900,
                                                fontSize: 22,
                                                color: voter.isYou ? 'var(--ed-accent)' : 'var(--ed-ink-1)',
                                                letterSpacing: '-0.02em',
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {voter.count}
                                        </span>
                                        <span
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 10,
                                                color: 'var(--ed-ink-3)',
                                                letterSpacing: '0.14em',
                                                marginLeft: 4,
                                            }}
                                        >
                                            票
                                        </span>
                                    </div>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </ul>

                    {!youInTop && yourRank && (
                        <div
                            className="mt-3 pt-3"
                            style={{ borderTop: '1px dashed var(--ed-line-strong)' }}
                        >
                            <div
                                className="grid items-center"
                                style={{
                                    gridTemplateColumns: '40px 36px 1fr auto',
                                    gap: 12,
                                    padding: '12px 8px',
                                    background: 'rgba(43,77,255,0.08)',
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontStyle: 'italic',
                                        fontWeight: 800,
                                        fontSize: 22,
                                        color: 'var(--ed-accent)',
                                        textAlign: 'center',
                                        letterSpacing: '-0.04em',
                                    }}
                                >
                                    {yourRank}
                                </span>
                                <span style={{ fontSize: 26, textAlign: 'center', lineHeight: 1 }}>⭐</span>
                                <div className="min-w-0">
                                    <div
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                            fontWeight: 700,
                                            fontSize: 15,
                                            color: 'var(--ed-accent)',
                                        }}
                                    >
                                        你（本機）
                                        <span
                                            className="ml-2"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 10,
                                                letterSpacing: '0.18em',
                                                textTransform: 'uppercase',
                                                color: 'var(--ed-accent)',
                                            }}
                                        >
                                            YOU
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                            fontStyle: 'italic',
                                            fontWeight: 900,
                                            fontSize: 22,
                                            color: 'var(--ed-accent)',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {yourCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </ScrollArea>
            )}
        </div>
    );
}
