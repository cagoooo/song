// Thank-you Modal — END OF SIDE A 演出收尾儀式
// 設計來源：Claude Design handoff (A5FJBgUP1fHqvas4Wi1WeQ) thank-you-modal.html
// verifier 修正：
//   #1 黑膠 / 藍色 label 兩個獨立 keyframes（label 帶 translate）
//   #2 結束角度 720° 兩整圈，文字停下時正向可讀
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Song } from '@/lib/firestore';
import { useVoterLeaderboard } from '@/hooks/useVoterLeaderboard';

interface ThankYouModalProps {
    isOpen: boolean;
    onClose: () => void;
    songs: Song[];
    /** 點「分享今晚的節目單」要做的事 — 通常會 onClose + 開 ShareCardModal */
    onShare?: () => void;
    /** 倒數自動 fade 秒數，預設 30 */
    autoFadeSeconds?: number;
}

function formatHM(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

export function ThankYouModal({
    isOpen,
    onClose,
    songs,
    onShare,
    autoFadeSeconds = 30,
}: ThankYouModalProps) {
    const [dismissing, setDismissing] = useState(false);
    const [remaining, setRemaining] = useState(autoFadeSeconds);
    const [displayCounts, setDisplayCounts] = useState({ votes: 0, voters: 0, setlist: 0 });
    const modalRef = useRef<HTMLDivElement>(null);
    const closingRef = useRef(false);

    // 統計資料
    const totalVotes = songs.reduce((sum, s) => sum + (s.voteCount || 0), 0);
    const setlistCount = songs.length;
    const { totalVoters } = useVoterLeaderboard(1);

    // 最後一首：找 isNowPlaying 為 true 的歌，否則找最高票
    const lastSong = (() => {
        const playing = songs.find((s) => s.isNowPlaying);
        if (playing) return playing;
        return [...songs].sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))[0];
    })();

    // 當前時間（每次開啟時鎖定一次，不會跳秒）
    const [closingTime] = useState(() => formatHM(new Date()));

    // 重置狀態
    useEffect(() => {
        if (isOpen) {
            setDismissing(false);
            setRemaining(autoFadeSeconds);
            setDisplayCounts({ votes: 0, voters: 0, setlist: 0 });
            closingRef.current = false;
        }
    }, [isOpen, autoFadeSeconds]);

    // close handler — 觸發 dismissing 動畫 then 真的關閉
    const close = () => {
        if (closingRef.current) return;
        closingRef.current = true;
        setDismissing(true);
        setTimeout(() => {
            onClose();
        }, 420);
    };

    // 計數動畫（vinyl 出現後 820ms 開始，跑 1500ms）
    useEffect(() => {
        if (!isOpen) return;
        const targets = { votes: totalVotes, voters: totalVoters, setlist: setlistCount };
        const duration = 1500;
        const delay = 820;
        let raf = 0;
        const startTimer = setTimeout(() => {
            const start = performance.now();
            const tick = (now: number) => {
                const k = Math.min(1, (now - start) / duration);
                const e = easeOutCubic(k);
                setDisplayCounts({
                    votes: Math.round(targets.votes * e),
                    voters: Math.round(targets.voters * e),
                    setlist: Math.round(targets.setlist * e),
                });
                if (k < 1) raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
        }, delay);
        return () => {
            clearTimeout(startTimer);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [isOpen, totalVotes, totalVoters, setlistCount]);

    // ESC 關閉
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // 30s auto-fade 倒數
    useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    close();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    // SSR safe
    const portalTarget = typeof document !== 'undefined' ? document.body : null;
    if (!portalTarget) return null;

    const handleShare = () => {
        // 直接呼叫 onShare（父層會處理：close this + open ShareCard）
        if (onShare) onShare();
        else close();
    };

    // 跑馬燈 unit — 重複 4 次達到 seamless loop
    const MarqueeUnit = (
        <>
            <span>
                <span className="sep">★</span>
                下一場 <span className="blue">Nº 13</span>
                <span className="sep">★</span>
            </span>
            <span className="small">桃園 SMES · 阿凱彈唱之夜</span>
            <span>
                <span className="sep">✦</span>
                想點歌請早 — 下次活動再公告
                <span className="sep">✦</span>
            </span>
            <span className="small">SIDE B · COMING SOON</span>
        </>
    );

    return createPortal(
        <div
            ref={modalRef}
            className={`ty-modal${dismissing ? ' dismissing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ty-title"
        >
            {/* 1. Magazine top bar */}
            <div className="ty-flag">
                <span>
                    Nº 12 <span className="dot">·</span> END OF SIDE A
                </span>
                <span className="ty-flag-c">阿凱彈唱之夜</span>
                <span className="ty-flag-r">{closingTime}</span>
            </div>

            {/* dismiss row */}
            <div className="ty-dismiss">
                <span className="auto">
                    <span>AUTO-FADE</span>
                    <span className="bar" />
                    <span>{remaining}s</span>
                </span>
                <button className="kbd" type="button" onClick={close}>
                    <kbd>ESC</kbd> 跳過
                </button>
            </div>

            {/* 2 — 6. main stage */}
            <main className="ty-stage">
                <div className="ty-chap">Side A · Closing Ritual</div>

                {/* vinyl + tonearm */}
                <div className="ty-vinyl-wrap" aria-hidden="true">
                    <div className="ty-vinyl" />
                    <div className="ty-label">
                        <div>
                            <div className="ty-label-no">N°12</div>
                        </div>
                        <div className="ty-label-side">SIDE A · 33⅓</div>
                    </div>

                    {/* tonearm */}
                    <div className="ty-tonearm">
                        <svg viewBox="0 0 220 220">
                            <circle cx="198" cy="22" r="14" fill="#1a1a1a" />
                            <circle cx="198" cy="22" r="8" fill="#2b4dff" />
                            <circle cx="198" cy="22" r="3" fill="#0a0a0a" />
                            <rect x="92" y="18" width="106" height="6" fill="#1a1a1a" rx="2" />
                            <rect x="92" y="20" width="106" height="2" fill="#3a3a3a" />
                            <polygon points="92,12 100,12 96,40 86,40" fill="#1a1a1a" />
                            <rect x="84" y="38" width="14" height="6" fill="#0a0a0a" />
                            <rect x="86" y="40" width="10" height="3" fill="#2b4dff" opacity="0.9" />
                        </svg>
                    </div>
                </div>

                {/* 3. headline */}
                <h1 className="ty-title" id="ty-title">
                    今晚就到這裡 <span className="star">✦</span>
                    <br />
                    <em>謝謝你</em>
                </h1>

                {/* 4. stats strip */}
                <div className="ty-stats">
                    <div className="ty-stat">
                        <div className="ty-stat-n">{displayCounts.votes.toLocaleString('en-US')}</div>
                        <div className="ty-stat-l">VOTES</div>
                        <span className="ty-stat-sub">總票數</span>
                    </div>
                    <div className="ty-stat">
                        <div className="ty-stat-n">{displayCounts.voters.toLocaleString('en-US')}</div>
                        <div className="ty-stat-l">VOTERS</div>
                        <span className="ty-stat-sub">位歌迷</span>
                    </div>
                    <div className="ty-stat">
                        <div className="ty-stat-n">{displayCounts.setlist.toLocaleString('en-US')}</div>
                        <div className="ty-stat-l">SETLIST</div>
                        <span className="ty-stat-sub">首歌</span>
                    </div>
                </div>

                {/* 5. pull quote */}
                <blockquote className="ty-quote">
                    <p>
                        {lastSong ? (
                            <>
                                最後一首是 <span className="song">《{lastSong.title}》</span>
                                —— 謝謝跟我們一起合唱，下次見。
                            </>
                        ) : (
                            <>謝謝每一票，謝謝每一次合唱。下次見。</>
                        )}
                    </p>
                    <span className="byline">
                        — 阿凱 · {closingTime} · Side A Closed
                    </span>
                </blockquote>

                {/* 6. CTAs */}
                <div className="ty-actions">
                    <button
                        className="ty-cta primary"
                        type="button"
                        onClick={handleShare}
                        aria-label="分享今晚的節目單"
                    >
                        分享今晚的節目單
                        <span className="arrow" aria-hidden="true">→</span>
                    </button>
                    {/* 「看下一場演出時間」未來功能，隱藏 */}
                </div>
            </main>

            {/* 7. marquee */}
            <div className="ty-marquee" aria-hidden="true">
                <div className="ty-marquee-track">
                    {MarqueeUnit}
                    {MarqueeUnit}
                    {MarqueeUnit}
                    {MarqueeUnit}
                </div>
            </div>
        </div>,
        portalTarget,
    );
}
