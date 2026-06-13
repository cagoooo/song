// 譜圖 OCR 版面重建 — 單元測試（純函式部分；真實 Tesseract 走 integration test）
import { describe, it, expect } from 'vitest';
import {
    toHalfWidth, visualWidth, fixChordLineNoise, reconstructSheet, blocksToOcrLines,
    type OcrLine,
} from './sheetOcr';
import { isChordLine, transposeChordSheet } from './transpose';

describe('toHalfWidth — 全形轉半形', () => {
    it('全形和弦 → 半形', () => {
        expect(toHalfWidth('Ｃｍａｊ７')).toBe('Cmaj7');
        expect(toHalfWidth('Ｂｍ７－５')).toBe('Bm7-5');
        expect(toHalfWidth('｜Ｇ　｜')).toBe('|G |');
        expect(toHalfWidth('（回★）')).toBe('(回★)');
    });

    it('半形原樣不動', () => {
        expect(toHalfWidth('Cmaj7 | Am7')).toBe('Cmaj7 | Am7');
        expect(toHalfWidth('愛一個人或許要慷慨')).toBe('愛一個人或許要慷慨');
    });
});

describe('visualWidth — CJK 雙寬', () => {
    it('ASCII = 1、CJK = 2', () => {
        expect(visualWidth('Cmaj7')).toBe(5);
        expect(visualWidth('愛')).toBe(2);
        expect(visualWidth('愛Am')).toBe(4);
    });
});

describe('fixChordLineNoise — 小節線誤判修正', () => {
    it('I / l 換成 | 後變和弦行 → 採用', () => {
        expect(fixChordLineNoise('I Cmaj7 I Bm7 I')).toBe('| Cmaj7 | Bm7 |');
        expect(fixChordLineNoise('l Am7 l D l')).toBe('| Am7 | D |');
    });

    it('本來就是和弦行 → 不動', () => {
        expect(fixChordLineNoise('| Cmaj7 | Bm7 |')).toBe('| Cmaj7 | Bm7 |');
    });

    it('歌詞行的 I 不能動（換了也不會變和弦行）', () => {
        expect(fixChordLineNoise('I love you so')).toBe('I love you so');
        expect(fixChordLineNoise('I am here now')).toBe('I am here now'); // am 在小寫黑名單
    });

    it('區段標頭整行跳過', () => {
        expect(fixChordLineNoise('[INTRO]')).toBe('[INTRO]');
        expect(fixChordLineNoise('[CHORUS]*')).toBe('[CHORUS]*');
    });

    // === 91 譜「特別的人」真實 OCR 雜訊（2026-06-13 使用者實測截圖） ===

    it('91 譜實測行 1：[ 和 l 認成小節線 + CID = C/D', () => {
        expect(fixChordLineNoise('[A]  [Cmaj7  [Bm7  |Am7  CID  lGmaj7  |'))
            .toBe('[A]  |Cmaj7  |Bm7  |Am7  C/D  |Gmaj7  |');
    });

    it('91 譜實測行 2：IG=|G、Cmai7=Cmaj7、Bm?=Bm7、lam7=|Am7', () => {
        expect(fixChordLineNoise('IG  B7  [Em7  Dm7  [Cmai7  Bm?  lam7  D  |'))
            .toBe('|G  B7  |Em7  Dm7  |Cmaj7  Bm7  |Am7  D  |');
    });

    it('91 譜實測行 3：小寫 lcm = |Cm、1Gmaj7 = |Gmaj7', () => {
        expect(fixChordLineNoise('lcmaj7  [Bm7  Em7  |Am7  lcm  1Gmaj7  |'))
            .toBe('|Cmaj7  |Bm7  Em7  |Am7  |Cm  |Gmaj7  |');
    });

    it('連寫和弦 [Em7-Dm7 → |Em7-Dm7', () => {
        expect(fixChordLineNoise('6  B7  [Em7-Dm7  G  |'))
            .toBe('6  B7  |Em7-Dm7  G  |');
    });

    it('修正後的行可直接轉調（端到端）', () => {
        const fixed = fixChordLineNoise('[Cmaj7  [Bm7  |Am7  CID  lGmaj7');
        const transposed = transposeChordSheet(fixed, 2, { preferFlat: false });
        // |Bm7 → |C#m7 變長 1 字元 → 後面空白吃 1 格保持對齊
        expect(transposed).toBe('|Dmaj7  |C#m7 |Bm7  D/E  |Amaj7');
    });
});

describe('reconstructSheet — 版面重建', () => {
    // 模擬 91 譜版面：charW=10px，和弦行在歌詞行正上方
    // 'Cmaj7' @x=0、'Bm7' @x=140 ←→ 歌詞「愛一個人或許要慷慨」@x=0
    const lines: OcrLine[] = [
        {
            y0: 10,
            words: [
                { text: 'Cmaj7', x0: 0, x1: 50 },
                { text: 'Bm7', x0: 140, x1: 170 },
            ],
        },
        {
            y0: 40,
            words: [
                { text: '愛一個人或許要慷慨', x0: 0, x1: 180 },
            ],
        },
    ];

    it('和弦落在對的欄位（x=140 / charW=10 → 第 14 欄）', () => {
        const sheet = reconstructSheet(lines);
        const [chordLine, lyricLine] = sheet.split('\n');
        expect(chordLine.indexOf('Cmaj7')).toBe(0);
        expect(chordLine.indexOf('Bm7')).toBe(14);
        expect(lyricLine).toBe('愛一個人或許要慷慨');
    });

    it('行依 y0 排序（OCR 區塊順序亂掉也能還原）', () => {
        const sheet = reconstructSheet([lines[1], lines[0]]);
        expect(sheet.split('\n')[0]).toContain('Cmaj7');
    });

    it('重建結果直接可被轉調引擎處理', () => {
        const sheet = reconstructSheet(lines);
        expect(isChordLine(sheet.split('\n')[0])).toBe(true);
        // 帶目標調拼法（D 調家族用 #）— 與工具實際流程一致
        const transposed = transposeChordSheet(sheet, 2, { preferFlat: false });
        expect(transposed.split('\n')[0].trim().split(/\s+/)).toEqual(['Dmaj7', 'C#m7']);
        expect(transposed.split('\n')[1]).toBe('愛一個人或許要慷慨');
    });

    it('全形 OCR 輸出也能重建（寬度用轉換後文字算）', () => {
        const sheet = reconstructSheet([
            { y0: 0, words: [{ text: 'Ｇ', x0: 0, x1: 10 }, { text: 'Ｂ７', x0: 60, x1: 80 }] },
        ]);
        expect(sheet).toBe('G     B7');
    });

    it('重疊 / 亂序 word 不會炸、空輸入回空字串', () => {
        expect(reconstructSheet([])).toBe('');
        expect(reconstructSheet([{ y0: 0, words: [] }])).toBe('');
        const messy = reconstructSheet([
            { y0: 0, words: [{ text: 'G', x0: 50, x1: 60 }, { text: 'C', x0: 0, x1: 10 }, { text: 'D', x0: 52, x1: 62 }] },
        ]);
        expect(messy).toContain('C');
        expect(messy).toContain('G D');
    });
});

describe('blocksToOcrLines — tesseract 結構攤平', () => {
    it('blocks → paragraphs → lines → words 攤平 + 空 word 過濾', () => {
        const data = {
            blocks: [{
                paragraphs: [{
                    lines: [
                        {
                            bbox: { y0: 5 },
                            words: [
                                { text: 'Am7', bbox: { x0: 0, x1: 30 } },
                                { text: '  ', bbox: { x0: 40, x1: 45 } },
                            ],
                        },
                    ],
                }],
            }],
        };
        const lines = blocksToOcrLines(data);
        expect(lines).toHaveLength(1);
        expect(lines[0].words).toEqual([{ text: 'Am7', x0: 0, x1: 30 }]);
    });

    it('blocks = null（辨識不到任何字）→ 空陣列', () => {
        expect(blocksToOcrLines({ blocks: null })).toEqual([]);
    });
});
