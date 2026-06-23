import { describe, it, expect, beforeEach } from 'vitest';
import {
    enqueuePendingSuggestion,
    listPendingSuggestions,
    removePendingSuggestion,
    pendingSuggestionCount,
    subscribePendingSuggestions,
    type PendingSuggestion,
} from './pendingSuggestions';

const item = (id: string): PendingSuggestion => ({
    id,
    title: `歌 ${id}`,
    artist: '某人',
    suggestedBy: null,
    notes: null,
    createdAtMs: 1000,
});

describe('pendingSuggestions', () => {
    beforeEach(() => localStorage.clear());

    it('enqueue 後可列出且計數正確', () => {
        enqueuePendingSuggestion(item('a'));
        enqueuePendingSuggestion(item('b'));
        expect(pendingSuggestionCount()).toBe(2);
        expect(listPendingSuggestions().map((p) => p.id)).toEqual(['a', 'b']);
    });

    it('同 id 重複 enqueue 視為覆蓋，不重複', () => {
        enqueuePendingSuggestion(item('a'));
        enqueuePendingSuggestion({ ...item('a'), title: '改名' });
        expect(pendingSuggestionCount()).toBe(1);
        expect(listPendingSuggestions()[0].title).toBe('改名');
    });

    it('remove 後消失，清空回 0', () => {
        enqueuePendingSuggestion(item('a'));
        enqueuePendingSuggestion(item('b'));
        removePendingSuggestion('a');
        expect(listPendingSuggestions().map((p) => p.id)).toEqual(['b']);
        removePendingSuggestion('b');
        expect(pendingSuggestionCount()).toBe(0);
    });

    it('壞掉的 localStorage 內容回空陣列不丟例外', () => {
        localStorage.setItem('pending-suggestions-v1', '{not json');
        expect(listPendingSuggestions()).toEqual([]);
        expect(pendingSuggestionCount()).toBe(0);
    });

    it('訂閱會在變動時收到通知', () => {
        let hits = 0;
        const unsub = subscribePendingSuggestions(() => { hits += 1; });
        enqueuePendingSuggestion(item('a'));
        removePendingSuggestion('a');
        unsub();
        enqueuePendingSuggestion(item('b'));
        expect(hits).toBe(2);
    });
});
