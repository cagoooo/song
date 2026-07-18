// 歌詞 DSL 解析器單元測試
// 📐 設計文件：docs/design/T3-songdetail-firestore.md

import { describe, it, expect } from 'vitest';
import {
    parseLyricsDSL,
    sanitizeLyricBlocks,
    serializeLyricsToDSL,
    lintLyricBlocks,
    upgradeLegacyLyrics,
} from './lyrics-dsl';
import type { LyricBlock } from '@/lib/firestore';

describe('parseLyricsDSL', () => {
    describe('邊界 / 容錯', () => {
        it('空字串 → []', () => {
            expect(parseLyricsDSL('')).toEqual([]);
        });

        it('null / undefined → []', () => {
            expect(parseLyricsDSL(null as unknown as string)).toEqual([]);
            expect(parseLyricsDSL(undefined as unknown as string)).toEqual([]);
        });

        it('純空白 → []', () => {
            expect(parseLyricsDSL('\n\n  \n\n')).toEqual([]);
        });

        it('沒 section header 開頭 → 自動建 VERSE 1', () => {
            const result = parseLyricsDSL('故事的小黃花');
            expect(result.length).toBe(1);
            expect(result[0].sec).toBe('VERSE 1');
            expect(result[0].rows[0].line).toBe('故事的小黃花');
        });
    });

    describe('區塊解析', () => {
        it('單一 INTRO + 純和弦行', () => {
            const dsl = `[INTRO]
C  G  Am  Em`;
            const result = parseLyricsDSL(dsl);
            expect(result).toEqual([
                { sec: 'INTRO', rows: [{ chord: 'C  G  Am  Em', line: '' }] },
            ]);
        });

        it('CHORUS* 加星號 → chorus: true', () => {
            const dsl = `[CHORUS]*
C  G  F  C
副歌歌詞`;
            const result = parseLyricsDSL(dsl);
            expect(result[0].chorus).toBe(true);
        });

        it('CHORUS 沒星號 → chorus 未設', () => {
            const dsl = `[CHORUS]
C  G  F  C
副歌歌詞`;
            const result = parseLyricsDSL(dsl);
            expect(result[0].chorus).toBeUndefined();
        });

        it('多個區塊 INTRO + VERSE 1 + CHORUS', () => {
            const dsl = `[INTRO]
C  G  Am  Em

[VERSE 1]
C       G
故事的小黃花

[CHORUS]*
F       G
副歌啦啦啦`;
            const result = parseLyricsDSL(dsl);
            expect(result.length).toBe(3);
            expect(result[0].sec).toBe('INTRO');
            expect(result[1].sec).toBe('VERSE 1');
            expect(result[2].sec).toBe('CHORUS');
            expect(result[2].chorus).toBe(true);
        });

        it('section 名稱容錯：VERSE1 / V1 / HOOK / END', () => {
            const dsl = `[VERSE1]
A
歌詞A

[V2]
B
歌詞B

[HOOK]
C
副歌

[END]
D`;
            const result = parseLyricsDSL(dsl);
            expect(result.map((b) => b.sec)).toEqual(['VERSE 1', 'VERSE 2', 'CHORUS', 'OUTRO']);
        });

        it('不認識的 section name 跳過', () => {
            const dsl = `[BOGUS]
A
歌詞`;
            const result = parseLyricsDSL(dsl);
            // BOGUS 不認識 → 沒 section → 自動 VERSE 1
            expect(result.length).toBe(1);
            expect(result[0].sec).toBe('VERSE 1');
        });
    });

    describe('和弦 / 歌詞配對', () => {
        it('和弦行 + 歌詞行 = 一個 row 含兩者', () => {
            const dsl = `[VERSE 1]
C       G       Am
故事的小黃花`;
            const result = parseLyricsDSL(dsl);
            expect(result[0].rows[0]).toEqual({
                chord: 'C       G       Am',
                line: '故事的小黃花',
            });
        });

        it('兩個和弦行 連續 → 第一個變純和弦 row', () => {
            const dsl = `[VERSE 1]
C  G
F  C
有歌詞的這行`;
            const result = parseLyricsDSL(dsl);
            expect(result[0].rows).toEqual([
                { chord: 'C  G', line: '' },
                { chord: 'F  C', line: '有歌詞的這行' },
            ]);
        });

        it('純歌詞行（沒和弦） → row 只有 line', () => {
            const dsl = `[VERSE 1]
純歌詞一行
純歌詞二行`;
            const result = parseLyricsDSL(dsl);
            expect(result[0].rows).toEqual([
                { line: '純歌詞一行' },
                { line: '純歌詞二行' },
            ]);
        });

        it('區塊結尾留和弦不配對 → 寫成純和弦 row', () => {
            const dsl = `[VERSE 1]
C  G  Am
中文歌詞
F  C`;
            const result = parseLyricsDSL(dsl);
            expect(result[0].rows).toEqual([
                { chord: 'C  G  Am', line: '中文歌詞' },
                { chord: 'F  C', line: '' },
            ]);
        });

        it('INTRO 全純和弦不爆炸', () => {
            const dsl = `[INTRO]
C
G
Am
Em`;
            const result = parseLyricsDSL(dsl);
            expect(result[0].rows.length).toBe(4);
            expect(result[0].rows.every((r) => !r.line)).toBe(true);
            expect(result[0].rows.map((r) => r.chord)).toEqual(['C', 'G', 'Am', 'Em']);
        });
    });
});

describe('sanitizeLyricBlocks', () => {
    it('遞迴移除舊資料中 Firestore 不接受的 undefined 欄位', () => {
        const legacy = [{
            sec: 'VERSE 1',
            chorus: undefined,
            rows: [{ chord: undefined, line: '純歌詞', startMs: undefined }],
        }] as unknown as LyricBlock[];

        expect(sanitizeLyricBlocks(legacy)).toEqual([
            { sec: 'VERSE 1', rows: [{ line: '純歌詞' }] },
        ]);
    });
});

describe('serializeLyricsToDSL', () => {
    it('空陣列 → ""', () => {
        expect(serializeLyricsToDSL([])).toBe('');
    });

    it('單一 INTRO 純和弦', () => {
        const blocks: LyricBlock[] = [
            { sec: 'INTRO', rows: [{ chord: 'C G Am Em', line: '' }] },
        ];
        expect(serializeLyricsToDSL(blocks)).toBe('[INTRO]\nC G Am Em');
    });

    it('CHORUS chorus: true → 加星號', () => {
        const blocks: LyricBlock[] = [
            {
                sec: 'CHORUS',
                chorus: true,
                rows: [{ chord: 'C G', line: '副歌歌詞' }],
            },
        ];
        const result = serializeLyricsToDSL(blocks);
        expect(result).toBe('[CHORUS]*\nC G\n副歌歌詞');
    });

    it('多個 block 之間有空白行', () => {
        const blocks: LyricBlock[] = [
            { sec: 'INTRO', rows: [{ chord: 'C', line: '' }] },
            { sec: 'VERSE 1', rows: [{ chord: 'G', line: '歌詞' }] },
        ];
        expect(serializeLyricsToDSL(blocks)).toBe('[INTRO]\nC\n\n[VERSE 1]\nG\n歌詞');
    });

    it('chord 為 "—"（legacy migration 標記） → 不輸出', () => {
        const blocks: LyricBlock[] = [
            { sec: 'VERSE 1', rows: [{ chord: '—', line: '舊歌詞' }] },
        ];
        expect(serializeLyricsToDSL(blocks)).toBe('[VERSE 1]\n舊歌詞');
    });
});

describe('Round-trip：parse → serialize → parse 一致', () => {
    it('完整歌曲格式：解析後序列化，再解析應該結構相同', () => {
        const original = `[INTRO]
C  G  Am  Em

[VERSE 1]
C       G
故事的小黃花

[CHORUS]*
F       G
副歌啦啦啦`;
        const parsed = parseLyricsDSL(original);
        const serialized = serializeLyricsToDSL(parsed);
        const reparsed = parseLyricsDSL(serialized);
        expect(reparsed).toEqual(parsed);
    });
});

describe('lintLyricBlocks', () => {
    it('空陣列 → 警告「沒有任何歌詞區塊」', () => {
        const w = lintLyricBlocks([]);
        expect(w).toContain('沒有任何歌詞區塊');
    });

    it('沒副歌 → 警告', () => {
        const blocks: LyricBlock[] = [
            { sec: 'VERSE 1', rows: [{ chord: 'C', line: '歌詞' }] },
        ];
        const w = lintLyricBlocks(blocks);
        expect(w.some((x) => x.includes('副歌'))).toBe(true);
    });

    it('chorus: true 不會觸發副歌警告', () => {
        const blocks: LyricBlock[] = [
            { sec: 'VERSE 1', rows: [{ chord: 'C', line: '歌詞' }] },
            { sec: 'CHORUS', chorus: true, rows: [{ chord: 'G', line: '副歌' }] },
        ];
        const w = lintLyricBlocks(blocks);
        expect(w.some((x) => x.includes('副歌'))).toBe(false);
    });

    it('全是和弦行沒歌詞 → 警告', () => {
        const blocks: LyricBlock[] = [
            { sec: 'INTRO', rows: [{ chord: 'C', line: '' }] },
            { sec: 'OUTRO', rows: [{ chord: 'G', line: '' }] },
        ];
        const w = lintLyricBlocks(blocks);
        expect(w.some((x) => x.includes('和弦行'))).toBe(true);
    });
});

describe('upgradeLegacyLyrics', () => {
    it('空字串 → []', () => {
        expect(upgradeLegacyLyrics('')).toEqual([]);
    });

    it('null / undefined → []', () => {
        expect(upgradeLegacyLyrics(null as unknown as string)).toEqual([]);
    });

    it('單行字串 → 一個 VERSE 1 含一行歌詞', () => {
        const result = upgradeLegacyLyrics('故事的小黃花');
        expect(result).toEqual([
            { sec: 'VERSE 1', rows: [{ line: '故事的小黃花' }] },
        ]);
    });

    it('多行字串 → 一個 VERSE 1 含多行歌詞', () => {
        const result = upgradeLegacyLyrics('故事的小黃花\n從出生那年就飄著\n童年的盪鞦韆');
        expect(result.length).toBe(1);
        expect(result[0].sec).toBe('VERSE 1');
        expect(result[0].rows.length).toBe(3);
        expect(result[0].rows[0].line).toBe('故事的小黃花');
    });

    it('多餘空白行被過濾', () => {
        const result = upgradeLegacyLyrics('一\n\n\n二\n\n');
        expect(result[0].rows.length).toBe(2);
    });
});
