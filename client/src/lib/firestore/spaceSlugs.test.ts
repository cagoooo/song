import { describe, expect, it, vi, beforeEach } from 'vitest';

const firestoreMock = vi.hoisted(() => {
    const store = new Map<string, Record<string, unknown>>();
    return {
        store,
        doc: vi.fn((_db, ...segments: string[]) => ({ path: segments.join('/') })),
        getDoc: vi.fn(async (ref: { path: string }) => ({
            exists: () => store.has(ref.path),
            data: () => store.get(ref.path),
        })),
        runTransaction: vi.fn(async (_db, updater) => {
            const tx = {
                get: async (ref: { path: string }) => ({
                    exists: () => store.has(ref.path),
                    data: () => store.get(ref.path),
                }),
                set: (ref: { path: string }, data: Record<string, unknown>) => { store.set(ref.path, data); },
                update: (ref: { path: string }, data: Record<string, unknown>) => {
                    store.set(ref.path, { ...(store.get(ref.path) ?? {}), ...data });
                },
                delete: (ref: { path: string }) => { store.delete(ref.path); },
            };
            return updater(tx);
        }),
    };
});
vi.mock('firebase/firestore', () => firestoreMock);
vi.mock('../firebase', () => ({ db: {}, COLLECTIONS: { users: 'users' } }));

import { claimSpaceSlug, releaseSpaceSlug, getSpaceSlug } from './spaceSlugs';

describe('claimSpaceSlug / releaseSpaceSlug / getSpaceSlug', () => {
    beforeEach(() => {
        firestoreMock.store.clear();
    });

    it('第一次佔用 slug 會同時寫 spaceSlugs 對照表與 users.slug', async () => {
        await claimSpaceSlug('uid-1', 'my-band');
        expect(firestoreMock.store.get('spaceSlugs/my-band')).toEqual({ uid: 'uid-1' });
        expect(await getSpaceSlug('uid-1')).toBe('my-band');
    });

    it('slug 已被別人佔用時丟錯，不覆寫', async () => {
        await claimSpaceSlug('uid-1', 'taken');
        await expect(claimSpaceSlug('uid-2', 'taken')).rejects.toThrow('已經有人使用');
    });

    it('換 slug 會釋放舊代碼', async () => {
        await claimSpaceSlug('uid-1', 'old-name');
        await claimSpaceSlug('uid-1', 'new-name');
        expect(firestoreMock.store.has('spaceSlugs/old-name')).toBe(false);
        expect(firestoreMock.store.get('spaceSlugs/new-name')).toEqual({ uid: 'uid-1' });
        expect(await getSpaceSlug('uid-1')).toBe('new-name');
    });

    it('格式不合法（大寫 / 太短）直接丟錯，不進 transaction', async () => {
        await expect(claimSpaceSlug('uid-1', 'AB')).rejects.toThrow('3-32 碼');
    });

    it('清除 slug 會刪掉對照表並把 users.slug 設回 null', async () => {
        await claimSpaceSlug('uid-1', 'my-band');
        await releaseSpaceSlug('uid-1');
        expect(firestoreMock.store.has('spaceSlugs/my-band')).toBe(false);
        expect(await getSpaceSlug('uid-1')).toBe(null);
    });

    it('自己重新佔用同一個 slug 不會被當成「已被佔用」擋下', async () => {
        await claimSpaceSlug('uid-1', 'my-band');
        await expect(claimSpaceSlug('uid-1', 'my-band')).resolves.toBeUndefined();
    });
});
