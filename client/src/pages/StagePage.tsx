// 演出模式（投影 / 大螢幕） — Editorial 雜誌風
//   入口：在原網址後加 ?mode=stage（例：https://cagoooo.github.io/song/?mode=stage）
//   特色：全黑底 + Editorial 排版 + NOW PLAYING 大字 + UP NEXT 名次榜 + QR 投票 + 底部 ticker
import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { subscribeSongs, type Song } from '@/lib/firestore';
import { loadStageSongsCache, saveStageSongsCache } from '@/lib/stageCache';
import { useNowPlaying } from '@/hooks/useNowPlaying';
import { useDarkHorse } from '@/hooks/useDarkHorse';
import { DarkHorseOverlay } from '@/components/DarkHorseOverlay';
import { useGlobalHype } from '@/hooks/useGlobalHype';
import { GlobalHypeOverlay } from '@/components/GlobalHypeOverlay';
import { useMagazine } from '@/hooks/useMagazine';

const TOP_N = 5;
// 固定的場邊跑馬燈文案（期數 / 標題相關的動態項在元件內組合）
const TICKER_BASE = [
    '桃園 SMES · 石門國小',
    '歡迎合唱',
    '投票即催歌',
    '掃 QR 點下一首',
];

function useFullscreen() {
    const [isFullscreen, setIsFullscreen] = useState(
        typeof document !== 'undefined' && !!document.fullscreenElement
    );

    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const toggle = useCallback(async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
        } catch {
            // 某些瀏覽器（如 iOS Safari）不支援 — 忽略即可
        }
    }, []);

    return { isFullscreen, toggle };
}

/** 偵測滑鼠閒置自動隱藏控制列 */
function useIdleHide(idleMs = 4000) {
    const [active, setActive] = useState(true);
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const ping = () => {
            setActive(true);
            clearTimeout(timer);
            timer = setTimeout(() => setActive(false), idleMs);
        };
        ping();
        window.addEventListener('mousemove', ping);
        window.addEventListener('keydown', ping);
        window.addEventListener('touchstart', ping);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('mousemove', ping);
            window.removeEventListener('keydown', ping);
            window.removeEventListener('touchstart', ping);
        };
    }, [idleMs]);
    return active;
}

function useClock() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30_000);
        return () => clearInterval(t);
    }, []);
    return now;
}

function formatHM(d: Date) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatElapsed(start: Date | undefined) {
    if (!start) return '00:00';
    const ms = Date.now() - start.getTime();
    const total = Math.max(0, Math.floor(ms / 1000));
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
}

export default function StagePage() {
    const [songs, setSongs] = useState<Song[]>(() => loadStageSongsCache());
    const [isSongsReady, setIsSongsReady] = useState(false);
    const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
    const showControls = useIdleHide(4000);
    const nowPlaying = useNowPlaying();
    const clock = useClock();
    // D1 雜誌期數設定 — 取代硬編的「ISSUE #12 / 吉他彈唱之夜」（admin 改期數即時反映）
    const { settings } = useMagazine();

    const tickerItems = useMemo(
        () => [
            ...TICKER_BASE,
            `SIDE ${settings.currentSideLabel} · 33⅓ RPM`,
            `${settings.currentIssueTitle} 第 ${settings.currentIssueNumber} 場`,
        ],
        [settings.currentSideLabel, settings.currentIssueTitle, settings.currentIssueNumber]
    );

    useEffect(() => {
        const unsub = subscribeSongs((nextSongs) => {
            setSongs(nextSongs);
            setIsSongsReady(true);
            saveStageSongsCache(nextSongs);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !document.fullscreenElement) {
                window.location.href = window.location.pathname;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const cachedNowPlayingSong = useMemo(
        () => songs.find((s) => s.isNowPlaying) ?? null,
        [songs]
    );
    const current = nowPlaying?.song ?? cachedNowPlayingSong;
    const currentSongId = nowPlaying?.songId ?? current?.id;

    const upNext = useMemo(
        () =>
            [...songs]
                .filter((s) => s.id !== currentSongId && !s.isPlayed)
                .sort((a, b) => b.voteCount - a.voteCount)
                .slice(0, TOP_N),
        [songs, currentSongId]
    );

    const totalVotes = useMemo(
        () => songs.reduce((acc, s) => acc + (s.voteCount || 0), 0),
        [songs]
    );

    const setlistCount = songs.length;
    const darkHorseEvent = useDarkHorse(songs);
    const hypeEvent = useGlobalHype(songs);
    const voteUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : 'https://cagoooo.github.io/song/';

    // 用 hostname + path 做 QR 下方友善顯示文字
    const voteUrlDisplay = (() => {
        try {
            const u = new URL(voteUrl);
            return `${u.host}${u.pathname}`.replace(/\/$/, '');
        } catch {
            return voteUrl.replace(/^https?:\/\//, '');
        }
    })();

    const currentRank = current
        ? [...songs].sort((a, b) => b.voteCount - a.voteCount).findIndex((s) => s.id === current.id)
        : -1;
    const trackNum = currentRank >= 0 ? String(currentRank + 1).padStart(2, '0') : '01';

    return (
        <div className="editorial-stage">
            {!isSongsReady && (
                <div className="stage-sync-banner" role="status" aria-live="polite">
                    <span className="stage-sync-dot" aria-hidden="true" />
                    {songs.length > 0 ? '正在同步最新演出資料...' : '正在連線即時歌單與排行榜...'}
                </div>
            )}

            {/* 控制列（閒置淡出） */}
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fixed top-4 right-4 z-50 flex items-center gap-2"
                    >
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-md backdrop-blur transition-colors"
                            aria-label={isFullscreen ? '退出全螢幕' : '進入全螢幕'}
                            title="F11 也可切換"
                        >
                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <a
                            href={window.location.pathname}
                            className="bg-white/10 hover:bg-red-500/40 text-white p-2.5 rounded-md backdrop-blur transition-colors"
                            aria-label="退出演出模式"
                            title="退出演出模式"
                        >
                            <X className="w-4 h-4" />
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 頂部品牌列 */}
            <header className="editorial-stage-topbar">
                <div className="flex items-center gap-3">
                    <span className="live-dot" aria-hidden="true" />
                    <span>LIVE · ISSUE #{settings.currentIssueNumber}</span>
                </div>
                <div className="center">{settings.currentIssueTitle}</div>
                <div className="right">
                    {formatHM(clock)} <span className="ml-3 opacity-50">ESC</span>
                </div>
            </header>

            {/* 主內容 — NOW PLAYING + UP NEXT */}
            <main className="editorial-stage-main">
                {/* 左：正在彈奏 */}
                <section>
                    <div
                        className="flex items-center gap-3 mb-6"
                        style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 13,
                            letterSpacing: '0.28em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.7)',
                        }}
                    >
                        <span className="live-dot" aria-hidden="true" />
                        <span style={{ color: 'var(--ed-accent)' }}>NOW PLAYING</span>
                        <span className="opacity-60">SIDE A · TRACK {trackNum}</span>
                    </div>

                    {current ? (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={current.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -16 }}
                                transition={{ duration: 0.4 }}
                            >
                                <h1
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontStyle: 'italic',
                                        fontWeight: 900,
                                        fontSize: 'clamp(72px, 9vw, 160px)',
                                        letterSpacing: '-0.04em',
                                        lineHeight: 0.95,
                                        color: '#ffffff',
                                        margin: 0,
                                    }}
                                >
                                    {current.title}
                                </h1>
                                <p
                                    className="mt-3"
                                    style={{
                                        fontFamily: 'var(--font-body)',
                                        fontWeight: 400,
                                        fontSize: 'clamp(22px, 2.4vw, 36px)',
                                        color: 'rgba(255,255,255,0.75)',
                                    }}
                                >
                                    {current.artist}
                                </p>

                                {/* metadata strip — 樂譜資訊 */}
                                <div
                                    className="mt-12 grid items-start"
                                    style={{
                                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                        maxWidth: 720,
                                        gap: 24,
                                    }}
                                >
                                    <div>
                                        <div className="font-mono-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                            Pointed By
                                        </div>
                                        <div
                                            className="mt-1"
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontWeight: 700,
                                                fontSize: 22,
                                                color: '#fff',
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            主持人
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-mono-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                            Elapsed
                                        </div>
                                        <div
                                            className="mt-1 tabular-nums"
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontWeight: 700,
                                                fontSize: 22,
                                                color: '#fff',
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            {formatElapsed(nowPlaying?.startedAt)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-mono-eyebrow" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                            Difficulty
                                        </div>
                                        <div
                                            className="mt-1"
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontWeight: 700,
                                                fontSize: 22,
                                                color: '#fff',
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            {current.difficulty ? '⭐'.repeat(current.difficulty) : '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* 進度條（純視覺，從演奏開始時間動態增長） */}
                                <div className="mt-8 max-w-[720px]">
                                    <div
                                        className="h-[3px] rounded-full overflow-hidden"
                                        style={{ background: 'rgba(255,255,255,0.12)' }}
                                    >
                                        <motion.div
                                            className="h-full"
                                            style={{ background: 'var(--ed-accent)' }}
                                            initial={{ width: '0%' }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 240, ease: 'linear' }}
                                            key={current.id}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    ) : (
                        <div
                            className="text-white/50"
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontStyle: 'italic',
                                fontWeight: 500,
                                fontSize: 32,
                                letterSpacing: '-0.01em',
                                marginTop: 24,
                            }}
                        >
                            還沒有正在彈奏的歌曲 — 等主持人按下「開始彈奏」
                        </div>
                    )}
                </section>

                {/* 右：UP NEXT */}
                <aside>
                    <div className="flex items-baseline justify-between mb-5">
                        <span
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 12,
                                letterSpacing: '0.28em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.65)',
                            }}
                        >
                            UP NEXT
                        </span>
                        <span
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.2em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.5)',
                            }}
                        >
                            {upNext.length} 待唱
                        </span>
                    </div>

                    <ul className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {upNext.map((song, i) => (
                                <motion.li
                                    key={song.id}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                                    className="grid items-center"
                                    style={{
                                        gridTemplateColumns: '52px 1fr auto',
                                        gap: 16,
                                        padding: '14px 0',
                                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontFamily: 'var(--font-display)',
                                            fontStyle: 'italic',
                                            fontWeight: 800,
                                            fontSize: 28,
                                            color: i === 0 ? 'var(--ed-accent)' : 'rgba(255,255,255,0.55)',
                                            letterSpacing: '-0.04em',
                                            fontVariantNumeric: 'tabular-nums',
                                            lineHeight: 1,
                                        }}
                                    >
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <div className="min-w-0">
                                        <div
                                            className="truncate"
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontWeight: 800,
                                                fontSize: 20,
                                                color: '#fff',
                                                letterSpacing: '-0.015em',
                                                lineHeight: 1.15,
                                            }}
                                        >
                                            {song.title}
                                        </div>
                                        <div
                                            className="truncate mt-0.5"
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 10,
                                                letterSpacing: '0.14em',
                                                textTransform: 'uppercase',
                                                color: 'rgba(255,255,255,0.55)',
                                            }}
                                        >
                                            {song.artist}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div
                                            style={{
                                                fontFamily: 'var(--font-display)',
                                                fontStyle: 'italic',
                                                fontWeight: 900,
                                                fontSize: 26,
                                                color: 'var(--ed-accent)',
                                                fontVariantNumeric: 'tabular-nums',
                                                lineHeight: 1,
                                            }}
                                        >
                                            {song.voteCount}
                                        </div>
                                        <div
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 9,
                                                letterSpacing: '0.18em',
                                                textTransform: 'uppercase',
                                                color: 'rgba(255,255,255,0.5)',
                                                marginTop: 2,
                                            }}
                                        >
                                            VOTES
                                        </div>
                                    </div>
                                </motion.li>
                            ))}
                        </AnimatePresence>
                    </ul>
                </aside>
            </main>

            {/* 底部 QR + 統計 */}
            <section className="editorial-stage-bottom">
                <div
                    className="flex items-center gap-5 p-5 rounded-md"
                    style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        maxWidth: 540,
                    }}
                >
                    <div className="p-2 bg-white rounded">
                        <QRCodeSVG
                            value={voteUrl}
                            size={104}
                            level="M"
                            includeMargin={false}
                            bgColor="#ffffff"
                            fgColor="#0a0a0c"
                        />
                    </div>
                    <div>
                        <div
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 11,
                                letterSpacing: '0.28em',
                                textTransform: 'uppercase',
                                color: 'var(--ed-accent)',
                                marginBottom: 6,
                            }}
                        >
                            Scan to Vote
                        </div>
                        <div
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontWeight: 800,
                                fontSize: 22,
                                color: '#fff',
                                letterSpacing: '-0.015em',
                                lineHeight: 1.15,
                            }}
                        >
                            {voteUrlDisplay}
                        </div>
                        <div
                            className="mt-1"
                            style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: 13,
                                color: 'rgba(255,255,255,0.55)',
                            }}
                        >
                            用手機掃 QR 點下一首 / 投票催歌
                        </div>
                    </div>
                </div>

                {/* 右側統計 */}
                <div className="flex items-end gap-10 pb-1">
                    {[
                        { n: totalVotes, l: 'Total Votes' },
                        { n: 0 /* voters unknown */, l: 'Voters', hidden: true },
                        { n: setlistCount, l: 'Setlist' },
                    ]
                        .filter((x) => !x.hidden)
                        .map((x) => (
                            <div key={x.l}>
                                <div
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 900,
                                        fontSize: 40,
                                        letterSpacing: '-0.02em',
                                        color: '#fff',
                                        fontVariantNumeric: 'tabular-nums',
                                        lineHeight: 1,
                                    }}
                                >
                                    {x.n}
                                </div>
                                <div
                                    className="mt-2"
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: 10,
                                        letterSpacing: '0.22em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.55)',
                                    }}
                                >
                                    {x.l}
                                </div>
                            </div>
                        ))}
                </div>
            </section>

            {/* 底部 ticker */}
            <div className="editorial-stage-marquee" aria-hidden="true">
                <div className="track">
                    {[...tickerItems, ...tickerItems].map((t, i) => (
                        <span key={i}>★ {t}</span>
                    ))}
                </div>
            </div>

            <DarkHorseOverlay event={darkHorseEvent} />
            <GlobalHypeOverlay event={hypeEvent} />
        </div>
    );
}
