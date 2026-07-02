import { describe, expect, it, vi, beforeEach } from 'vitest';

const firestoreMock = vi.hoisted(() => {
    class FakeTimestamp {
        toDate() { return new Date('2026-07-02'); }
        static now() { return new FakeTimestamp(); }
    }
    let currentData: Record<string, unknown> | undefined;
    let listener: ((snap: unknown) => void) | null = null;
    return {
        Timestamp: FakeTimestamp,
        setCurrentData: (d: Record<string, unknown> | undefined) => { currentData = d; },
        getCurrentData: () => currentData,
        onSnapshot: vi.fn((_ref, onNext: (snap: unknown) => void) => {
            listener = onNext;
            onNext({ data: () => currentData });
            return vi.fn();
        }),
        setDoc: vi.fn(async (_ref, data: Record<string, unknown>) => {
            currentData = { ...currentData, ...data };
            listener?.({ data: () => currentData });
        }),
    };
});
vi.mock('firebase/firestore', () => firestoreMock);
vi.mock('../firebase', () => ({
    docRef: vi.fn((name: string, id: string) => ({ path: `${name}/${id}` })),
    COLLECTIONS: { settings: 'settings' },
}));

import { subscribeSpaceBranding, updateSpaceName, SPACE_NAME_MAX_LENGTH } from './branding';

describe('branding', () => {
    beforeEach(() => {
        firestoreMock.setCurrentData(undefined);
    });

    it('沒有設定過時回傳預設值（spaceName: null）', () => {
        const cb = vi.fn();
        subscribeSpaceBranding(cb);
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ spaceName: null }));
    });

    it('updateSpaceName 寫入後 subscribe 收到新名稱', async () => {
        await updateSpaceName('小明的音樂夜');
        const cb = vi.fn();
        subscribeSpaceBranding(cb);
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ spaceName: '小明的音樂夜' }));
    });

    it('傳空字串 / 空白字串會清除自訂名稱（回 null）', async () => {
        await updateSpaceName('小明的音樂夜');
        await updateSpaceName('   ');
        const cb = vi.fn();
        subscribeSpaceBranding(cb);
        expect(cb).toHaveBeenCalledWith(expect.objectContaining({ spaceName: null }));
    });

    it('超過長度上限會丟錯，不寫入', async () => {
        await expect(updateSpaceName('a'.repeat(SPACE_NAME_MAX_LENGTH + 1)))
            .rejects.toThrow(`最長 ${SPACE_NAME_MAX_LENGTH} 字`);
    });
});
