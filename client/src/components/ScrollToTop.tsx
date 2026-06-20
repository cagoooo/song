// 返回頂部按鈕 — 卡帶設計風（mini cassette）
import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrollToTopProps {
    threshold?: number;
    /** 是否堆疊於「管理員登入」按鈕上方，避免兩顆浮動按鈕重疊 */
    stacked?: boolean;
}

export function ScrollToTop({ threshold = 300, stacked = false }: ScrollToTopProps) {
    const [isVisible, setIsVisible] = useState(false);

    // 監聽滾動事件
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            setIsVisible(scrollY > threshold);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // 初始檢查

        return () => window.removeEventListener('scroll', handleScroll);
    }, [threshold]);

    // 滾動到頂部
    const scrollToTop = useCallback(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        // 觸覺回饋
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }, []);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.button
                    type="button"
                    className={`editorial-scrolltop${stacked ? ' is-stacked' : ''}`}
                    initial={{ opacity: 0, scale: 0.85, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 16 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onClick={scrollToTop}
                    aria-label="返回頂部"
                >
                    {/* 卡帶外殼四角螺絲 */}
                    <span className="est-screw tl" aria-hidden="true" />
                    <span className="est-screw tr" aria-hidden="true" />
                    <span className="est-screw bl" aria-hidden="true" />
                    <span className="est-screw br" aria-hidden="true" />

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
