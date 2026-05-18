// getSongDetail 單元測試 — T3 改造後的來源優先序
// 📐 設計文件：docs/design/T3-songdetail-firestore.md

import { describe, it, expect } from 'vitest';
import { getSongDetail, findSimilarSongs } from './data';
import { makeSong } from '@/test/fixtures';

describe('getSongDetail', () => {
    describe('來源優先序：Firestore > legacy > fallback', () => {
        it('完整 Firestore 欄位 → source: firestore', () => {
            const song = makeSong({
                id: 's1',
                title: '晴天',
                songKey: 'C',
                capo: 2,
                bpm: 78,
                length: '04:23',
                progression: ['C', 'G', 'Am', 'Em'],
                lyricBlocks: [
                    { sec: 'VERSE 1', rows: [{ chord: 'C G', line: '故事的小黃花' }] },
                ],
                kaiNote: '副歌前 Em 卡半拍給它',
            });
            const detail = getSongDetail(song);
            expect(detail.source).toBe('firestore');
            expect(detail.key).toBe('C');
            expect(detail.capo).toBe(2);
            expect(detail.bpm).toBe(78);
            expect(detail.length).toBe('04:23');
            expect(detail.progression).toEqual(['C', 'G', 'Am', 'Em']);
            expect(detail.note).toBe('副歌前 Em 卡半拍給它');
        });

        it('只有 meta（無 lyricBlocks） → source: mixed', () => {
            const song = makeSong({
                id: 's2',
                title: 'X',
                songKey: 'G',
                bpm: 100,
            });
            const detail = getSongDetail(song);
            expect(detail.source).toBe('mixed');
            expect(detail.key).toBe('G');
            expect(detail.bpm).toBe(100);
        });

        it('完全空白 → source: fallback + hash 推導', () => {
            const song = makeSong({ id: 'random-id', title: 'Random' });
            const detail = getSongDetail(song);
            expect(detail.source).toBe('fallback');
            // hash-based 值：每次跑都應該相同（同 id → 同值）
            expect(detail.key).toBeDefined();
            expect(detail.bpm).toBeGreaterThanOrEqual(64);
            expect(detail.bpm).toBeLessThanOrEqual(127);
        });

        it('同一首歌 id 兩次呼叫 fallback 值相同（穩定）', () => {
            const song = makeSong({ id: 'stable-id', title: 'S' });
            const a = getSongDetail(song);
            const b = getSongDetail(song);
            expect(a.key).toBe(b.key);
            expect(a.bpm).toBe(b.bpm);
            expect(a.capo).toBe(b.capo);
            expect(a.length).toBe(b.length);
            expect(a.note).toBe(b.note);
        });
    });

    describe('lyricBlocks 來源', () => {
        it('傳入 lyricBlocks → 原樣回傳', () => {
            const lyricBlocks = [
                { sec: 'VERSE 1' as const, rows: [{ chord: 'C', line: '歌詞 A' }] },
                { sec: 'CHORUS' as const, chorus: true, rows: [{ chord: 'G', line: '副歌' }] },
            ];
            const song = makeSong({ id: 's', title: 'T', lyricBlocks });
            const detail = getSongDetail(song);
            expect(detail.lyrics).toEqual(lyricBlocks);
        });

        it('沒 lyricBlocks 但有舊 lyrics 字串 → 轉成 VERSE 1 block', () => {
            const song = makeSong({
                id: 's',
                title: 'T',
                lyrics: '故事的小黃花 從出生那年',
            });
            const detail = getSongDetail(song);
            expect(detail.lyrics.length).toBe(1);
            expect(detail.lyrics[0].sec).toBe('VERSE 1');
            expect(detail.lyrics[0].rows[0].line).toContain('故事的小黃花');
        });

        it('legacy lyrics 太長被截 60 字', () => {
            const longText = 'a'.repeat(100);
            const song = makeSong({ id: 's', title: 'T', lyrics: longText });
            const detail = getSongDetail(song);
            expect(detail.lyrics[0].rows[0].line?.length).toBeLessThanOrEqual(60);
        });

        it('完全沒歌詞 → fallback 3 block 提示「請阿凱補上」', () => {
            const song = makeSong({ id: 's', title: 'T' });
            const detail = getSongDetail(song);
            expect(detail.lyrics.length).toBeGreaterThan(0);
            // fallback 內含「請阿凱老師補上」提示
            const text = detail.lyrics.map((b) => b.rows.map((r) => r.line || '').join(' ')).join(' ');
            expect(text).toContain('請阿凱老師補上');
        });
    });

    describe('和弦進行', () => {
        it('傳入 progression → 直接用', () => {
            const song = makeSong({
                id: 's',
                title: 'T',
                progression: ['Cm', 'Bb', 'Ab', 'G'],
            });
            const detail = getSongDetail(song);
            expect(detail.progression).toEqual(['Cm', 'Bb', 'Ab', 'G']);
        });

        it('空 progression 陣列 → fallback', () => {
            const song = makeSong({ id: 's-empty', title: 'T', progression: [] });
            const detail = getSongDetail(song);
            // fallback 一定有內容
            expect(detail.progression.length).toBeGreaterThan(0);
        });
    });

    describe('範圍限制', () => {
        it('Capo fallback 在 0-4 之間', () => {
            for (let i = 0; i < 20; i++) {
                const song = makeSong({ id: `s-${i}`, title: 'T' });
                const detail = getSongDetail(song);
                expect(detail.capo).toBeGreaterThanOrEqual(0);
                expect(detail.capo).toBeLessThanOrEqual(4);
            }
        });

        it('songKey: 0 (Capo=0 仍合法)', () => {
            const song = makeSong({ id: 's', title: 'T', capo: 0 });
            const detail = getSongDetail(song);
            expect(detail.capo).toBe(0);
        });
    });
});

describe('findSimilarSongs', () => {
    it('沒其他歌 → []', () => {
        const target = makeSong({ id: 's1', title: 'A', artist: 'X' });
        expect(findSimilarSongs(target, [target])).toEqual([]);
    });

    it('同歌手優先', () => {
        const target = makeSong({ id: 's1', title: 'A', artist: '周杰倫' });
        const others = [
            makeSong({ id: 's2', title: 'B', artist: '周杰倫' }),
            makeSong({ id: 's3', title: 'C', artist: 'XX' }),
        ];
        const similar = findSimilarSongs(target, [target, ...others]);
        expect(similar[0].title).toBe('B');
        expect(similar[0].pill).toBe('同個歌手');
    });

    it('補滿 3 首', () => {
        const target = makeSong({ id: 's0', title: 'A', artist: 'X' });
        const others = Array.from({ length: 10 }, (_, i) =>
            makeSong({ id: `s${i + 1}`, title: `T${i}`, artist: `Y${i}` }),
        );
        const similar = findSimilarSongs(target, [target, ...others]);
        expect(similar.length).toBe(3);
    });
});
