import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CassetteScrews } from './CassetteShell';

interface ScrollToTopProps {
    threshold?: number;
}

export function ScrollToTop({ threshold = 300 }: ScrollToTopProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            setIsVisible(scrollY > threshold);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, [threshold]);

    const scrollToTop = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if ('vibrate' in navigator) navigator.vibrate(10);
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    type="button"
                    className="editorial-scrolltop"
                    initial={{ opacity: 0, scale: 0.85, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 16 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onClick={scrollToTop}
                    aria-label="返回頂部"
                >
                    <CassetteScrews />

                    {/* 雙轉軸 + 磁帶 */}
                    <span className="est-reels" aria-hidden="true">
                        <i className="est-reel" />
                        <span className="est-tape" />
                        <i className="est-reel" />
                    </span>

                    {/* 動作標籤 */}
                    <span className="est-action">
                        <ArrowUp className="est-arrow" strokeWidth={3} aria-hidden="true" />
                        <span className="est-label">TOP</span>
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
}

export default ScrollToTop;
