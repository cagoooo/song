import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNowPlaying } from '@/hooks/useNowPlaying';
import { useVoteHistory } from '@/hooks/useVoteHistory';
import type { Song } from '@/lib/firestore';

interface UpNextBarProps {
    songs: Song[];
    onOpenDetail?: (song: Song) => void;
    onShowFullQueue?: () => void;
}

const ASSUMED_SONG_SECONDS = 210;
const BODY_CLASS = 'has-up-next-bar';
const BODY_EMPTY_CLASS = 'has-empty-up-next-bar';

function fmt(seconds: number) {
    const m = Math.max(0, Math.floor(seconds / 60)).toString().padStart(2, '0');
    const s = Math.max(0, Math.floor(seconds % 60)).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function getQueuedSongs(songs: Song[]) {
    return [...songs]
        .filter((song) => !song.isPlayed && !song.isNowPlaying)
        .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0));
}

export function UpNextBar({ songs, onOpenDetail }: UpNextBarProps) {
    const nowPlaying = useNowPlaying();
    const { history } = useVoteHistory();
    const [elapsed, setElapsed] = useState(0);
    const [flashSongId, setFlashSongId] = useState<string | null>(null);
    const [isQueueOpen, setIsQueueOpen] = useState(false);
    const flashTimer = useRef<number | null>(null);

    const fullQueue = useMemo(() => getQueuedSongs(songs), [songs]);
    const queue = useMemo(() => fullQueue.slice(0, 3), [fullQueue]);

    const playedCount = useMemo(() => songs.filter((song) => song.isPlayed).length, [songs]);
    const setlistTotal = Math.max(songs.length, 1);

    useEffect(() => {
        if (!nowPlaying?.startedAt) {
            setElapsed(0);
            return;
        }

        const startMs = new Date(nowPlaying.startedAt).getTime();
        const update = () => {
            const nextElapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            setElapsed(Math.min(nextElapsed, ASSUMED_SONG_SECONDS));
        };

        update();
        const intervalId = window.setInterval(update, 1000);
        return () => window.clearInterval(intervalId);
    }, [nowPlaying?.startedAt, nowPlaying?.songId]);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent).detail as { songId: string } | undefined;
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

    useEffect(() => {
        document.body.classList.add(BODY_CLASS);
        return () => {
            document.body.classList.remove(BODY_CLASS);
        };
    }, []);

    useEffect(() => {
        document.body.classList.toggle(BODY_EMPTY_CLASS, !nowPlaying?.song);
        return () => {
            document.body.classList.remove(BODY_EMPTY_CLASS);
        };
    }, [nowPlaying?.song]);

    const userTopPick = useMemo(() => {
        const voted = new Set(history.map((item) => item.songId));

        for (let i = 0; i < fullQueue.length; i++) {
            if (voted.has(fullQueue[i].id)) {
                return { rank: i + 1, song: fullQueue[i] };
            }
        }

        return null;
    }, [fullQueue, history]);

    const handleMore = useCallback(() => {
        setIsQueueOpen(true);
    }, []);

    const handleOpenQueuedSong = useCallback((song: Song) => {
        setIsQueueOpen(false);
        onOpenDetail?.(song);
    }, [onOpenDetail]);

    const live = !!nowPlaying?.song;
    const isEmpty = !live;
    const trackIndex = Math.min(setlistTotal, playedCount + (live ? 1 : 0));
    const trackNum = String(trackIndex).padStart(2, '0');
    const setlistTotalStr = String(setlistTotal).padStart(2, '0');
    const hiddenQueueCount = Math.max(0, fullQueue.length - queue.length);

    const bar = (
        <>
            <aside
                className={`un-bar ${isEmpty ? 'empty' : ''}`}
                role="region"
                aria-label="底部正在播放與待播清單"
            >
                <div className="un-inner">
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
                                title={nowPlaying?.song ? `${nowPlaying.song.title} · ${nowPlaying.song.artist}` : ''}
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

                    <div className="un-div" aria-hidden="true">
                        <span className="un-div-arrow">▲</span>
                        <span className="un-div-label">Up Next</span>
                        <span className="un-div-arrow">▲</span>
                    </div>

                    <div className="un-queue">
                        {queue.map((song, idx) => {
                            const tooltip = userTopPick?.song.id === song.id
                                ? `你點的歌目前第 ${userTopPick.rank}`
                                : null;

                            return (
                                <button
                                    key={song.id}
                                    type="button"
                                    className={`un-card ${idx === 0 ? 'up-next' : 'later'} ${flashSongId === song.id ? 'flash' : ''}`}
                                    data-mine={tooltip ?? undefined}
                                    onClick={() => onOpenDetail?.(song)}
                                    aria-label={`待播第 ${idx + 1} 首：${song.title}，${song.artist}`}
                                    title={`${song.title} · ${song.voteCount || 0} 票`}
                                >
                                    <div className="un-card-no">{String(idx + 2).padStart(2, '0')}</div>
                                    <div className="un-card-meta">
                                        <div className="un-card-title">{song.title}</div>
                                        <div className="un-card-artist">{song.artist}</div>
                                    </div>
                                </button>
                            );
                        })}
                        {queue.length === 0 && !isEmpty && (
                            <div className="un-card later un-card-empty">
                                <div className="un-card-no">--</div>
                                <div className="un-card-meta">
                                    <div className="un-card-title">待播清單空了</div>
                                    <div className="un-card-artist">新的點播會出現在這裡</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="un-more"
                        onClick={handleMore}
                        title={`查看完整待播清單，共 ${fullQueue.length} 首`}
                        aria-label={`查看完整待播清單，共 ${fullQueue.length} 首`}
                    >
                        +{hiddenQueueCount}
                        <span className="lab">MORE</span>
                    </button>

                    <div className="un-empty" aria-hidden={!isEmpty}>
                        <span className="un-empty-dot" />
                        <span className="un-empty-h">等待開場</span>
                        <span className="un-empty-sub">今晚的第一首歌準備中</span>
                    </div>
                </div>
            </aside>

            {isQueueOpen && (
                <div
                    className="un-queue-modal-backdrop"
                    role="presentation"
                    onMouseDown={() => setIsQueueOpen(false)}
                >
                    <section
                        className="un-queue-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="un-queue-modal-title"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <header className="un-queue-modal-head">
                            <div>
                                <div className="un-queue-modal-kicker">UP NEXT</div>
                                <h2 id="un-queue-modal-title">完整待播清單</h2>
                            </div>
                            <button
                                type="button"
                                className="un-queue-modal-close"
                                onClick={() => setIsQueueOpen(false)}
                                aria-label="關閉完整待播清單"
                            >
                                ×
                            </button>
                        </header>

                        <div className="un-queue-modal-list">
                            {fullQueue.length > 0 ? fullQueue.map((song, idx) => (
                                <button
                                    key={song.id}
                                    type="button"
                                    className="un-queue-modal-row"
                                    onClick={() => handleOpenQueuedSong(song)}
                                >
                                    <span className="un-queue-modal-rank">{String(idx + 1).padStart(2, '0')}</span>
                                    <span className="un-queue-modal-song">
                                        <strong>{song.title}</strong>
                                        <small>{song.artist || '未知歌手'}</small>
                                    </span>
                                    <span className="un-queue-modal-votes">{song.voteCount || 0} 票</span>
                                </button>
                            )) : (
                                <div className="un-queue-modal-empty">
                                    目前沒有待播歌曲，新的點播會出現在這裡。
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </>
    );

    return createPortal(bar, document.body);
}

export default UpNextBar;
