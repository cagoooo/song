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

    it('逐顆和弦對齊 — 一小節多顆和弦、行首無 | 也對齊到片語（91 譜格式）', () => {
        const input = 'C Bm7-5 E |Am Am7/G C |\n數到三 幸福很 簡單 太平凡 也是種 浪漫';
        const output = optimizeAiLayout(input);
        const lines = output.split('\n');
        // 6 顆和弦 == 6 個片語 → 逐顆對齊
        // 片語欄位：數到三=0、幸福很=7、簡單=14、太平凡=19、也是種=26、浪漫=33
        expect(lines[0].indexOf('C')).toBe(0);        // 行首和弦沒有被當成前綴
        expect(lines[0].indexOf('Bm7-5')).toBe(7);
        expect(lines[0].indexOf('E ')).toBe(14);
        expect(lines[0].indexOf('|Am')).toBe(19);
        expect(lines[0].indexOf('Am7/G')).toBe(26);
        expect(lines[0].lastIndexOf('C')).toBe(33);
        expect(lines[0].trimEnd().endsWith('|')).toBe(true);
    });

    it('逐顆和弦對齊 — 和弦數 != 片語數 → 均勻分佈到歌詞寬度', () => {
        const input = '|C G Am F Em Dm G7 |\n你的習慣閉著眼 都能清楚';
        const output = optimizeAiLayout(input);
        const lines = output.split('\n');
        // 7 顆和弦、2 個片語 → 均勻分佈，不左擠、也不塞爆
        expect(lines[0].indexOf('|C')).toBe(0);
        // 最後一顆 G7 應落在歌詞後半，明顯離行首
        expect(lines[0].lastIndexOf('G7')).toBeGreaterThan(10);
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
