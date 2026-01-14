// 全局動態減少動畫 Hook
// 檢測使用者是否偏好減少動畫，並在手機裝置上自動啟用
import { useState, useEffect } from 'react';

export interface ReduceMotionOptions {
    /** 是否在手機裝置上也減少動畫 (預設: true) */
    reduceOnMobile?: boolean;
    /** 手機螢幕寬度閾值 (預設: 768px) */
    mobileBreakpoint?: number;
}

/**
 * 檢測是否應該減少動畫效果
 * 
 * 依據以下條件決定：
 * 1. 使用者的系統設定 `prefers-reduced-motion: reduce`
 * 2. 是否為手機裝置（可選）
 * 
 * @example
 * ```tsx
 * const reduceMotion = useReduceMotion();
 * 
 * return (
 *   <motion.div
 *     animate={reduceMotion ? {} : { scale: [1, 1.1, 1] }}
 *     transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}
 *   />
 * );
 * ```
 */
export function useReduceMotion(options: ReduceMotionOptions = {}): boolean {
    const { reduceOnMobile = true, mobileBreakpoint = 768 } = options;

    const [shouldReduceMotion, setShouldReduceMotion] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isMobile = reduceOnMobile && window.innerWidth < mobileBreakpoint;

        return prefersReducedMotion || isMobile;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 監聽系統動畫偏好設定變化
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleChange = () => {
            const prefersReducedMotion = mediaQuery.matches;
            const isMobile = reduceOnMobile && window.innerWidth < mobileBreakpoint;
            setShouldReduceMotion(prefersReducedMotion || isMobile);
        };

        // 監聽視窗大小變化（用於手機判斷）
        const handleResize = () => {
            const isMobile = reduceOnMobile && window.innerWidth < mobileBreakpoint;
            const prefersReducedMotion = mediaQuery.matches;
            setShouldReduceMotion(prefersReducedMotion || isMobile);
        };

        // 添加事件監聽器
        mediaQuery.addEventListener('change', handleChange);
        if (reduceOnMobile) {
            window.addEventListener('resize', handleResize);
        }

        // 清理函數
        return () => {
            mediaQuery.removeEventListener('change', handleChange);
            if (reduceOnMobile) {
                window.removeEventListener('resize', handleResize);
            }
        };
    }, [reduceOnMobile, mobileBreakpoint]);

    return shouldReduceMotion;
}

export default useReduceMotion;
