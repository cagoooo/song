// 和弦自動轉調引擎 — 單元測試
import { describe, it, expect } from 'vitest';
import {
    parseChord,
    isChordSymbol,
    transposeChordSymbol,
    transposeChordLine,
    transposeChordSheet,
    transposeLyricBlocks,
    transposeProgression,
    isChordLine,
    extractChords,
    detectKey,
    countChordTokens,
    capoSuggestions,
    preferFlatForKey,
    noteToSemitone,
    KEY_OPTIONS,
} from './transpose';
import type { LyricBlock } from '@/lib/firestore';

describe('parseChord — 和弦解析', () => {
    it('基本三和弦', () => {
        expect(parseChord('C')).toEqual({ root: 'C', suffix: '', bass: null });
        expect(parseChord('Am')).toEqual({ root: 'A', suffix: 'm', bass: null });
        expect(parseChord('F#')).toEqual({ root: 'F#', suffix: '', bass: null });
        expect(parseChord('Bb')).toEqual({ root: 'Bb', suffix: '', bass: null });
    });

    it('Bb 的 b 應該被當成降記號（root=Bb）', () => {
        // root regex 是貪婪的 [A-G][#b]? — Bb 應整個吃成 root
        const p = parseChord('Bbm7');
        expect(p?.root).toBe('Bb');
        expect(p?.suffix).toBe('m7');
    });

    it('複雜後綴', () => {
        expect(parseChord('Cmaj7')?.suffix).toBe('maj7');
        expect(parseChord('F#m7-5')?.suffix).toBe('m7-5');
        expect(parseChord('Gm7b5')?.suffix).toBe('m7b5');
        expect(parseChord('Asus4')?.suffix).toBe('sus4');
        expect(parseChord('Cadd9')?.suffix).toBe('add9');
        expect(parseChord('Edim7')?.suffix).toBe('dim7');
        expect(parseChord('Caug')?.suffix).toBe('aug');
        expect(parseChord('D7sus4')?.suffix).toBe('7sus4');
    });

    it('分數和弦', () => {
        expect(parseChord('C/G')).toEqual({ root: 'C', suffix: '', bass: 'G' });
        expect(parseChord('Am7/G')).toEqual({ root: 'A', suffix: 'm7', bass: 'G' });
        expect(parseChord('D/F#')).toEqual({ root: 'D', suffix: '', bass: 'F#' });
    });

    it('C6/9 特例（/9 不是 bass）', () => {
        expect(parseChord('C6/9')).toEqual({ root: 'C', suffix: '6/9', bass: null });
    });

    it('拒絕非和弦', () => {
        expect(parseChord('Bridge')).toBeNull();   // B + ridge ≠ 和弦
        expect(parseChord('Do')).toBeNull();
        expect(parseChord('Amazing')).toBeNull();
        expect(parseChord('c')).toBeNull();         // 小寫 root 不收
        expect(parseChord('')).toBeNull();
        expect(parseChord('H7')).toBeNull();        // 德式記譜不支援
    });
});

describe('transposeChordSymbol — 單顆和弦移調', () => {
    it('基本上移', () => {
        expect(transposeChordSymbol('C', 2)).toBe('D');
        expect(transposeChordSymbol('Dm', 2)).toBe('Em');
        expect(transposeChordSymbol('Am', 2)).toBe('Bm');
    });

    it('使用者範例：C Dm Am → D 大調 = D Em Bm', () => {
        expect(transposeProgression(['C', 'Dm', 'Am'], 2)).toEqual(['D', 'Em', 'Bm']);
    });

    it('下移 + wrap around', () => {
        expect(transposeChordSymbol('C', -1)).toBe('B');
        expect(transposeChordSymbol('A', 3)).toBe('C');
        expect(transposeChordSymbol('G', 7)).toBe('D');
    });

    it('後綴原樣保留', () => {
        expect(transposeChordSymbol('Cmaj7', 2)).toBe('Dmaj7');
        expect(transposeChordSymbol('F#m7-5', 1)).toBe('Gm7-5');
        expect(transposeChordSymbol('Asus4', 2)).toBe('Bsus4');
    });

    it('分數和弦 root 與 bass 都移', () => {
        expect(transposeChordSymbol('C/G', 2)).toBe('D/A');
        expect(transposeChordSymbol('D/F#', -2)).toBe('C/E');
    });

    it('預設拼法慣例：Bb/Eb/Ab 用 b、F#/C#…位置用慣例', () => {
        expect(transposeChordSymbol('A', 1)).toBe('Bb');
        expect(transposeChordSymbol('D', 1)).toBe('Eb');
        expect(transposeChordSymbol('G', 1)).toBe('Ab');
        expect(transposeChordSymbol('F', 1)).toBe('F#');
        expect(transposeChordSymbol('C', 1)).toBe('Db');
    });

    it('preferFlat 強制拼法', () => {
        expect(transposeChordSymbol('C', 1, { preferFlat: false })).toBe('C#');
        expect(transposeChordSymbol('C', 1, { preferFlat: true })).toBe('Db');
        expect(transposeChordSymbol('A#', 0, { preferFlat: true })).toBe('Bb');
    });

    it('位移 0 不動', () => {
        expect(transposeChordSymbol('C', 0)).toBe('C');
        expect(transposeChordSymbol('F#m7', 12)).toBe('F#m7');
    });

    it('非和弦原樣回傳，不丟例外', () => {
        expect(transposeChordSymbol('Bridge', 2)).toBe('Bridge');
        expect(transposeChordSymbol('', 2)).toBe('');
    });
});

describe('transposeChordLine — 整行移調保持對齊', () => {
    it('基本行', () => {
        expect(transposeChordLine('C  G  Am  Em', 2)).toBe('D  A  Bm  F#m');
    });

    it('和弦變長時吃掉後方空白（下一個和弦欄位不動）', () => {
        //      0123456789
        const src = 'C    G    Am';
        const out = transposeChordLine(src, 1); // C→Db (+1 字元)
        // Db 後面的空白從 4 → 3，G 移調後的 Ab 起始欄位維持 5
        expect(out).toBe('Db   Ab   Bbm');
        expect(out.indexOf('Ab')).toBe(src.indexOf('G'));
    });

    it('和弦變短時補回空白', () => {
        const src = 'Db   Ab   Bbm';
        const out = transposeChordLine(src, -1);
        expect(out).toBe('C    G    Am');
    });

    it('空白不夠扣時至少留 1 格', () => {
        const out = transposeChordLine('C G', 1);
        expect(out).toBe('Db Ab');
    });

    it('保留前綴空白（和弦對齊歌詞用）', () => {
        expect(transposeChordLine('   C   G', 2)).toBe('   D   A');
    });

    it('中性記號原樣保留', () => {
        expect(transposeChordLine('| C | G | x2', 2)).toBe('| D | A | x2');
        expect(transposeChordLine('C - G - N.C.', 2)).toBe('D - A - N.C.');
    });

    it('整行非和弦不動', () => {
        expect(transposeChordLine('---- intro ----', 2)).toBe('---- intro ----');
    });
});

describe('91 譜黏寫格式 — |Cmaj7 / (C) / Em7-Dm7 / [A]', () => {
    it('小節線黏在和弦上也能轉（91 譜文字格式）', () => {
        const out = transposeChordLine('|Cmaj7 |Bm7 |Am7 C/D |Gmaj7 |', 2, { preferFlat: false });
        expect(out).toBe('|Dmaj7 |C#m7 |Bm7 D/E |Amaj7 |');
    });

    it('[A] 段落記號永不移調', () => {
        expect(transposeChordLine('[A] |C |G', 2)).toBe('[A] |D |A');
        expect(transposeChordLine('[前奏] C G', 2)).toBe('[前奏] D A');
    });

    it('括號過門和弦 (C) 會轉', () => {
        expect(transposeChordLine('(C) G', 2)).toBe('(D) A');
    });

    it('連寫和弦 Em7-Dm7 兩顆都轉', () => {
        expect(transposeChordLine('|Em7-Dm7 G |', 2, { preferFlat: false })).toBe('|F#m7-Em7 A |');
    });

    it('連寫不誤拆 Cm7-5（先整顆解析）', () => {
        expect(transposeChordLine('Cm7-5', 2)).toBe('Dm7-5');
    });

    it('黏寫格式的行被判定為和弦行 + 調性偵測有效', () => {
        expect(isChordLine('[A] |Cmaj7 |Bm7 |Am7 C/D |Gmaj7 |')).toBe(true);
        expect(extractChords('|Cmaj7 |Bm7 |Am7 C/D |Gmaj7 |')).toEqual(['Cmaj7', 'Bm7', 'Am7', 'C/D', 'Gmaj7']);
        expect(detectKey(extractChords('|Cmaj7 |Bm7 |Em7 |Am7 |D |Gmaj7'))?.key).toBe('G');
    });

    it('countChordTokens', () => {
        expect(countChordTokens('|Cmaj7 [Bm7 Em7 hello')).toBe(3);
        expect(countChordTokens('故事的小黃花')).toBe(0);
    });
});

describe('isChordLine — 和弦行偵測', () => {
    it('純和弦行', () => {
        expect(isChordLine('C  G  Am  Em')).toBe(true);
        expect(isChordLine('F#m7-5  B7  Em')).toBe(true);
        expect(isChordLine('| C | G | Am | F |')).toBe(true);
    });

    it('中文歌詞行', () => {
        expect(isChordLine('故事的小黃花')).toBe(false);
        expect(isChordLine('C 大調的歌')).toBe(false); // 和弦佔比 50% < 60%
        expect(isChordLine('Em 怎麼了')).toBe(false);
    });

    it('混合行：黏寫和弦＝鐵證（OCR 把譜邊中文註記併進和弦行）', () => {
        expect(isChordLine('|Cmaj7 |Bm7 |Am7 C/D |Gmaj7 | 參考 指法')).toBe(true);
        expect(isChordLine('|Am7 Ip |')).toBe(true); // 比例僅 50%，但 |Am7 黏寫是鐵證
        expect(transposeChordLine('|Am7 D | 參考 指法', 2, { preferFlat: false }))
            .toBe('|Bm7 E | 參考 指法');
    });

    it('英文歌詞行', () => {
        expect(isChordLine('Amazing grace how sweet the sound')).toBe(false);
        expect(isChordLine('A long time ago in a galaxy')).toBe(false); // A 是和弦但比例不足
    });

    it('空行 / 純記號', () => {
        expect(isChordLine('')).toBe(false);
        expect(isChordLine('   ')).toBe(false);
        expect(isChordLine('----')).toBe(false); // 只有中性記號，沒和弦
    });

    it('單一和弦也算', () => {
        expect(isChordLine('Am')).toBe(true);
    });
});

describe('detectKey — 調性偵測', () => {
    it('C 大調進行', () => {
        const d = detectKey(['C', 'G', 'Am', 'F', 'C', 'G', 'C']);
        expect(d?.key).toBe('C');
        expect(d!.confidence).toBeGreaterThan(0.4);
    });

    it('G 大調進行', () => {
        expect(detectKey(['G', 'D', 'Em', 'C', 'G'])?.key).toBe('G');
    });

    it('小調歌回關係大調（Am 的歌 → C）', () => {
        expect(detectKey(['Am', 'F', 'C', 'G', 'Am'])?.key).toBe('C');
    });

    it('降記號調', () => {
        expect(detectKey(['Bb', 'Eb', 'F', 'Gm', 'Bb'])?.key).toBe('Bb');
    });

    it('空陣列 → null', () => {
        expect(detectKey([])).toBeNull();
        expect(detectKey(['not-a-chord'])).toBeNull();
    });
});

describe('preferFlatForKey — 調性拼法偏好', () => {
    it('b 系大調', () => {
        expect(preferFlatForKey('F')).toBe(true);
        expect(preferFlatForKey('Bb')).toBe(true);
        expect(preferFlatForKey('Eb')).toBe(true);
    });
    it('# 系大調', () => {
        expect(preferFlatForKey('G')).toBe(false);
        expect(preferFlatForKey('D')).toBe(false);
        expect(preferFlatForKey('F#')).toBe(false);
    });
    it('小調換算關係大調', () => {
        expect(preferFlatForKey('Dm')).toBe(true);  // 關係大調 F
        expect(preferFlatForKey('Em')).toBe(false); // 關係大調 G
        expect(preferFlatForKey('Gm')).toBe(true);  // 關係大調 Bb
    });
    it('認不得 → null', () => {
        expect(preferFlatForKey('')).toBeNull();
        expect(preferFlatForKey(undefined)).toBeNull();
    });
});

describe('capoSuggestions — Capo 等效建議', () => {
    it('E 調：capo 0 彈 E / capo 2 彈 D / capo 4 彈 C…', () => {
        const s = capoSuggestions('E');
        expect(s).toContainEqual({ capo: 0, shapeKey: 'E' });
        expect(s).toContainEqual({ capo: 2, shapeKey: 'D' });
        expect(s).toContainEqual({ capo: 4, shapeKey: 'C' });
        expect(s).toContainEqual({ capo: 7, shapeKey: 'A' });
    });

    it('Bb 調：capo 1 彈 A / capo 3 彈 G', () => {
        const s = capoSuggestions('Bb');
        expect(s).toContainEqual({ capo: 1, shapeKey: 'A' });
        expect(s).toContainEqual({ capo: 3, shapeKey: 'G' });
        expect(s.find((x) => x.capo === 0)).toBeUndefined(); // Bb 不是開放指型調
    });

    it('依 capo 由低到高排序', () => {
        const s = capoSuggestions('E');
        const capos = s.map((x) => x.capo);
        expect(capos).toEqual([...capos].sort((a, b) => a - b));
    });

    it('認不得的 key → 空陣列', () => {
        expect(capoSuggestions('not-a-key')).toEqual([]);
    });
});

describe('transposeChordSheet — 整段純文字譜', () => {
    it('只動和弦行、歌詞行保留', () => {
        const sheet = [
            '[VERSE 1]',
            'C            G        Am',
            '故事的小黃花  從出生那年  就飄著',
            'F           G          C',
            '童年的盪鞦韆  隨記憶一直晃到現在',
        ].join('\n');
        const out = transposeChordSheet(sheet, 2);
        const lines = out.split('\n');
        expect(lines[0]).toBe('[VERSE 1]');
        expect(lines[1].trim().split(/\s+/)).toEqual(['D', 'A', 'Bm']);
        expect(lines[2]).toBe('故事的小黃花  從出生那年  就飄著');
        expect(lines[3].trim().split(/\s+/)).toEqual(['G', 'A', 'D']);
    });

    it('英文歌詞不動', () => {
        const sheet = 'G        C\nAmazing grace how sweet the sound';
        const out = transposeChordSheet(sheet, 2);
        expect(out.split('\n')[0].trim().split(/\s+/)).toEqual(['A', 'D']);
        expect(out.split('\n')[1]).toBe('Amazing grace how sweet the sound');
    });
});

describe('transposeLyricBlocks — LyricBlock[] 移調', () => {
    const blocks: LyricBlock[] = [
        { sec: 'INTRO', rows: [{ chord: 'C  G  Am  Em', line: '' }] },
        {
            sec: 'CHORUS', chorus: true, rows: [
                { chord: 'C       G       F', line: '刮風這天 我試過握著你手' },
            ],
        },
    ];

    it('+2：C→D 家族', () => {
        const out = transposeLyricBlocks(blocks, 2);
        expect(out[0].rows[0].chord!.trim().split(/\s+/)).toEqual(['D', 'A', 'Bm', 'F#m']);
        expect(out[1].rows[0].line).toBe('刮風這天 我試過握著你手');
        expect(out[1].chorus).toBe(true);
    });

    it('不改原資料（immutable）', () => {
        const before = JSON.stringify(blocks);
        transposeLyricBlocks(blocks, 5);
        expect(JSON.stringify(blocks)).toBe(before);
    });

    it('位移 0 回傳原引用', () => {
        expect(transposeLyricBlocks(blocks, 0)).toBe(blocks);
    });
});

describe('extractChords + KEY_OPTIONS', () => {
    it('extractChords 只抓和弦行的和弦', () => {
        const sheet = 'C  G  Am\n故事的小黃花\nF  G  C';
        expect(extractChords(sheet)).toEqual(['C', 'G', 'Am', 'F', 'G', 'C']);
    });

    it('KEY_OPTIONS 是 12 個調', () => {
        expect(KEY_OPTIONS).toHaveLength(12);
        const semis = KEY_OPTIONS.map((k) => noteToSemitone(k.replace('♭', 'b')));
        expect(new Set(semis).size).toBe(12);
    });
});
