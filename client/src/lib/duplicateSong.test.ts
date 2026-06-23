import { describe, it, expect } from 'vitest';
import { normalizeTitle, titleSimilarity, findDuplicateSong } from './duplicateSong';
import type { Song } from '@/lib/firestore';

const song = (title: string, artist = '', extra: Partial<Song> = {}): Song =>
    ({ id: title, title, artist, voteCount: 0, ...extra } as Song);

describe('normalizeTitle', () => {
    it('去除大小寫、空白與標點', () => {
        expect(normalizeTitle('  Yes, Sir!  ')).toBe('yessir');
        expect(normalizeTitle('再見。')).toBe('再見');
    });

    it('去除括號與其內容', () => {
        expect(normalizeTitle('演員 (Live)')).toBe('演員');
        expect(normalizeTitle('小幸運 (電影我的少女時代主題曲)')).toBe('小幸運');
        expect(normalizeTitle('告白氣球【伴奏】')).toBe('告白氣球');
    });
});

describe('titleSimilarity', () => {
    it('完全相同為 1', () => {
        expect(titleSimilarity('再見', '再見')).toBe(1);
    });

    it('短歌名與包含它的長歌名相似度低', () => {
        // 「再見」vs「再見的時候」不應算高度相似
        expect(titleSimilarity('再見', '再見的時候')).toBeLessThan(0.8);
    });

    it('完全不同為 0', () => {
        expect(titleSimilarity('童話', 'yesterday')).toBe(0);
    });
});

describe('findDuplicateSong', () => {
    const songs = [
        song('再見', '張震嶽'),
        song('演員', '薛之謙'),
        song('小幸運', '田馥甄'),
    ];

    it('回報主要 bug：「再見的時候」不應被「再見」誤判為重複', () => {
        expect(findDuplicateSong('再見的時候', '', songs)).toBeNull();
    });

    it('標準化後完全相同 → exact', () => {
        const m = findDuplicateSong('再見', '', songs);
        expect(m?.matchType).toBe('exact');
        expect(m?.song.title).toBe('再見');
    });

    it('忽略大小寫/空白/括號的完全相同 → exact', () => {
        const m = findDuplicateSong('  演員 (Live) ', '', songs);
        expect(m?.matchType).toBe('exact');
        expect(m?.song.title).toBe('演員');
    });

    it('歌名相同且歌手相符 → exact', () => {
        const m = findDuplicateSong('再見', '張震嶽', songs);
        expect(m?.matchType).toBe('exact');
    });

    it('空白輸入或空歌單回 null', () => {
        expect(findDuplicateSong('', '', songs)).toBeNull();
        expect(findDuplicateSong('再見', '', [])).toBeNull();
    });

    it('不同的歌不誤判', () => {
        expect(findDuplicateSong('我願意為你', '', songs)).toBeNull();
        expect(findDuplicateSong('演員的自我修養', '', songs)).toBeNull();
    });
});
