// 返回頂部按鈕元件
import { useState, useEffect, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrollToTopProps {
    threshold?: number;
    bottom?: number;
    right?: number;
}

export function ScrollToTop({
    threshold = 300,
    bottom = 20,
    right = 20,
}: ScrollToTopProps) {
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
                    className="fixed z-50 w-12 h-12 rounded-full 
                        bg-gradient-to-br from-amber-500 to-orange-500
                        hover:from-amber-400 hover:to-orange-400
                        shadow-lg shadow-amber-500/30
                        hover:shadow-xl hover:shadow-amber-500/40
                        border-2 border-white/20
                        flex items-center justify-center
                        transition-all duration-200
                        hover:scale-110 active:scale-95
                        cursor-pointer"
                    style={{ bottom: `${bottom}px`, right: `${right}px` }}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    onClick={scrollToTop}
                    aria-label="返回頂部"
                >
                    <ArrowUp className="w-5 h-5 text-white" strokeWidth={2.5} />
                </motion.button>
            )}
        </AnimatePresence>
    );
}

export default ScrollToTop;
