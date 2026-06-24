// 開場儀式 · Opening Curtain — 6 秒鏡像反向 thank-you 動畫
// 對應原型：Downloads/.../opening-curtain.html
import { useEffect, useRef } from 'react';

interface OpeningCurtainProps {
    isOpen: boolean;
    onClose: () => void;
    songCount?: number;
}

const TOTAL_MS = 6000;

export function OpeningCurtain({ isOpen, onClose, songCount }: OpeningCurtainProps) {
    const closeTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const reduced = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        // reduce-motion 直接 1s 後關閉（不放動畫）
        const closeAt = reduced ? 1000 : TOTAL_MS;
        closeTimerRef.current = window.setTimeout(onClose, closeAt);

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);

        return () => {
            if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
            window.removeEventListener('keydown', onKey);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const subtitle = songCount && songCount > 0
        ? `Side A · ${songCount} 首歌 · 一起點播`
        : 'Side A · 一起點播';

    return (
        <div
            className="oc-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="演出開場儀式"
        >
            {/* 頂部進度條 — 6s 倒數 */}
            <div className="oc-progress" aria-hidden="true">
                <span />
            </div>

            {/* 頂條 OPENING · LIVE */}
            <div className="oc-topbar" aria-hidden="true">
                <span className="oc-topbar-l">Nº 12 · OPENING</span>
                <span className="oc-topbar-c">吉他彈唱之夜</span>
                <span className="oc-topbar-r">
                    LIVE <span className="oc-live-dot" />
                </span>
            </div>

            {/* 黑膠 + 唱針 + 漣漪 */}
            <div className="oc-stage" aria-hidden="true">
                <div className="oc-vinyl-stage">
                    <div className="oc-vinyl">
                        <span className="oc-vinyl-label" />
                        <span className="oc-vinyl-hole" />
                    </div>
                </div>
                <div className="oc-tonearm">
                    <span className="oc-tonearm-base" />
                    <span className="oc-tonearm-arm" />
                    <span className="oc-tonearm-needle" />
                </div>
                <div className="oc-ripple" />
            </div>

            {/* 主標 */}
            <h1 className="oc-title">
                今晚開始 ·{' '}
                <span className="oc-title-live">
                    LIVE
                    <span className="oc-title-underline" />
                </span>
            </h1>

            {/* 副標 */}
            <p className="oc-sub">{subtitle}</p>

            {/* 米色跑馬燈 */}
            <div className="oc-ticker" aria-hidden="true">
                <div className="oc-ticker-track">
                    {Array.from({ length: 2 }).flatMap((_, dup) => [
                        '★ 吉他彈唱之夜 · SIDE A',
                        '★ 33⅓ RPM · LIVE',
                        '★ 點歌不停 · 投票即催歌',
                        '★ Nº 12 · 桃園 SMES',
                        '★ 你準備好了嗎',
                    ].map((t, i) => (
                        <span key={`${dup}-${i}`} className="oc-ticker-item">{t}</span>
                    )))}
                </div>
            </div>

            {/* 跳過儀式 */}
            <button
                type="button"
                className="oc-skip"
                onClick={onClose}
                aria-label="跳過開場儀式"
            >
                跳過儀式 <span aria-hidden="true">→</span>
            </button>
        </div>
    );
}

export default OpeningCurtain;
