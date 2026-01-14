// error-handler 工具函式單元測試
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    handleFirestoreError,
    isPermissionError,
    isNetworkError,
    withRetry,
} from './error-handler';

// Mock firebase/app 模組
vi.mock('firebase/app', () => {
    class MockFirebaseError extends Error {
        code: string;
        customData?: Record<string, unknown>;

        constructor(code: string, message: string = 'Test error') {
            super(message);
            this.name = 'FirebaseError';
            this.code = code;
        }
    }

    return {
        FirebaseError: MockFirebaseError,
    };
});

// 動態 import 以取得 mock 版本
import { FirebaseError } from 'firebase/app';

// 工廠函式
function createFirebaseError(code: string, message: string = 'Test error') {
    return new FirebaseError(code, message);
}

describe('handleFirestoreError', () => {
    describe('FirebaseError 處理', () => {
        it('應該返回權限被拒絕的中文訊息', () => {
            const error = createFirebaseError('firestore/permission-denied');
            expect(handleFirestoreError(error)).toBe('您沒有權限執行此操作');
        });

        it('應該返回未認證的中文訊息', () => {
            const error = createFirebaseError('firestore/unauthenticated');
            expect(handleFirestoreError(error)).toBe('請先登入後再試');
        });

        it('應該返回找不到資源的中文訊息', () => {
            const error = createFirebaseError('firestore/not-found');
            expect(handleFirestoreError(error)).toBe('找不到請求的資源');
        });

        it('應該返回伺服器無法使用的中文訊息', () => {
            const error = createFirebaseError('firestore/unavailable');
            expect(handleFirestoreError(error)).toBe('伺服器暫時無法使用，請稍後再試');
        });

        it('應該返回請求超時的中文訊息', () => {
            const error = createFirebaseError('firestore/deadline-exceeded');
            expect(handleFirestoreError(error)).toBe('請求超時，請檢查網路連線');
        });

        it('未知錯誤碼應該返回預設訊息', () => {
            const error = createFirebaseError('firestore/some-unknown-code');
            expect(handleFirestoreError(error)).toBe('發生未知錯誤，請稍後再試');
        });
    });

    describe('一般 Error 處理', () => {
        it('應該返回 Error 的 message', () => {
            const error = new Error('這是一個測試錯誤');
            expect(handleFirestoreError(error)).toBe('這是一個測試錯誤');
        });
    });

    describe('其他類型錯誤', () => {
        it('字串錯誤應該返回預設訊息', () => {
            expect(handleFirestoreError('string error')).toBe('發生未知錯誤');
        });

        it('null 應該返回預設訊息', () => {
            expect(handleFirestoreError(null)).toBe('發生未知錯誤');
        });

        it('undefined 應該返回預設訊息', () => {
            expect(handleFirestoreError(undefined)).toBe('發生未知錯誤');
        });
    });
});

describe('isPermissionError', () => {
    it('permission-denied 應該返回 true', () => {
        const error = createFirebaseError('firestore/permission-denied');
        expect(isPermissionError(error)).toBe(true);
    });

    it('unauthenticated 應該返回 true', () => {
        const error = createFirebaseError('firestore/unauthenticated');
        expect(isPermissionError(error)).toBe(true);
    });

    it('其他錯誤碼應該返回 false', () => {
        const error = createFirebaseError('firestore/not-found');
        expect(isPermissionError(error)).toBe(false);
    });

    it('非 FirebaseError 應該返回 false', () => {
        const error = new Error('一般錯誤');
        expect(isPermissionError(error)).toBe(false);
    });
});

describe('isNetworkError', () => {
    it('unavailable 應該返回 true', () => {
        const error = createFirebaseError('firestore/unavailable');
        expect(isNetworkError(error)).toBe(true);
    });

    it('deadline-exceeded 應該返回 true', () => {
        const error = createFirebaseError('firestore/deadline-exceeded');
        expect(isNetworkError(error)).toBe(true);
    });

    it('權限錯誤應該返回 false', () => {
        const error = createFirebaseError('firestore/permission-denied');
        expect(isNetworkError(error)).toBe(false);
    });

    it('非 FirebaseError 應該返回 false', () => {
        const error = new Error('一般錯誤');
        expect(isNetworkError(error)).toBe(false);
    });
});

describe('withRetry', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('成功時應該直接返回結果', async () => {
        const operation = vi.fn().mockResolvedValue('success');

        const result = await withRetry(operation);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('網路錯誤時應該重試', async () => {
        const networkError = createFirebaseError('firestore/unavailable');
        const operation = vi.fn()
            .mockRejectedValueOnce(networkError)
            .mockRejectedValueOnce(networkError)
            .mockResolvedValueOnce('success after retry');

        const promise = withRetry(operation, 3, 100);

        // 快進時間讓重試執行
        await vi.advanceTimersByTimeAsync(100); // 第一次重試
        await vi.advanceTimersByTimeAsync(200); // 第二次重試

        const result = await promise;

        expect(result).toBe('success after retry');
        expect(operation).toHaveBeenCalledTimes(3);
    });

    it('非網路錯誤不應該重試', async () => {
        const permissionError = createFirebaseError('firestore/permission-denied');
        const operation = vi.fn().mockRejectedValue(permissionError);

        await expect(withRetry(operation)).rejects.toThrow();
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('超過最大重試次數應該拋出錯誤', async () => {
        const networkError = createFirebaseError('firestore/unavailable');
        const operation = vi.fn().mockRejectedValue(networkError);

        const promise = withRetry(operation, 2, 100);

        // 快進所有重試時間
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(200);

        await expect(promise).rejects.toThrow();
        expect(operation).toHaveBeenCalledTimes(2);
    });
});
