import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMock = vi.hoisted(() => {
    const commits: Array<ReturnType<typeof vi.fn>> = [];

    return {
        commits,
        collection: vi.fn((_db, name: string) => ({ name })),
        doc: vi.fn(),
        getDocs: vi.fn(),
        addDoc: vi.fn(),
        updateDoc: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        onSnapshot: vi.fn(),
        writeBatch: vi.fn(() => {
            const batch = {
                delete: vi.fn(),
                commit: vi.fn().mockResolvedValue(undefined),
            };
            commits.push(batch.commit);
            return batch;
        }),
        Timestamp: { now: vi.fn(() => ({ seconds: 1, nanoseconds: 0 })) },
    };
});

vi.mock('firebase/firestore', () => firestoreMock);

vi.mock('../firebase', () => ({
    db: { app: 'mock-db' },
    COLLECTIONS: {
        songs: 'songs',
        votes: 'votes',
        playedSongs: 'playedSongs',
        nowPlaying: 'nowPlaying',
    },
}));

describe('resetAllVotes', () => {
    beforeEach(() => {
        firestoreMock.commits.length = 0;
        vi.clearAllMocks();
    });

    it('沒有投票紀錄時立即回傳 0 且不建立 batch', async () => {
        firestoreMock.getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
        const { resetAllVotes } = await import('./songs');

        await expect(resetAllVotes()).resolves.toBe(0);
        expect(firestoreMock.writeBatch).not.toHaveBeenCalled();
    });

    it('大量投票紀錄會分批刪除，避免一次送出過多 promise', async () => {
        const docs = Array.from({ length: 901 }, (_, index) => ({ ref: { id: `vote-${index}` } }));
        firestoreMock.getDocs.mockResolvedValueOnce({ empty: false, docs });
        const { resetAllVotes } = await import('./songs');

        await expect(resetAllVotes()).resolves.toBe(901);
        expect(firestoreMock.writeBatch).toHaveBeenCalledTimes(3);
        expect(firestoreMock.commits).toHaveLength(3);
        firestoreMock.commits.forEach((commit) => expect(commit).toHaveBeenCalledTimes(1));
    });
});
