// 歌曲過場 2 秒迷你儀式 · Song Transition Curtain
// 自動觸發：當 useNowPlaying 的 songId 從 A 切到 B（兩者都非 null）
// 不需要 Firestore 廣播，每個 client 自己 diff 偵測
// 對應原型：.handoff-tmp3/prototypes/song-transition-curtain.html
import { useEffect, useRef, useState } from 'react';
import type { Song } from '@/lib/firestore';

export interface TransitionPayload {
    from: { title: string; artist: string; track?: string };
    to: { title: string; artist: string; track?: string };
    /** 觸發時間 — 用作 React key 強制重播動畫 */
    key: number;
}

interface SongTransitionCurtainProps {
    payload: TransitionPayload | null;
    onClose: () => void;
}

export function SongTransitionCurtain({ payload, onClose }: SongTransitionCurtainProps) {
    useEffect(() => {
        if (!payload) return;
        // 整體動畫 2.0s 後關閉
        const t = window.setTimeout(onClose, 2050);
        return () => window.clearTimeout(t);
    }, [payload, onClose]);

    if (!payload) return null;

    const { from, to } = payload;
    return (
        <div className="tc-overlay" key={payload.key} role="status" aria-live="polite">
            <div className="tc-ribbon" aria-hidden="true">
                § TRANSITION &nbsp;·&nbsp; <b>2.0s</b>
            </div>
            <div className="tc-ribbon-r" aria-hidden="true">
                <span className="tc-dot" /> LIVE · <b>SIDE A</b>
            </div>

            <div className="tc-vinyl" aria-hidden="true">
                <div className="tc-vinyl-label" />
            </div>

            <div className="tc-titles">
                <div className="tc-title tc-out">
                    <div className="tc-eyebrow">
                        § JUST PLAYED &nbsp;·&nbsp; <b>TRACK {from.track ?? '--'}</b>
                    </div>
                    <div className="tc-h">{from.title}</div>
                    <div className="tc-artist">{from.artist}</div>
                </div>
                <div className="tc-title tc-in">
                    <div className="tc-eyebrow">
                        § NOW PLAYING &nbsp;·&nbsp; <b>TRACK {to.track ?? '--'}</b>
                    </div>
                    <div className="tc-h">
                        <em>{to.title}</em>
                    </div>
                    <div className="tc-artist">{to.artist}</div>
                </div>
            </div>

            <div className="tc-ticker" aria-hidden="true">
                <span className="tc-ticker-lab">TRACK</span>
                <span className="tc-ticker-from tc-ticker-num">{from.track ?? '--'}</span>
                <span className="tc-ticker-arrow">→</span>
                <span className="tc-ticker-to tc-ticker-num">{to.track ?? '--'}</span>
                <span className="tc-ticker-lab">· Side A</span>
            </div>
        </div>
    );
}

/**
 * 監聽 nowPlaying.songId 變化，發出過場 payload。
 * 規則：
 *   prev=null  → curr=song   ：不觸發（這是「開場」，由 OpeningCurtain 管）
 *   prev=song  → curr=null   ：不觸發（admin 停了）
 *   prev=songA → curr=songB  ：觸發過場
 */
export function useSongTransition(
    currentSong: Song | null | undefined,
    setlistTotal: number,
    playedCount: number,
): TransitionPayload | null {
    const [payload, setPayload] = useState<TransitionPayload | null>(null);
    const prevSongRef = useRef<Song | null>(null);

    useEffect(() => {
        const prev = prevSongRef.current;
        const curr = currentSong ?? null;

        const prevId = prev?.id ?? null;
        const currId = curr?.id ?? null;

        // 必須兩端都有歌且 ID 不同才觸發
        if (prev && curr && prevId !== currId) {
            const fromTrack = String(Math.min(setlistTotal, playedCount)).padStart(2, '0');
            const toTrack = String(Math.min(setlistTotal, playedCount + 1)).padStart(2, '0');
            setPayload({
                from: { title: prev.title, artist: prev.artist, track: fromTrack },
                to: { title: curr.title, artist: curr.artist, track: toTrack },
                key: Date.now(),
            });
        }

        prevSongRef.current = curr;
    }, [currentSong, setlistTotal, playedCount]);

    return payload;
}

export default SongTransitionCurtain;
