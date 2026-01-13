// Firebase Performance 效能監控工具
import { getPerformance, trace } from 'firebase/performance';
import { app } from './firebase';

// 延遲初始化，避免影響首次載入
let perfInitialized = false;
let perf: ReturnType<typeof getPerformance> | null = null;

function initPerformance() {
    if (perfInitialized) return perf;

    try {
        perf = getPerformance(app);
        perfInitialized = true;

        if (import.meta.env.DEV) {
            console.log('[Performance] Firebase Performance 已初始化');
        }
    } catch (error) {
        console.warn('[Performance] 初始化失敗:', error);
    }

    return perf;
}

/**
 * 建立自訂效能追蹤
 */
export function createTrace(name: string) {
    const performance = initPerformance();
    if (!performance) return null;

    try {
        return trace(performance, name);
    } catch (error) {
        console.warn(`[Performance] 無法建立追蹤 "${name}":`, error);
        return null;
    }
}

/**
 * 追蹤頁面載入
 */
export function trackPageLoad(pageName: string) {
    const pageTrace = createTrace(`page_load_${pageName}`);
    if (!pageTrace) return;

    pageTrace.start();

    // 當頁面完全載入時停止追蹤
    if (document.readyState === 'complete') {
        pageTrace.stop();
    } else {
        window.addEventListener('load', () => {
            pageTrace.stop();
        }, { once: true });
    }
}

/**
 * 追蹤 API 呼叫
 */
export async function trackApiCall<T>(
    name: string,
    fn: () => Promise<T>
): Promise<T> {
    const apiTrace = createTrace(`api_${name}`);

    if (!apiTrace) {
        return fn();
    }

    apiTrace.start();

    try {
        const result = await fn();
        apiTrace.putAttribute('status', 'success');
        return result;
    } catch (error) {
        apiTrace.putAttribute('status', 'error');
        throw error;
    } finally {
        apiTrace.stop();
    }
}

/**
 * 追蹤使用者操作
 */
export function trackUserAction(action: string) {
    const actionTrace = createTrace(`action_${action}`);
    if (!actionTrace) return { stop: () => { } };

    actionTrace.start();

    return {
        stop: (attributes?: Record<string, string>) => {
            if (attributes) {
                Object.entries(attributes).forEach(([key, value]) => {
                    actionTrace.putAttribute(key, value);
                });
            }
            actionTrace.stop();
        }
    };
}

/**
 * 初始化效能監控（在 main.tsx 中呼叫）
 */
export function initPerformanceMonitoring() {
    initPerformance();

    // 追蹤首頁載入
    trackPageLoad('home');

    if (import.meta.env.DEV) {
        console.log('[Performance] 效能監控已啟動');
    }
}
