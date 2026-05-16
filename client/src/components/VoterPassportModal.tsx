// 催歌履歷 · Voter Passport modal
// 對應原型：Downloads/voter-badges.html
// 護照式封面（portrait + VERIFIED VOTER 圓章）+ 3 格統計 + 已解鎖/未解鎖徽章柵格
import { useMemo } from 'react';
import {
    Dialog, DialogContent, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import type { VoteHistoryEntry } from '@/hooks/useVoteHistory';

interface VoterPassportModalProps {
    isOpen: boolean;
    onClose: () => void;
    history: VoteHistoryEntry[];
    /** 開啟分享卡 — 由父層注入 */
    onShare?: () => void;
}

interface BadgeSpec {
    key: string;
    glyph: string;
    name: string;          // 中文卡名
    titleStamp: string;    // 弧形 textPath 上的字
    unlocked: boolean;
    unlockedAt?: number;   // ms timestamp 用來顯示日期
    /** 解鎖條件描述 — 卡片背面 / locked 進度 */
    condition: string;
    /** 當前進度與目標 (用於 locked 進度條) */
    progress?: { now: number; target: number };
}

function formatDateYMD(ts: number): string {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
}

function dayKey(ts: number): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function VoterPassportModal({ isOpen, onClose, history, onShare }: VoterPassportModalProps) {
    const { totalVotes, uniqueSongs, showsAttended, badges, firstVoteAt, lastVoteAt, voterId } = useMemo(() => {
        const totalVotes = history.length;
        const uniqueSongs = new Set(history.map((v) => v.songId)).size;
        const dayMap = new Map<string, { count: number; unique: Set<string>; ts: number }>();
        for (const v of history) {
            const k = dayKey(v.timestamp);
            const entry = dayMap.get(k);
            if (entry) {
                entry.count += 1;
                entry.unique.add(v.songId);
            } else {
                dayMap.set(k, { count: 1, unique: new Set([v.songId]), ts: v.timestamp });
            }
        }
        const dayStats = Array.from(dayMap.values());
        const showsAttended = dayStats.length;
        const maxDayCount = dayStats.reduce((m, d) => Math.max(m, d.count), 0);
        const maxDayUnique = dayStats.reduce((m, d) => Math.max(m, d.unique.size), 0);

        const firstUnlock = (cond: boolean, byTs?: number) => (cond && byTs ? byTs : undefined);

        // 找出滿足條件那一天的最早 timestamp，用來標解鎖日
        const firstDayHit = (predicate: (d: { count: number; unique: Set<string> }) => boolean): number | undefined => {
            const hits = dayStats.filter(predicate).sort((a, b) => a.ts - b.ts);
            return hits[0]?.ts;
        };

        const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
        const firstVoteAt = sortedHistory[0]?.timestamp;
        const lastVoteAt = sortedHistory[sortedHistory.length - 1]?.timestamp;

        // 假 voter ID — 用 firstVoteAt 後 4 碼，沒投過則用 ----
        const voterId = firstVoteAt ? String(firstVoteAt).slice(-4) : '----';

        const badges: BadgeSpec[] = [
            {
                key: 'vote-storm',
                glyph: '🔥',
                name: '灌票王',
                titleStamp: 'VOTE STORM · 灌票王 · ',
                unlocked: maxDayCount >= 50,
                unlockedAt: firstUnlock(maxDayCount >= 50, firstDayHit((d) => d.count >= 50)),
                condition: `單場累積投票超過 50 票。你最高一場投了 ${maxDayCount} 票。`,
                progress: maxDayCount < 50 ? { now: maxDayCount, target: 50 } : undefined,
            },
            {
                key: 'full-deck',
                glyph: '🎸',
                name: '點滿一場',
                titleStamp: 'FULL DECK · 點滿五首 · ',
                unlocked: maxDayUnique >= 5,
                unlockedAt: firstUnlock(maxDayUnique >= 5, firstDayHit((d) => d.unique.size >= 5)),
                condition: `同一場投出 5 首不同的歌。你最多一場投到 ${maxDayUnique}/5。`,
                progress: maxDayUnique < 5 ? { now: maxDayUnique, target: 5 } : undefined,
            },
            {
                key: 'first-call',
                glyph: '🌟',
                name: '首發點播',
                titleStamp: 'FIRST CALL · 首發點播 · ',
                unlocked: totalVotes >= 1,
                unlockedAt: firstUnlock(totalVotes >= 1, firstVoteAt),
                condition: `投出你的第一票，加入催歌行列。${totalVotes >= 1 ? '已達成。' : ''}`,
            },
            {
                key: 'five-star',
                glyph: '⭐',
                name: '評星達人',
                titleStamp: 'FIVE-STAR · 評星達人 · ',
                unlocked: uniqueSongs >= 10,
                unlockedAt: firstUnlock(uniqueSongs >= 10, lastVoteAt),
                condition: `累積點過 10 首不同的歌。你目前點了 ${uniqueSongs} 首。`,
                progress: uniqueSongs < 10 ? { now: uniqueSongs, target: 10 } : undefined,
            },
            {
                key: 'three-shows',
                glyph: '📻',
                name: '連續 3 場',
                titleStamp: 'TRIPLE BILL · 連續到場 · ',
                unlocked: showsAttended >= 3,
                unlockedAt: firstUnlock(showsAttended >= 3, lastVoteAt),
                condition: `連續到場 3 個不同夜晚，每場至少投一票。`,
                progress: showsAttended < 3 ? { now: showsAttended, target: 3 } : undefined,
            },
            {
                key: 'final-encore',
                glyph: '🎬',
                name: '看完一場',
                titleStamp: 'FINAL ENCORE · 看完一場 · ',
                unlocked: maxDayCount >= 16,
                unlockedAt: firstUnlock(maxDayCount >= 16, firstDayHit((d) => d.count >= 16)),
                condition: `單場累積點 16 首歌（看完整場 Side A 的厚度）。`,
                progress: maxDayCount < 16 ? { now: maxDayCount, target: 16 } : undefined,
            },
        ];

        return { totalVotes, uniqueSongs, showsAttended, badges, firstVoteAt, lastVoteAt, voterId };
    }, [history]);

    const unlockedCount = badges.filter((b) => b.unlocked).length;
    const lockedCount = badges.length - unlockedCount;
    const unlockedBadges = badges.filter((b) => b.unlocked);
    const lockedBadges = badges.filter((b) => !b.unlocked);

    const startDateLabel = firstVoteAt ? formatDateYMD(firstVoteAt) : '今晚開始';
    const startMonthLabel = firstVoteAt ? formatDateYMD(firstVoteAt).slice(0, 7) : '—';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="max-w-5xl w-[95vw] p-0 overflow-hidden bg-[var(--vb-cream,#faf7f0)] border-[rgba(17,17,17,0.18)]"
                style={{ maxHeight: '92vh', overflowY: 'auto' }}
            >
                <DialogTitle className="sr-only">催歌履歷 · Voter Passport</DialogTitle>
                <DialogDescription className="sr-only">
                    累積 {totalVotes} 票、{uniqueSongs} 首不同歌曲、{showsAttended} 場到場；已解鎖 {unlockedCount}/{badges.length} 個徽章。
                </DialogDescription>

                <div className="vb-modal">
                    {/* 雜誌頂條 */}
                    <div className="vb-flag">
                        <span>Nº 12 · VOTER PASSPORT</span>
                        <span className="vb-flag-c">阿凱彈唱之夜</span>
                        <span className="vb-flag-r">{startDateLabel}</span>
                    </div>

                    <div className="vb-wrap">
                        {/* 護照式封面 */}
                        <section className="vb-cover">
                            <span className="vb-cover-tl">Voter Passport</span>
                            <span className="vb-cover-tr">Nº 12 · Side A</span>
                            <span className="vb-cover-bl">桃園 SMES · 阿凱彈唱之夜</span>
                            <span className="vb-cover-br">issued {startMonthLabel}</span>

                            <div className="vb-cover-stamp" aria-hidden="true">
                                VERIFIED<br />VOTER
                                <small>SIDE A · 33⅓</small>
                            </div>

                            <div className="vb-cover-head">
                                <div>
                                    <h1 className="vb-cover-h">我的<br /><em>催歌履歷</em></h1>
                                    <div className="vb-cover-sub">
                                        VOTER PASSPORT · 自 <b>{startMonthLabel}</b> 起 · ID <b>#{voterId} · @Guest</b>
                                    </div>
                                </div>
                                <div className="vb-portrait" aria-hidden="true">
                                    <div className="vb-portrait-init">{'@Guest'.charAt(1).toUpperCase()}</div>
                                    <div className="vb-portrait-cap">Guest · Active Voter</div>
                                </div>
                            </div>

                            <div className="vb-stats">
                                <div className="vb-stat">
                                    <div className="vb-stat-n">{totalVotes}</div>
                                    <div className="vb-stat-l">Total Votes</div>
                                    <span className="vb-stat-sub">累積總點播</span>
                                </div>
                                <div className="vb-stat">
                                    <div className="vb-stat-n">{uniqueSongs}</div>
                                    <div className="vb-stat-l">Unique Songs</div>
                                    <span className="vb-stat-sub">不同歌曲數</span>
                                </div>
                                <div className="vb-stat">
                                    <div className="vb-stat-n">{showsAttended}</div>
                                    <div className="vb-stat-l">Shows Attended</div>
                                    <span className="vb-stat-sub">連續到場場次</span>
                                </div>
                            </div>
                        </section>

                        {/* SECTION 1 · 已解鎖 */}
                        {unlockedBadges.length > 0 && (
                            <>
                                <header className="vb-sec">
                                    <div>
                                        <div className="vb-sec-eyebrow">§ 01 · Collected</div>
                                        <h2 className="vb-sec-h">已蓋上的章</h2>
                                    </div>
                                    <div className="vb-sec-line" />
                                    <div className="vb-sec-cnt"><b>{unlockedCount}</b> / {badges.length} · 已解鎖</div>
                                </header>
                                <div className="vb-grid">
                                    {unlockedBadges.map((b, i) => (
                                        <BadgeCell key={b.key} badge={b} index={i} />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* SECTION 2 · 未解鎖 */}
                        {lockedBadges.length > 0 && (
                            <>
                                <header className="vb-sec">
                                    <div>
                                        <div className="vb-sec-eyebrow">§ 02 · Locked</div>
                                        <h2 className="vb-sec-h">還沒蓋上的章</h2>
                                    </div>
                                    <div className="vb-sec-line" />
                                    <div className="vb-sec-cnt"><b>{lockedCount}</b> / {badges.length} · 待解鎖</div>
                                </header>
                                <div className="vb-grid">
                                    {lockedBadges.map((b, i) => (
                                        <BadgeCell key={b.key} badge={b} index={unlockedBadges.length + i} />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* 底部 CTA — 分享 */}
                        <section className="vb-foot">
                            <div>
                                <h3 className="vb-foot-h">把這本護照<em>翻給朋友看</em></h3>
                                <p className="vb-foot-p">
                                    產生 IG 直式履歷卡 — 蓋了 {unlockedCount} 個章、聽過 {uniqueSongs} 首歌、{showsAttended} 場到場。
                                </p>
                            </div>
                            {onShare && (
                                <button type="button" className="vb-share" onClick={onShare}>
                                    分享我的催歌履歷
                                    <span className="arr">→</span>
                                </button>
                            )}
                        </section>
                    </div>
                </div>

                {/* feTurbulence 油墨破損濾鏡 — 蓋章質感 */}
                <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
                    <defs>
                        <filter id="vbStampGrain">
                            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
                            <feColorMatrix values="0 0 0 0 0
                                                   0 0 0 0 0
                                                   0 0 0 0 0
                                                   0 0 0 -1.2 1.1" />
                            <feComposite in2="SourceGraphic" operator="in" />
                        </filter>
                    </defs>
                </svg>
            </DialogContent>
        </Dialog>
    );
}

function BadgeCell({ badge, index }: { badge: BadgeSpec; index: number }) {
    const pathId = `vb-arc-${badge.key}`;
    const progressPct = badge.progress
        ? Math.min(100, Math.round((badge.progress.now / badge.progress.target) * 100))
        : 0;

    return (
        <div className={`vb-cell ${badge.unlocked ? '' : 'locked'}`} data-stamp-rotate={(index % 6) + 1}>
            <div className="vb-cell-inner">
                <div className="vb-cell-front">
                    <div className="vb-stamp">
                        <svg viewBox="0 0 110 110" aria-hidden="true">
                            <circle cx="55" cy="55" r="50" fill="none" stroke="currentColor" strokeWidth="3" />
                            <circle cx="55" cy="55" r="44" fill="none" stroke="currentColor" strokeWidth="1.2" />
                            <defs>
                                <path id={pathId} d="M 55 12 A 43 43 0 0 1 55 98" fill="none" />
                            </defs>
                            {badge.unlocked && (
                                <text
                                    fontFamily="JetBrains Mono, monospace"
                                    fontSize="8"
                                    letterSpacing="3"
                                    fill="currentColor"
                                    fontWeight="700"
                                >
                                    <textPath href={`#${pathId}`} startOffset="0%">
                                        {badge.titleStamp}
                                    </textPath>
                                </text>
                            )}
                        </svg>
                        <div className="vb-glyph">{badge.glyph}</div>
                    </div>
                    <div className="vb-cell-info">
                        <div className="vb-meta-name">{badge.name}</div>
                        <div className="vb-meta-date">
                            {badge.unlocked && badge.unlockedAt
                                ? `UNLOCK ${formatDateYMD(badge.unlockedAt)}`
                                : badge.progress
                                ? 'LOCKED · IN PROGRESS'
                                : 'LOCKED'}
                        </div>
                        {!badge.unlocked && badge.progress && (
                            <div className="vb-prog">
                                <div className="vb-prog-bar">
                                    <div className="vb-prog-fill" style={{ width: `${progressPct}%` }} />
                                </div>
                                <div className="vb-prog-lab">
                                    PROGRESS <b>{badge.progress.now} / {badge.progress.target}</b>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {badge.unlocked && (
                    <div className="vb-cell-back">
                        <div className="vb-back-eyebrow">UNLOCK CONDITION</div>
                        <div className="vb-back-cond">{badge.condition}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default VoterPassportModal;
