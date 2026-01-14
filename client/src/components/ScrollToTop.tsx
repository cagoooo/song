// 返回頂部按鈕元件
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
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
                <motion.div
                    className="fixed z-50"
                    style={{ bottom: `${bottom}px`, right: `${right}px` }}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    <Button
                        onClick={scrollToTop}
                        size="icon"
                        className="w-12 h-12 rounded-full shadow-lg 
                            bg-gradient-to-br from-primary/90 to-primary
                            hover:from-primary hover:to-primary/90
                            border-2 border-primary/20
                            transition-all duration-300
                            hover:shadow-xl hover:scale-105
                            active:scale-95"
                        aria-label="返回頂部"
                    >
                        <ChevronUp className="w-6 h-6 text-white" />
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ScrollToTop;
