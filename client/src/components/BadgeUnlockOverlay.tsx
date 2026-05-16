// 徽章解鎖全螢幕慶祝 · Badge Unlock Overlay
// 由 useBadgeUnlockQueue 偵測到新徽章時觸發
// 4 秒倒數自動關 / 按鈕 / ESC
// 對應原型：.handoff-tmp3/prototypes/badge-unlock-overlay.html
import { useEffect, useRef, useState } from 'react';
import type { BadgeUnlockEvent } from '@/hooks/useBadgeUnlockQueue';

interface BadgeUnlockOverlayProps {
    event: BadgeUnlockEvent | null;
    onClose: () => void;
    /** 點「看完整收藏」— 通常開啟 VoterPassportModal */
    onViewPassport?: () => void;
}

const AUTO_CLOSE_MS = 4000;

export function BadgeUnlockOverlay({ event, onClose, onViewPassport }: BadgeUnlockOverlayProps) {
    const [isOut, setIsOut] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_MS / 1000);
    const startedAtRef = useRef<number>(0);

    useEffect(() => {
        if (!event) return;
        setIsOut(false);
        setSecondsLeft(AUTO_CLOSE_MS / 1000);
        startedAtRef.current = Date.now();

        const tick = window.setInterval(() => {
            const elapsed = (Date.now() - startedAtRef.current) / 1000;
            const left = Math.max(0, AUTO_CLOSE_MS / 1000 - elapsed);
            setSecondsLeft(left);
            if (left <= 0) {
                window.clearInterval(tick);
                handleClose();
            }
        }, 100);

        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', onKey);
        return () => {
            window.clearInterval(tick);
            window.removeEventListener('keydown', onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event?.key]);

    function handleClose() {
        setIsOut(true);
        window.setTimeout(onClose, 450);
    }

    function handleView() {
        if (onViewPassport) onViewPassport();
        handleClose();
    }

    if (!event) return null;

    const toneClass = event.tone === 'gold' ? 'is-gold' : event.tone === 'hot' ? 'is-hot' : '';
    const arcText = event.arc + ' ' + event.arc; // 重複一遍補滿弧形
    const idBase = `bu-${event.key}`;

    return (
        <div className={`bu-overlay ${isOut ? 'is-out' : ''}`} role="dialog" aria-modal="true" aria-label="徽章解鎖">
            {/* feTurbulence 油墨破損濾鏡 */}
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
                <defs>
                    <filter id="buInk">
                        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
                        <feDisplacementMap in="SourceGraphic" scale={2} />
                    </filter>
                </defs>
            </svg>

            <div className="bu-ribbon" aria-hidden="true">
                § PASSPORT &nbsp;·&nbsp; <b>STAMP UNLOCKED</b>
            </div>
            <button type="button" className="bu-ribbon-r" onClick={handleClose} aria-label="關閉">
                ✕ &nbsp; CLOSE
            </button>

            <div className="bu-card">
                <div className="bu-stamp-wrap">
                    <div className="bu-streamers" aria-hidden="true">
                        <span className="bu-streamer" />
                        <span className="bu-streamer" />
                        <span className="bu-streamer" />
                        <span className="bu-streamer" />
                        <span className="bu-streamer" />
                    </div>
                    <div className={`bu-stamp ${toneClass}`}>
                        <svg viewBox="0 0 200 200" aria-hidden="true">
                            <defs>
                                <path id={`${idBase}-top`} d="M 100,100 m -78,0 a 78,78 0 1,1 156,0" />
                                <path id={`${idBase}-bot`} d="M 100,100 m -78,0 a 78,78 0 1,0 156,0" />
                            </defs>
                            <circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.95" />
                            <circle cx="100" cy="100" r="74" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
                            <circle cx="100" cy="100" r="64" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" opacity="0.55" />
                            <text fontFamily="JetBrains Mono, monospace" fontSize="11" fontWeight="700" letterSpacing="3.4" fill="currentColor">
                                <textPath href={`#${idBase}-top`} startOffset="50%" textAnchor="middle">{arcText}</textPath>
                            </text>
                            <text fontFamily="JetBrains Mono, monospace" fontSize="10" fontWeight="700" letterSpacing="3.4" fill="currentColor" opacity="0.85">
                                <textPath href={`#${idBase}-bot`} startOffset="50%" textAnchor="middle">
                                    UNLOCKED · {new Date().getFullYear()} · 阿凱彈唱之夜
                                </textPath>
                            </text>
                        </svg>
                        <span className="bu-glyph">{event.glyph}</span>
                    </div>
                </div>

                <div className="bu-eyebrow">
                    § <em>UNLOCKED</em> &nbsp;·&nbsp; <b>{event.en}</b>
                </div>
                <h1 className={`bu-h ${toneClass}`}>
                    <em>{event.glyph}</em> {event.name} <em>· UNLOCKED</em>
                </h1>
                <p className="bu-cond">
                    <span dangerouslySetInnerHTML={{ __html: event.cond }} />
                    <br />
                    <span className="bu-meter">{event.meter}</span>
                </p>

                <div className="bu-actions">
                    {onViewPassport && (
                        <button type="button" className="bu-btn is-primary" onClick={handleView}>
                            看完整收藏 →
                        </button>
                    )}
                    <button type="button" className="bu-btn" onClick={handleClose}>
                        繼續催歌
                    </button>
                </div>
            </div>

            <div className="bu-page" aria-hidden="true">
                AUTO-CLOSE IN <span className="bu-auto">{secondsLeft.toFixed(1)}s</span> &nbsp;·&nbsp; PRESS ESC
            </div>
        </div>
    );
}

export default BadgeUnlockOverlay;
