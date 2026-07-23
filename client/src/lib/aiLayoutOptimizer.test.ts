import { describe, it, expect } from 'vitest';
import { optimizeAiLayout, getVisualWidth } from './aiLayoutOptimizer';

describe('aiLayoutOptimizer — AI 辨識排版優化器', () => {
    it('getVisualWidth — 計算視覺寬度', () => {
        expect(getVisualWidth('C')).toBe(1);
        expect(getVisualWidth('Cmaj7')).toBe(5);
        expect(getVisualWidth('窗外雲朵')).toBe(8); // 4 個中文字 = 8 格
        expect(getVisualWidth('窗外雲朵 A7')).toBe(11); // 8 + 1 + 2 = 11
    });

    it('均勻分散對齊被壓縮的和弦行（無小節線）', () => {
        const input = 'C G Am F\n窗外雲朵 飄蕩天邊';
        // 歌詞視覺長度 = 17 (窗外雲朵 8, 空格 1, 飄蕩天邊 8)
        // 4 個和弦會被均勻分配到 0, 5, 10, 15 等位置 (17 - 1 = 16 寬度)
        const output = optimizeAiLayout(input);
        
        const lines = output.split('\n');
        expect(lines[1]).toBe('窗外雲朵 飄蕩天邊');
        // 'C' 在 0，'G' 在 5，'Am' 在 10，'F' 在 15
        expect(lines[0].startsWith('C')).toBe(true);
        expect(lines[0].indexOf('G')).toBe(5);
        expect(lines[0].indexOf('Am')).toBe(10);
        expect(lines[0].indexOf('F')).toBe(16);
    });

    it('均勻分散對齊被壓縮的和弦行（有小節線）', () => {
        const input = '| Cmaj7 A7 | Dm7 G7 |\n窗外雲朵 飄蕩天邊 像是我的心 沒有終點';
        // 歌詞寬度為 37。7 個 token (| Cmaj7 A7 | Dm7 G7 |) 會均勻分配在 [0, 37]
        const output = optimizeAiLayout(input);
        
        const lines = output.split('\n');
        expect(lines[1]).toBe('窗外雲朵 飄蕩天邊 像是我的心 沒有終點');
        expect(lines[0].startsWith('|')).toBe(true);
        expect(lines[0].includes('Cmaj7')).toBe(true);
        expect(lines[0].includes('A7')).toBe(true);
        expect(lines[0].includes('Dm7')).toBe(true);
        expect(lines[0].includes('G7')).toBe(true);
    });

    it('已經有對齊空格的和弦行（不應該被修改）', () => {
        const input = 'C          G          Am         F\n窗外雲朵 飄蕩天邊 像是我的心 沒有終點';
        // 包含連續多格空格，說明本來就對齊好了，應原樣保留
        const output = optimizeAiLayout(input);
        expect(output).toBe(input);
    });

    it('小節線和弦行 — 小節數 == 歌詞片語數 → 逐段對齊到片語上方', () => {
        const input = '|A |C#m |F#m |E |\n故事 總是這樣發生 不算什麼深刻 不算那麼認真';
        const output = optimizeAiLayout(input);
        const lines = output.split('\n');
        expect(lines[1]).toBe('故事 總是這樣發生 不算什麼深刻 不算那麼認真');
        // 片語起始欄位：故事=0、總是這樣發生=5、不算什麼深刻=18、不算那麼認真=31
        expect(lines[0].indexOf('|A')).toBe(0);
        expect(lines[0].indexOf('|C#m')).toBe(5);
        expect(lines[0].indexOf('|F#m')).toBe(18);
        expect(lines[0].indexOf('|E')).toBe(31);
        expect(lines[0].trimEnd().endsWith('|')).toBe(true);
    });

    it('小節線和弦行 — 小節數 != 片語數 → 均勻分佈到歌詞寬度', () => {
        const input = '|Cmaj7 A7 |Dm7 G7 |\n窗外雲朵 飄蕩天邊 像是我的心 沒有終點';
        const output = optimizeAiLayout(input);
        const lines = output.split('\n');
        expect(lines[0].indexOf('|Cmaj7 A7')).toBe(0);
        // 第 2 小節約落在歌詞寬度(37)的一半附近
        const secondBar = lines[0].indexOf('|Dm7 G7');
        expect(secondBar).toBeGreaterThan(14);
        expect(secondBar).toBeLessThan(24);
    });

    it('小節線和弦行 — 下一行不是歌詞（前奏）→ 維持緊湊規整化', () => {
        const input = '[前奏] |G |Gmaj7 |G7 |Cm |\n\n|G |Bm |Em |D |\n故事 總是這樣發生 不算什麼深刻 不算那麼認真';
        const output = optimizeAiLayout(input);
        const lines = output.split('\n');
        // 前奏行沒有歌詞可對齊 → 不展開
        expect(lines[0]).toBe('[前奏] |G |Gmaj7 |G7 |Cm |');
        // 主歌和弦行有歌詞 → 對齊展開
        expect(lines[2].indexOf('|Bm')).toBe(5);
    });

    it('不符合對齊條件的普通歌詞行（不應該被修改）', () => {
        const input = '窗外雲朵 飄蕩天邊\n像是我的心 沒有終點';
        const output = optimizeAiLayout(input);
        expect(output).toBe(input);
    });
});
