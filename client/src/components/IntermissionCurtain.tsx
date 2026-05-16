// 中場休息儀式 · Intermission Curtain
// 由 admin 廣播 `ceremonies/current` type='intermission' 觸發
// 黑膠 3D rotateY A→B 面 + 30 秒倒數 + 跑馬燈 + 跳過按鈕
// 對應原型：.handoff-tmp3/prototypes/intermission-curtain.html
import { useEffect, useRef, useState } from 'react';

interface IntermissionCurtainProps {
    isOpen: boolean;
    onClose: () => void;
    /** 倒數秒數 — admin 廣播時帶 payload，預設 30 */
    durationSec?: number;
    /** 點「現在開始 Side B」時的處理（同時關閉中場） */
    onStartSideB?: () => void;
}

export function IntermissionCurtain({
    isOpen,
    onClose,
    durationSec = 30,
    onStartSideB,
}: IntermissionCurtainProps) {
    const [remaining, setRemaining] = useState(durationSec);
    const [isFading, setIsFading] = useState(false);
    const startRef = useRef<number>(0);

    useEffect(() => {
        if (!isOpen) return;
        setRemaining(durationSec);
        setIsFading(false);
        startRef.current = Date.now();

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        // reduce-motion 跳到末態 + 立即關
        if (reduced) {
            setRemaining(0);
            const t = window.setTimeout(handleClose, 800);
            return () => window.clearTimeout(t);
        }

        const timer = window.setInterval(() => {
            const elapsed = (Date.now() - startRef.current) / 1000;
            const left = Math.max(0, durationSec - elapsed);
            setRemaining(left);
            if (left <= 0) {
                window.clearInterval(timer);
                handleClose();
            }
        }, 100);

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', onKey);

        return () => {
            window.clearInterval(timer);
            window.removeEventListener('keydown', onKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, durationSec]);

    function handleClose() {
        setIsFading(true);
        window.setTimeout(onClose, 650);
    }

    function handleStartSideB() {
        if (onStartSideB) onStartSideB();
        handleClose();
    }

    if (!isOpen) return null;

    const secs = Math.max(0, Math.ceil(remaining));
    const isLow = secs <= 5;
    const progress = Math.max(0, Math.min(1, 1 - remaining / durationSec));

    return (
        <div
            className={`ic-overlay ${isFading ? 'is-out' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="中場休息"
        >
            <div className="ic-topbar" aria-hidden="true">
                <span>Nº 12 · INTERMISSION</span>
                <span className="ic-topbar-c">
                    <em>SIDE A</em> &nbsp;→&nbsp; <em>SIDE B</em>
                </span>
                <span className="ic-topbar-r">
                    LIVE <span className="ic-live-dot" />
                </span>
            </div>

            <div className="ic-controls">
                <button type="button" className="ic-btn is-primary" onClick={handleStartSideB}>
                    現在開始 Side B
                </button>
                <button type="button" className="ic-btn" onClick={handleClose}>
                    SKIP · ESC
                </button>
            </div>

            <div className="ic-stage">
                <div className="ic-eyebrow">
                    § INTERMISSION &nbsp;·&nbsp; <b>{Math.ceil(durationSec / 60)} MIN BREAK</b> &nbsp;·&nbsp;{' '}
                    <em>STAY CLOSE</em>
                </div>

                <div className="ic-vinyl-stage" aria-hidden="true">
                    <div className="ic-vinyl">
                        <div className="ic-face ic-face-a">
                            <div className="ic-label ic-label-a">
                                <span className="ic-label-txt">
                                    <em>Side A</em>
                                    <small>33⅓ RPM</small>
                                </span>
                            </div>
                        </div>
                        <div className="ic-face ic-face-b">
                            <div className="ic-label ic-label-b">
                                <span className="ic-label-txt">
                                    <em>Side B</em>
                                    <small>33⅓ RPM</small>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ic-title-block">
                    <h1 className="ic-title">
                        Flip to <em>Side B</em>
                    </h1>
                    <div className="ic-title-rule" aria-hidden="true" />
                    <p className="ic-sub">
                        中場休息 · 還有{' '}
                        <span className={`ic-cd ${isLow ? 'is-low' : ''}`}>
                            00:{String(secs).padStart(2, '0')}
                        </span>
                    </p>
                </div>
                <div className="ic-spacer" />
            </div>

            <div className="ic-marquee" aria-hidden="true">
                <div className="ic-marquee-track">
                    <span>
                        補水時間 <i>★</i> 上洗手間 <i>★</i> 點下半場想聽的歌 <i>★</i> SIDE B OPENS SHORTLY <i>★</i>{' '}
                        喝口水深呼吸 <i>★</i> 投票還沒結束 <i>★</i> NEXT UP · 下半場 <i>★</i>
                    </span>
                    <span aria-hidden="true">
                        補水時間 <i>★</i> 上洗手間 <i>★</i> 點下半場想聽的歌 <i>★</i> SIDE B OPENS SHORTLY <i>★</i>{' '}
                        喝口水深呼吸 <i>★</i> 投票還沒結束 <i>★</i> NEXT UP · 下半場 <i>★</i>
                    </span>
                </div>
            </div>

            <div className="ic-progress" aria-hidden="true">
                <span style={{ transform: `scaleX(${progress.toFixed(4)})` }} />
            </div>
        </div>
    );
}

export default IntermissionCurtain;
