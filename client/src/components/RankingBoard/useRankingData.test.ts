import { describe, expect, it } from 'vitest';
import type { Song } from '@/lib/firestore';
import { orderRankingSongs } from './useRankingData';

function song(id: string, voteCount: number, options: Partial<Song> = {}): Song {
    return {
        id,
        title: id,
        artist: '歌手',
        voteCount,
        isPlayed: false,
        isNowPlaying: false,
        ...options,
    } as Song;
}

describe('orderRankingSongs', () => {
    it('所有未彈奏歌曲都排在已彈奏歌曲之前', () => {
        const result = orderRankingSongs([
            song('已彈高票', 20, { isPlayed: true }),
            song('未彈零票', 0),
            song('未彈五票', 5),
            song('已彈十票', 10, { isPlayed: true }),
        ], 0.5);

        expect(result.map((item) => item.id)).toEqual([
            '未彈五票',
            '未彈零票',
            '已彈高票',
            '已彈十票',
        ]);
    });

    it('各區段內仍依票數由高到低排列', () => {
        const result = orderRankingSongs([
            song('未彈三票', 3),
            song('已彈一票', 1, { isPlayed: true }),
            song('未彈八票', 8),
            song('已彈九票', 9, { isPlayed: true }),
        ], 0.5);

        expect(result.map((item) => item.id)).toEqual([
            '未彈八票',
            '未彈三票',
            '已彈九票',
            '已彈一票',
        ]);
    });

    it('正在彈奏的歌曲不因短暫帶有已彈奏狀態而沉底', () => {
        const result = orderRankingSongs([
            song('未彈', 2),
            song('正在彈', 6, { isPlayed: true, isNowPlaying: true }),
            song('已彈', 10, { isPlayed: true }),
        ], 0.5);

        expect(result.map((item) => item.id)).toEqual(['正在彈', '未彈', '已彈']);
    });
});
