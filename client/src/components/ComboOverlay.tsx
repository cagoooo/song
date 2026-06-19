import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { getMilestone, type ComboState } from '@/hooks/useComboCounter';

interface ComboOverlayProps {
    combo: ComboState | null;
    /** 搜尋或輸入時降低干擾，不施放彩帶。 */
    suppressConfetti?: boolean;
}

export function ComboOverlay({ combo, suppressConfetti = false }: ComboOverlayProps) {
    const lastConfettiKey = useRef<string>('');
    const milestone = combo ? getMilestone(combo.count) : null;

    useEffect(() => {
        if (!combo || !milestone || suppressConfetti) return;
        const key = `${combo.songId}_${combo.count}`;
        if (lastConfettiKey.current === key) return;
        lastConfettiKey.current = key;

        const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
        confetti({
            particleCount: Math.min(milestone.confettiCount, isSmallScreen ? 28 : 40),
            spread: isSmallScreen ? 46 : 58,
            origin: isSmallScreen ? { x: 0.18, y: 0.72 } : { x: 0.88, y: 0.18 },
            colors: ['#2b4dff', '#ffffff', '#0ea5e9', '#1d4ed8'],
            ticks: 58,
            scalar: combo.count >= 20 ? 1.05 : 0.82,
            shapes: ['circle', 'square'],
            zIndex: 80,
        });
    }, [combo, milestone, suppressConfetti]);

    return (
        <AnimatePresence>
            {combo && milestone && (
                <motion.div
                    key={`${combo.songId}_${combo.count}`}
                    className="combo-compact-toast"
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                >
                    <div className="combo-compact-badge">連發點播</div>
                    <div className="combo-compact-body">
                        <div className="combo-compact-count">x{combo.count}</div>
                        <div className="combo-compact-copy">
                            <div className="combo-compact-title">{combo.songTitle}</div>
                            <div className="combo-compact-sub">
                                {combo.songArtist ? `${combo.songArtist} · ` : ''}已加入熱度
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
