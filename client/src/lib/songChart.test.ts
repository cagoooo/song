// 譜文字 → 歌庫樂譜欄位 — 單元測試
import { describe, it, expect } from 'vitest';
import { buildChartFromSheet, hasStoredSongChart } from './songChart';

describe('buildChartFromSheet', () => {
    const sheet = [
        'C       G       Am',
        '故事的小黃花  從出生那年  就飄著',
        'F       G       C',
        '童年的盪鞦韆  隨記憶一直晃到現在',
    ].join('\n');

    it('progression 去重保序', () => {
        const { progression } = buildChartFromSheet(sheet);
        expect(progression).toEqual(['C', 'G', 'Am', 'F']); // C/G 重複只留一次
    });

    it('progression 最多 8 顆', () => {
        const many = 'C D E F G A B C7 D7 E7 F7';
        expect(buildChartFromSheet(many).progression).toHaveLength(8);
    });

    it('lyricBlocks 把和弦行 + 中文歌詞配成 row', () => {
        const { lyricBlocks } = buildChartFromSheet(sheet);
        expect(lyricBlocks.length).toBeGreaterThan(0);
        const rows = lyricBlocks.flatMap((b) => b.rows);
        const withLyric = rows.find((r) => r.line?.includes('故事的小黃花'));
        expect(withLyric).toBeTruthy();
        expect(withLyric?.chord).toContain('C');
    });

    it('轉調後的譜（D 調）也能建 chart', () => {
        const dSheet = 'D       A       Bm\n故事的小黃花  從出生那年  就飄著';
        const { progression } = buildChartFromSheet(dSheet);
        expect(progression).toEqual(['D', 'A', 'Bm']);
    });

    it('空譜 → 空 chart 不炸', () => {
        const empty = buildChartFromSheet('');
        expect(empty.progression).toEqual([]);
        expect(empty.lyricBlocks).toEqual([]);
    });

    it('純歌詞無和弦 → progression 空、lyricBlocks 有內容', () => {
        const r = buildChartFromSheet('只有歌詞沒有和弦的一行');
        expect(r.progression).toEqual([]);
        expect(r.lyricBlocks.length).toBeGreaterThan(0);
        expect(r.lyricBlocks[0].rows[0]).toEqual({ line: '只有歌詞沒有和弦的一行' });
    });
});

describe('hasStoredSongChart', () => {
    it('有 AI 入庫的歌詞和弦區塊時視為歌庫譜', () => {
        expect(hasStoredSongChart({
            lyricBlocks: [{ sec: 'VERSE 1', rows: [{ chord: 'C G', line: '測試歌詞' }] }],
        })).toBe(true);
    });

    it('只有基本調性資料、不含實際譜面時不視為歌庫譜', () => {
        expect(hasStoredSongChart({})).toBe(false);
    });
});
