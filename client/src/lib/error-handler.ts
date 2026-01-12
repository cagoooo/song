// Firestore 錯誤處理工具
import { FirebaseError } from 'firebase/app';

// 錯誤訊息映射表
const errorMessages: Record<string, string> = {
    // 權限相關
    'permission-denied': '您沒有權限執行此操作',
    'unauthenticated': '請先登入後再試',

    // 資源相關
    'not-found': '找不到請求的資源',
    'already-exists': '此項目已存在',

    // 網路相關
    'unavailable': '伺服器暫時無法使用，請稍後再試',
    'deadline-exceeded': '請求超時，請檢查網路連線',
    'cancelled': '操作已取消',

    // 資料相關
    'invalid-argument': '輸入的資料格式不正確',
    'out-of-range': '數值超出允許範圍',
    'failed-precondition': '無法執行此操作，請確認操作條件',

    // 系統相關
    'resource-exhausted': '系統資源不足，請稍後再試',
    'internal': '系統內部錯誤，請聯繫管理員',
    'unimplemented': '此功能尚未實作',
    'data-loss': '資料遺失，請聯繫管理員',
    'unknown': '發生未知錯誤，請稍後再試',
};

/**
 * 將 Firebase 錯誤代碼轉換為使用者友善的中文訊息
 */
export function handleFirestoreError(error: unknown): string {
    if (error instanceof FirebaseError) {
        // 移除 'firestore/' 前綴
        const code = error.code.replace('firestore/', '');
        return errorMessages[code] || errorMessages['unknown'];
    }

    if (error instanceof Error) {
        return error.message;
    }

    return '發生未知錯誤';
}

/**
 * 檢查是否為權限錯誤
 */
export function isPermissionError(error: unknown): boolean {
    if (error instanceof FirebaseError) {
        return error.code.includes('permission-denied') ||
            error.code.includes('unauthenticated');
    }
    return false;
}

/**
 * 檢查是否為網路錯誤
 */
export function isNetworkError(error: unknown): boolean {
    if (error instanceof FirebaseError) {
        return error.code.includes('unavailable') ||
            error.code.includes('deadline-exceeded');
    }
    return false;
}

/**
 * 建立可重試的操作包裝器
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // 只有網路錯誤才重試
            if (!isNetworkError(error) || attempt === maxRetries) {
                throw error;
            }

            // 指數退避延遲
            await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
    }

    throw lastError;
}
