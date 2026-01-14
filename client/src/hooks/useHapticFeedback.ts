// 觸覺回饋 Hook
import { useCallback } from 'react';

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface HapticPatterns {
    light: number;
    medium: number;
    heavy: number;
    success: number[];
    warning: number[];
    error: number[];
}

const patterns: HapticPatterns = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [10, 50, 10],
    warning: [30, 50, 30],
    error: [50, 30, 50, 30, 50],
};

/**
 * 觸覺回饋 Hook
 * 提供不同模式的震動反饋，增強觸控體驗
 * 
 * @example
 * const { trigger, isSupported } = useHapticFeedback();
 * 
 * // 輕微震動
 * trigger('light');
 * 
 * // 成功反饋
 * trigger('success');
 */
export function useHapticFeedback() {
    const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

    const trigger = useCallback((pattern: HapticPattern = 'light') => {
        if (!isSupported) return false;

        try {
            const vibrationPattern = patterns[pattern];
            navigator.vibrate(vibrationPattern);
            return true;
        } catch {
            return false;
        }
    }, [isSupported]);

    // 快捷方法
    const light = useCallback(() => trigger('light'), [trigger]);
    const medium = useCallback(() => trigger('medium'), [trigger]);
    const heavy = useCallback(() => trigger('heavy'), [trigger]);
    const success = useCallback(() => trigger('success'), [trigger]);
    const warning = useCallback(() => trigger('warning'), [trigger]);
    const error = useCallback(() => trigger('error'), [trigger]);

    return {
        trigger,
        isSupported,
        light,
        medium,
        heavy,
        success,
        warning,
        error,
    };
}

export default useHapticFeedback;
