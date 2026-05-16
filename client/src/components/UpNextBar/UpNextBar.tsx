// 底部 sticky 隊列條 — Editorial 雜誌風 Up Next
// 三種狀態：演出中（live）/ 觀眾剛投票（flash 黃光 pulse）/ 待開場（empty）
// 對應原型：Downloads/up-next-bar.html
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNowPlaying } from '@/hooks/useNowPlaying';
import { useVoteHistory } from '@/hooks/useVoteHistory';
import type { Song } from '@/lib/firestore';

interface UpNextBarProps {
    songs: Song[];
    onOpenDetail?: (song: Song) => void;
    /** 點 "+5 看全部" — 通常切到排行榜 tab / 捲到排行榜區 */
    onShowFullQueue?: () => void;
}

// 沒有真實音檔長度時的預設曲長（210 秒 ≈ 3:30）
const ASSUMED_SONG_SECONDS = 210;

const BODY_CLASS = 'has-up-next-bar';

function fmt(s: number) {
    const m = Math.max(0, Math.floor(s / 60)).toString().padStart(2, '0');
    const r = Math.max(0, Math.floor(s % 60)).toString().padStart(2, '0');
    return `${m}:${r}`;
}

export function UpNextBar({ songs, onOpenDetail, onShowFullQueue }: UpNextBarProps) {
    const nowPlaying = useNowPlaying();
    const { history } = useVoteHistory();
    const [elapsed, setElapsed] = useState(0);
    const [flashSongId, setFlashSongId] = useState<string | null>(null);
    const flashTimer = useRef<number | null>(null);

    // 隊列：依票數降序，剔除已彈奏與正在彈奏，取前 3
    const queue = useMemo(() => {
        return [...songs]
            .filter((s) => !s.isPlayed && !s.isNowPlaying)
            .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
            .slice(0, 3);
    }, [songs]);

    const playedCount = useMemo(() => songs.filter((s) => s.isPlayed).length, [songs]);
    const setlistTotal = Math.max(songs.length, 1);

    // 進度條 — 用 startedAt 估算播放秒數
    useEffect(() => {
        if (!nowPlaying?.startedAt) { setElapsed(0); return; }
        const startMs = new Date(nowPlaying.startedAt).getTime();
        const update = () => {
            const e = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            setElapsed(Math.min(e, ASSUMED_SONG_SECONDS));
        };
        update();
        const id = window.setInterval(update, 1000);
        return () => window.clearInterval(id);
    }, [nowPlaying?.startedAt, nowPlaying?.songId]);

    // 監聽全域投票事件 → 在對應的隊列卡上做黃光 pulse
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { songId: string } | undefined;
            if (!detail?.songId) return;
            setFlashSongId(detail.songId);
            if (flashTimer.current) window.clearTimeout(flashTimer.current);
            flashTimer.current = window.setTimeout(() => setFlashSongId(null), 700);
        };
        window.addEventListener('combo:vote', handler);
        return () => {
            window.removeEventListener('combo:vote', handler);
            if (flashTimer.current) window.clearTimeout(flashTimer.current);
        };
    }, []);

    // body class 讓其他 fixed 元件抬升避讓
    useEffect(() => {
        document.body.classList.add(BODY_CLASS);
        return () => { document.body.classList.remove(BODY_CLASS); };
    }, []);

    // 「你點的還排第 N」— 找出使用者投過、目前還在隊列裡排最前的歌
    const userTopPick = useMemo(() => {
        const voted = new Set(history.map((h) => h.songId));
        const ranked = [...songs]
            .filter((s) => !s.isPlayed && !s.isNowPlaying)
            .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
        for (let i = 0; i < ranked.length; i++) {
            if (voted.has(ranked[i].id)) return { rank: i + 1, song: ranked[i] };
        }
        return null;
    }, [songs, history]);

    const handleMore = useCallback(() => {
        if (onShowFullQueue) onShowFullQueue();
    }, [onShowFullQueue]);

    // 模式
    const live = !!nowPlaying?.song;
    const isEmpty = !live;

    // 「TRACK 07 OF 18」格式
    const trackIndex = Math.min(setlistTotal, playedCount + (live ? 1 : 0));
    const trackNum = String(trackIndex).padStart(2, '0');
    const setlistTotalStr = String(setlistTotal).padStart(2, '0');

    return (
        <aside
            className={`un-bar ${isEmpty ? 'empty' : ''}`}
            role="region"
            aria-label="正在彈與接下來隊列"
        >
            <div className="un-inner">
                {/* 左：NOW PLAYING */}
                <div className="un-now">
                    <div className="un-vinyl" aria-hidden="true" />
                    <div className="un-now-meta">
                        <div className="un-now-eyebrow">
                            <span className="un-live-dot" aria-hidden="true" />
                            NOW PLAYING · TRACK {trackNum} OF {setlistTotalStr}
                        </div>
                        <button
                            type="button"
                            className="un-now-title"
                            onClick={() => nowPlaying?.song && onOpenDetail?.(nowPlaying.song)}
                            disabled={!nowPlaying?.song}
                            title={nowPlaying?.song ? `${nowPlaying.song.title} — ${nowPlaying.song.artist}` : ''}
                        >
                            {nowPlaying?.song?.title}
                            {nowPlaying?.song?.artist && (
                                <span className="artist">{nowPlaying.song.artist}</span>
                            )}
                        </button>
                        <div className="un-progress">
                            <div className="un-progress-track">
                                <div
                                    className="un-progress-fill"
                                    style={{ width: `${live ? (elapsed / ASSUMED_SONG_SECONDS) * 100 : 0}%` }}
                                />
                            </div>
                            <div className="un-time">
                                <span className="now">{fmt(elapsed)}</span> / {fmt(ASSUMED_SONG_SECONDS)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 中：Up Next divider */}
                <div className="un-div" aria-hidden="true">
                    <span className="un-div-arrow">▲</span>
                    <span className="un-div-label">Up Next</span>
                    <span className="un-div-arrow">▼</span>
                </div>

                {/* 右：3 張隊列卡 */}
                <div className="un-queue">
                    {queue.map((s, idx) => {
                        const isNext = idx === 0;
                        const tooltip = userTopPick?.song.id === s.id
                            ? `你點的還排第 ${userTopPick.rank}`
                            : null;
                        return (
                            <button
                                key={s.id}
                                type="button"
                                className={`un-card ${isNext ? 'up-next' : 'later'} ${flashSongId === s.id ? 'flash' : ''}`}
                                data-mine={tooltip ?? undefined}
                                onClick={() => onOpenDetail?.(s)}
                                aria-label={`隊列第 ${idx + 1}：${s.title} — ${s.artist}`}
                                title={`${s.title} · ${s.voteCount || 0} 票`}
                            >
                                <div className="un-card-no">{String(idx + 2).padStart(2, '0')}</div>
                                <div className="un-card-meta">
                                    <div className="un-card-title">{s.title}</div>
                                    <div className="un-card-artist">{s.artist}</div>
                                </div>
                            </button>
                        );
                    })}
                    {queue.length === 0 && !isEmpty && (
                        <div className="un-card later un-card-empty">
                            <div className="un-card-no">--</div>
                            <div className="un-card-meta">
                                <div className="un-card-title">隊列空了</div>
                                <div className="un-card-artist">點一首歌讓今晚繼續</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 最右：+5 看全部 */}
                <button
                    type="button"
                    className="un-more"
                    onClick={handleMore}
                    title="展開完整隊列"
                    aria-label="展開完整隊列"
                >
                    +5
                    <span className="lab">看全部</span>
                </button>

                {/* 待開場 empty state — bar.empty 時取代上面所有內容 */}
                <div className="un-empty" aria-hidden={!isEmpty}>
                    <span className="un-empty-dot" />
                    <span className="un-empty-h">待開場</span>
                    <span className="un-empty-sub">阿凱老師還沒按開始 · 點歌不停</span>
                </div>
            </div>
        </aside>
    );
}

export default UpNextBar;
