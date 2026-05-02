// 演出模式（投影 / 大螢幕）
//   入口：在原網址後加 ?mode=stage（例：https://cagoooo.github.io/song/?mode=stage）
//   特色：深色主題、大字體、Top 10 排行、底部正在彈奏跑馬燈、F11 全螢幕、無管理 UI
import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, Maximize2, Minimize2, X, Star, Trophy } from 'lucide-react';
import { subscribeSongs, subscribeRatingStats, type Song, type RatingStats } from '@/lib/firestore';
import { useNowPlaying } from '@/hooks/useNowPlaying';
import { useVoteSurge, SURGE_META, type SurgeLevel } from '@/hooks/useVoteSurge';
import { SurgeBadge } from '@/components/SurgeBadge';
import { useDarkHorse } from '@/hooks/useDarkHorse';
import { DarkHorseOverlay } from '@/components/DarkHorseOverlay';
import { useGlobalHype } from '@/hooks/useGlobalHype';
import { GlobalHypeOverlay } from '@/components/GlobalHypeOverlay';

const TOP_N = 10;
const RANK_EMOJI = ['🥇', '🥈', '🥉'];

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

function NowPlayingMarquee() {
    const nowPlaying = useNowPlaying();
    const [stats, setStats] = useState<RatingStats | null>(null);

    useEffect(() => {
        if (!nowPlaying?.songId) {
            setStats(null);
            return;
        }
        const unsub = subscribeRatingStats(nowPlaying.songId, setStats);
        return unsub;
    }, [nowPlaying?.songId]);

    return (
        <AnimatePresence>
            {nowPlaying?.song && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-stone-900 px-8 py-5 shadow-2xl"
                >
                    <div className="flex items-center justify-center gap-6 max-w-screen-2xl mx-auto">
                        <motion.div
                            animate={{ rotate: [0, -8, 8, -8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <Music2 className="w-10 h-10" />
                        </motion.div>
                        <div className="flex-1 text-center">
                            <div className="text-sm font-semibold uppercase tracking-widest opacity-70 mb-1">
                                正在彈奏
                            </div>
                            <div className="text-3xl md:text-4xl font-extrabold truncate">
                                {nowPlaying.song.title}
                                <span className="opacity-60 mx-3">·</span>
                                <span className="font-bold">{nowPlaying.song.artist}</span>
                            </div>
                        </div>
                        {stats && stats.count > 0 && (
                            <div className="flex items-center gap-2 text-2xl font-bold whitespace-nowrap">
                                <Star className="w-7 h-7 fill-stone-900" />
                                {stats.average.toFixed(1)}
                                <span className="text-sm opacity-60">({stats.count})</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function RankRow({ song, rank, surgeLevel }: { song: Song; rank: number; surgeLevel: SurgeLevel }) {
    const isPodium = rank < 3;
    const podiumColors = [
        'from-yellow-400 to-amber-500 text-stone-900',
        'from-slate-300 to-slate-400 text-stone-900',
        'from-orange-400 to-orange-600 text-white',
    ];
    const surgeRing = surgeLevel > 0 ? SURGE_META[surgeLevel as 1 | 2 | 3].ringClass : '';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            className={`flex items-center gap-6 px-6 py-4 rounded-2xl backdrop-blur-md border ${
                isPodium
                    ? `bg-gradient-to-r ${podiumColors[rank]} border-white/30 shadow-2xl`
                    : 'bg-white/5 border-white/10'
            } ${surgeRing}`}
        >
            <div className={`text-5xl md:text-6xl font-black ${isPodium ? '' : 'text-amber-400/80'} w-20 text-center shrink-0`}>
                {isPodium ? RANK_EMOJI[rank] : rank + 1}
            </div>
            <div className="flex-1 min-w-0">
                <div className={`text-3xl md:text-4xl font-extrabold truncate ${isPodium ? '' : 'text-white'} flex items-center gap-3`}>
                    <span className="truncate">{song.title}</span>
                    <SurgeBadge level={surgeLevel} size="lg" />
                </div>
                <div className={`text-xl md:text-2xl mt-1 truncate ${isPodium ? 'opacity-80' : 'text-amber-200/70'}`}>
                    {song.artist}
                </div>
            </div>
            <div className={`text-4xl md:text-5xl font-black tabular-nums ${isPodium ? '' : 'text-amber-400'} shrink-0`}>
                {song.voteCount}
                <span className="text-base font-medium opacity-60 ml-1">票</span>
            </div>
        </motion.div>
    );
}

export default function StagePage() {
    const [songs, setSongs] = useState<Song[]>([]);
    const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
    const showControls = useIdleHide(4000);

    useEffect(() => {
        const unsub = subscribeSongs(setSongs);
        return unsub;
    }, []);

    // Esc 退出演出模式（保留 URL，移除 query）
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !document.fullscreenElement) {
                window.location.href = window.location.pathname;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const top = useMemo(
        () => [...songs].sort((a, b) => b.voteCount - a.voteCount).slice(0, TOP_N),
        [songs]
    );
    const surgeMap = useVoteSurge(songs);
    const darkHorseEvent = useDarkHorse(songs);
    const hypeEvent = useGlobalHype(songs);

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950/40 text-white overflow-hidden relative">
            {/* 背景裝飾音符 */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {['♪', '♫', '♩', '♬'].map((note, i) => (
                    <motion.div
                        key={i}
                        className="absolute text-amber-500/10 font-black select-none"
                        style={{
                            fontSize: `${120 + i * 40}px`,
                            top: `${(i * 23) % 70}%`,
                            left: `${(i * 31) % 80}%`,
                        }}
                        animate={{ y: [0, -20, 0], rotate: [0, 8, 0] }}
                        transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        {note}
                    </motion.div>
                ))}
            </div>

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
                            className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-colors"
                            aria-label={isFullscreen ? '退出全螢幕' : '進入全螢幕'}
                            title="F11 也可切換"
                        >
                            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                        <a
                            href={window.location.pathname}
                            className="bg-white/10 hover:bg-red-500/40 text-white p-3 rounded-full backdrop-blur-md transition-colors"
                            aria-label="退出演出模式"
                            title="退出演出模式"
                        >
                            <X className="w-5 h-5" />
                        </a>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10 max-w-screen-2xl mx-auto px-8 pt-10 pb-32">
                {/* 標題列 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-10"
                >
                    <div className="inline-flex items-center gap-4 mb-2">
                        <Trophy className="w-12 h-12 text-amber-400" />
                        <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-amber-300 via-amber-200 to-amber-400 bg-clip-text text-transparent">
                            現場熱門點播排行榜
                        </h1>
                        <Trophy className="w-12 h-12 text-amber-400 scale-x-[-1]" />
                    </div>
                    <p className="text-xl text-amber-200/60 mt-2 font-medium tracking-wider">
                        🎸 即時更新 · Top {TOP_N}
                    </p>
                </motion.div>

                {/* 排行榜 */}
                {top.length === 0 ? (
                    <div className="text-center text-2xl text-amber-200/50 mt-20">
                        <Music2 className="w-20 h-20 mx-auto mb-4 opacity-30" />
                        等待第一張投票...
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {top.map((song, i) => (
                                <RankRow
                                    key={song.id}
                                    song={song}
                                    rank={i}
                                    surgeLevel={surgeMap.get(song.id) ?? 0}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* 底部正在彈奏跑馬燈 */}
            <NowPlayingMarquee />

            {/* 黑馬時刻慶祝 (演出模式同步顯示) */}
            <DarkHorseOverlay event={darkHorseEvent} />

            {/* 全站熱度 banner (演出模式同步) */}
            <GlobalHypeOverlay event={hypeEvent} />
        </div>
    );
}
