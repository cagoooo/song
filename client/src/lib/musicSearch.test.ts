import { describe, it, expect } from 'vitest';
import {
    cleanMusicSearchText,
    countCjk,
    stripLyricLineNumber,
    pickLyricSearchPhrase,
    extractMusicSearchQueryFromAiText,
    buildMusicSearchQuery,
} from './musicSearch';

describe('cleanMusicSearchText', () => {
    it('移除和弦、段落標記、豎線', () => {
        expect(cleanMusicSearchText('[前奏] |Gmaj7 A7 D|')).toBe('');
    });
    it('保留中文歌詞', () => {
        expect(cleanMusicSearchText('明明是春天我卻感到絕望')).toBe('明明是春天我卻感到絕望');
    });
    it('移除網址', () => {
        expect(cleanMusicSearchText('https://open.spotify.com/x 你好世界嗎')).toBe('你好世界嗎');
    });
});

describe('countCjk', () => {
    it('數中文字', () => {
        expect(countCjk('明明是春天')).toBe(5);
    });
    it('忽略英數標點', () => {
        expect(countCjk('X2 abc 123')).toBe(0);
    });
});

describe('stripLyricLineNumber', () => {
    it('去掉「1. 」', () => {
        expect(stripLyricLineNumber('1. 明明是春天')).toBe('明明是春天');
    });
    it('去掉「2、」', () => {
        expect(stripLyricLineNumber('2、你走了以後')).toBe('你走了以後');
    });
    it('不誤刪歌詞中的數字', () => {
        expect(stripLyricLineNumber('365 days')).toBe('365 days');
    });
});

describe('pickLyricSearchPhrase — 回歸：別把演奏標記當歌名', () => {
    // 截圖回報的真實案例：前奏行 `[前奏] D D/F# |G A X2 |等2拍`
    // 去掉和弦後剩 `X2 等2拍`，舊版誤當歌名搜尋 → 搜到牛頭不對馬嘴
    const SHEET = `[前奏] D D/F# |G A X2 |等2拍
|Gmaj7 A7 D |Gmaj7 Asus4 D
1. 明明是春天我卻感到絕望  夏天來臨了我還是看不見陽光
2. 你走了以後日子是否無恙  是不是有誰代替我陪在你身旁
|Gmaj7 A7 D |Gmaj7 Asus4 D
1. 秋天的落葉將往事都埋藏  準備好冬天將你的一切遺忘`;

    it('不會回傳演奏標記 X2 / 等2拍', () => {
        const q = pickLyricSearchPhrase(SHEET);
        expect(q).not.toContain('X2');
        expect(q).not.toContain('等2拍');
    });

    it('挑出真正的歌詞句', () => {
        const q = pickLyricSearchPhrase(SHEET);
        expect(q).toContain('明明是春天我卻感到絕望');
    });

    it('去掉行首編號', () => {
        const q = pickLyricSearchPhrase(SHEET);
        expect(q.startsWith('1')).toBe(false);
        expect(q.startsWith('明明')).toBe(true);
    });

    it('純和弦譜回傳空字串', () => {
        expect(pickLyricSearchPhrase('[INTRO]\n|C G Am F|\n|C G F C|')).toBe('');
    });

    it('擋掉只有「等2拍」這種短標記', () => {
        expect(pickLyricSearchPhrase('等2拍\nX4 反覆')).toBe('');
    });
});

describe('extractMusicSearchQueryFromAiText — 結構化欄位優先', () => {
    it('讀歌名 + 歌手欄位', () => {
        const ai = `歌名：應該\n歌手：王菲\n[前奏] X2 等2拍\n明明是春天`;
        expect(extractMusicSearchQueryFromAiText(ai)).toBe('應該 王菲');
    });

    it('沒有欄位時退回挑歌詞句', () => {
        const ai = `[前奏] D X2 等2拍\n明明是春天我卻感到絕望`;
        expect(extractMusicSearchQueryFromAiText(ai)).toContain('明明是春天');
    });

    it('只有演唱欄位無歌名且有歌詞行時，應組合歌詞短句 + 歌手', () => {
        // 模擬「瞬」這首歌的 AI 辨識結果（截圖沒有標題行，只有演唱欄位）
        const ai = `演唱：鄭潤澤\n詞：鄭潤澤 曲：鄭潤澤\n[前奏]|C |Cm |\n不知道是否有一種愛 可以讓我留下來`;
        const q = extractMusicSearchQueryFromAiText(ai);
        // 結果應含歌手名
        expect(q).toContain('鄭潤澤');
        // 結果不應只是歌手名（應有歌詞輔助關鍵字）
        expect(q.length).toBeGreaterThan('鄭潤澤'.length + 1);
    });

    it('只有演唱欄位且整份是純和弦譜（無歌詞）時，至少輸出歌手名', () => {
        const ai = `演唱：萬芳\n[前奏]|C |Am |F |G |\n[主歌]|C |Am |F |G |`;
        const q = extractMusicSearchQueryFromAiText(ai);
        expect(q).toContain('萬芳');
    });
});

describe('buildMusicSearchQuery — 優先序', () => {
    it('使用者明確填的歌名歌手最優先', () => {
        const q = buildMusicSearchQuery({
            explicitTitle: '稻香',
            explicitArtist: '周杰倫',
            aiText: '歌名：別的歌',
            sheet: '明明是春天',
        });
        expect(q).toBe('稻香 周杰倫');
    });

    it('沒有明確欄位時用 AI 結構化欄位', () => {
        const q = buildMusicSearchQuery({ aiText: '歌名：應該\n歌手：王菲' });
        expect(q).toBe('應該 王菲');
    });

    it('都沒有時退回譜面歌詞句', () => {
        const q = buildMusicSearchQuery({ sheet: '[前奏] X2 等2拍\n明明是春天我卻感到絕望' });
        expect(q).toContain('明明是春天');
    });
});
