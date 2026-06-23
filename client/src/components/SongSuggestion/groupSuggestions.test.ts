import { describe, it, expect } from 'vitest';
import { groupSimilarSuggestions } from './groupSuggestions';
import type { SongSuggestion } from '@/lib/firestore';

const s = (id: string, title: string, upvotes = 0): SongSuggestion =>
    ({ id, title, artist: '', status: 'pending', createdAt: new Date(), upvotes } as SongSuggestion);

describe('groupSimilarSuggestions', () => {
    it('把標準化後相同的標題分到同一組並合計票數', () => {
        const groups = groupSimilarSuggestions([
            s('a', '演員', 2),
            s('b', '演員 (Live)', 3),
            s('c', '童話', 1),
        ]);
        expect(groups).toHaveLength(1);
        expect(groups[0].items.map((x) => x.id).sort()).toEqual(['a', 'b']);
        expect(groups[0].totalUpvotes).toBe(5);
    });

    it('不相似的不會被分在一起（再見的時候 ≠ 再見）', () => {
        const groups = groupSimilarSuggestions([
            s('a', '再見'),
            s('b', '再見的時候'),
        ]);
        expect(groups).toHaveLength(0); // 各自一組、皆 <2 → 不回傳
    });

    it('只回傳 2 筆以上的群組，且依組員數遞減', () => {
        const groups = groupSimilarSuggestions([
            s('a', '小幸運'),
            s('b', '小幸運'),
            s('c', '小幸運'),
            s('d', '演員'),
            s('e', '演員'),
            s('f', '獨一無二'),
        ]);
        expect(groups.map((g) => g.items.length)).toEqual([3, 2]);
        expect(groups[0].title).toBe('小幸運');
    });

    it('空輸入回空陣列', () => {
        expect(groupSimilarSuggestions([])).toEqual([]);
    });
});
