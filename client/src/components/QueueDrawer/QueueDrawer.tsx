// 全隊列抽屜 · Queue Drawer
// 從 UpNextBar +5 看全部展開 360px 高（桌機 920px 置中、手機全屏）
// 列出全部歌（waiting + played），sort by votes / added
// 對應原型：.handoff-tmp3/prototypes/queue-drawer.html
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Song } from '@/lib/firestore';

interface QueueDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    songs: Song[];
    /** 點任一首 → 通常開 SongDetailModal */
    onOpenDetail?: (song: Song) => void;
}

type SortMode = 'votes' | 'added';

export function QueueDrawer({ isOpen, onClose, songs, onOpenDetail }: QueueDrawerProps) {
    const [sortMode, setSortMode] = useState<SortMode>('votes');
    const handleRef = useRef<HTMLDivElement>(null);
    const drawerRef = useRef<HTMLElement>(null);
    const dragYRef = useRef<number | null>(null);

    const { waiting, played } = useMemo(() => {
        const filtered = songs.filter((s) => !s.isNowPlaying);
        const sorted = [...filtered].sort((a, b) => {
            if (sortMode === 'votes') return (b.voteCount || 0) - (a.voteCount || 0);
            // added — 用 createdAt desc，沒值就放後面
            const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bt - at;
        });
        return {
            waiting: sorted.filter((s) => !s.isPlayed),
            played: sorted.filter((s) => s.isPlayed),
        };
    }, [songs, sortMode]);

    // ESC 關閉
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // 把手下滑關閉（mouse + touch）
    useEffect(() => {
        const handleEl = handleRef.current;
        if (!handleEl || !isOpen) return;

        const onStart = (e: MouseEvent | TouchEvent) => {
            const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
            dragYRef.current = y;
            if (drawerRef.current) drawerRef.current.style.transition = 'none';
        };
        const onMove = (e: MouseEvent | TouchEvent) => {
            if (dragYRef.current == null) return;
            const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
            const dy = Math.max(0, y - dragYRef.current);
            if (drawerRef.current) {
                const isDesktop = window.innerWidth >= 760;
                drawerRef.current.style.transform = isDesktop
                    ? `translate(-50%, ${dy}px)`
                    : `translateY(${dy}px)`;
            }
        };
        const onEnd = (e: MouseEvent | TouchEvent) => {
            if (dragYRef.current == null) return;
            const y = 'changedTouches' in e && e.changedTouches.length
                ? e.changedTouches[0].clientY
                : 'clientY' in e ? e.clientY : 0;
            const dy = y - dragYRef.current;
            dragYRef.current = null;
            if (drawerRef.current) {
                drawerRef.current.style.transition = '';
                drawerRef.current.style.transform = '';
            }
            if (dy > 80) onClose();
        };

        handleEl.addEventListener('mousedown', onStart);
        handleEl.addEventListener('touchstart', onStart, { passive: true });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchend', onEnd);

        return () => {
            handleEl.removeEventListener('mousedown', onStart);
            handleEl.removeEventListener('touchstart', onStart);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchend', onEnd);
        };
    }, [isOpen, onClose]);

    return (
        <>
            <div
                className={`qd-scrim ${isOpen ? 'is-open' : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <aside
                ref={drawerRef}
                className={`qd-drawer ${isOpen ? 'is-open' : ''}`}
                role="dialog"
                aria-label="Tonight's queue"
                aria-modal="true"
                aria-hidden={!isOpen}
            >
                <div className="qd-handle-row">
                    <div ref={handleRef} className="qd-handle" aria-hidden="true" />
                </div>

                <div className="qd-head">
                    <div>
                        <div className="qd-eb">§ TONIGHT'S QUEUE</div>
                        <h2 className="qd-h">
                            Up Next
                            <span className="qd-h-meta">
                                · <b>{waiting.length}</b> WAITING &nbsp;·&nbsp;{' '}
                                <b>{played.length}</b> PLAYED &nbsp;·&nbsp; SIDE A
                            </span>
                        </h2>
                    </div>
                    <span />
                    <div className="qd-toggle" role="group">
                        <button
                            type="button"
                            className={sortMode === 'votes' ? 'is-on' : ''}
                            onClick={() => setSortMode('votes')}
                        >
                            按票數
                        </button>
                        <button
                            type="button"
                            className={sortMode === 'added' ? 'is-on' : ''}
                            onClick={() => setSortMode('added')}
                        >
                            按加入
                        </button>
                    </div>
                    <button type="button" className="qd-close" onClick={onClose} aria-label="關閉">
                        ✕
                    </button>
                </div>

                <div className="qd-list">
                    {waiting.length === 0 && played.length === 0 ? (
                        <div className="qd-empty">
                            <div className="qd-empty-h">隊列空了</div>
                            <div className="qd-empty-sub">先點幾首歌，這裡就會排滿</div>
                        </div>
                    ) : (
                        <>
                            {waiting.map((s, i) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    className={`qd-row ${i === 0 ? 'is-next' : ''}`}
                                    onClick={() => onOpenDetail?.(s)}
                                >
                                    <span className="qd-no">{String(i + 1).padStart(2, '0')}</span>
                                    <span className="qd-vinyl" aria-hidden="true" />
                                    <span className="qd-meta">
                                        <span className="qd-name">{s.title}</span>
                                        <span className="qd-ar">{s.artist}</span>
                                    </span>
                                    <span className="qd-votes">
                                        {s.voteCount || 0}
                                        <small>VOTES</small>
                                    </span>
                                    <span className="qd-chip">{i === 0 ? '次首' : '排隊'}</span>
                                </button>
                            ))}
                            {played.length > 0 && (
                                <div className="qd-played-sec">
                                    <span className="qd-played-lbl">
                                        § ALREADY PLAYED &nbsp;·&nbsp; <b>{played.length}</b> TRACKS
                                    </span>
                                    <span className="qd-played-rule" />
                                    <span className="qd-played-ital">已彈完</span>
                                </div>
                            )}
                            {played.map((s, idx) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    className="qd-row is-played"
                                    onClick={() => onOpenDetail?.(s)}
                                >
                                    <span className="qd-no">
                                        {String(waiting.length + idx + 1).padStart(2, '0')}
                                    </span>
                                    <span className="qd-vinyl" aria-hidden="true" />
                                    <span className="qd-meta">
                                        <span className="qd-name">🎵 {s.title}</span>
                                        <span className="qd-ar">{s.artist}</span>
                                    </span>
                                    <span className="qd-votes">
                                        {s.voteCount || 0}
                                        <small>VOTES</small>
                                    </span>
                                    <span className="qd-chip">PLAYED</span>
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}

export default QueueDrawer;
