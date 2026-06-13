// 和弦指型字典 + 封閉和弦產生 — 單元測試
import { describe, it, expect } from 'vitest';
import { getFingering, getFingerings } from './chordShapes';

describe('getFingering — 開放和弦字典', () => {
    it('C 大調開放指型（x32010）', () => {
        const f = getFingering('C')!;
        expect(f.dots).toEqual({ 6: 'x', 5: 3, 4: 2, 3: 0, 2: 1, 1: 0 });
        expect(f.baseFret).toBeUndefined();
    });

    it('Am / Em / Dm 開放指型', () => {
        expect(getFingering('Am')!.dots).toEqual({ 6: 'x', 5: 0, 4: 2, 3: 2, 2: 1, 1: 0 });
        expect(getFingering('Em')!.dots).toEqual({ 6: 0, 5: 2, 4: 2, 3: 0, 2: 0, 1: 0 });
        expect(getFingering('Dm')!.dots).toEqual({ 6: 'x', 5: 'x', 4: 0, 3: 2, 2: 3, 1: 1 });
    });

    it('七和弦家族', () => {
        expect(getFingering('G7')).not.toBeNull();
        expect(getFingering('Am7')).not.toBeNull();
        expect(getFingering('Cmaj7')).not.toBeNull();
    });
});

describe('getFingering — 封閉和弦自動產生', () => {
    it('B = A-shape 第 2 把位', () => {
        const f = getFingering('B')!;
        expect(f.baseFret).toBe(2);
        expect(f.dots[5]).toBe(1); // 第 5 弦封閉
        expect(f.dots[6]).toBe('x');
    });

    it('Bm = A-shape 第 2 把位', () => {
        const f = getFingering('Bm')!;
        expect(f.baseFret).toBe(2);
        expect(f.dots[2]).toBe(2);
    });

    it('F#m = E-shape 第 2 把位', () => {
        const f = getFingering('F#m')!;
        expect(f.baseFret).toBe(2);
        expect(f.dots[6]).toBe(1); // 第 6 弦封閉
    });

    it('F = 第 1 把位封閉（不需 baseFret）', () => {
        const f = getFingering('F')!;
        expect(f.baseFret).toBeUndefined();
        expect(f.dots).toEqual({ 6: 1, 5: 3, 4: 3, 3: 2, 2: 1, 1: 1 });
    });

    it('Db 與 C# 同指型（拼法無關）', () => {
        const db = getFingering('Db')!;
        const cs = getFingering('C#')!;
        expect(db.dots).toEqual(cs.dots);
        expect(db.baseFret).toBe(cs.baseFret);
        expect(db.name).toBe('Db'); // 名稱保留使用者的拼法
    });

    it('挑把位較低的 shape（C#m → E-shape 9fr vs A-shape 4fr → 選 4fr）', () => {
        const f = getFingering('C#m')!;
        expect(f.baseFret).toBe(4);
        expect(f.dots[6]).toBe('x'); // A-shape
    });
});

describe('getFingering — 邊界', () => {
    it('分數和弦用本體查、名稱保留', () => {
        const f = getFingering('C/G')!;
        expect(f.name).toBe('C/G');
        expect(f.dots).toEqual({ 6: 'x', 5: 3, 4: 2, 3: 0, 2: 1, 1: 0 });
    });

    it('非和弦 → null', () => {
        expect(getFingering('Bridge')).toBeNull();
        expect(getFingering('')).toBeNull();
    });

    it('罕見品質查不到 → null（不畫錯誤指型）', () => {
        expect(getFingering('Caug9')).toBeNull();
    });
});

describe('getFingerings — 批次產卡', () => {
    it('去重保序、cap 8 張', () => {
        const out = getFingerings(['C', 'G', 'Am', 'C', 'C/G', 'F']);
        expect(out.map((f) => f.name)).toEqual(['C', 'G', 'Am', 'F']); // C 重複 + C/G 同本體 → 去掉
    });

    it('轉調後的進行也能全數出卡（D 大調家族）', () => {
        const out = getFingerings(['D', 'A', 'Bm', 'F#m', 'G', 'Em']);
        expect(out).toHaveLength(6);
        expect(out.every((f) => f.dots)).toBe(true);
    });

    it('查不到的和弦跳過不炸', () => {
        const out = getFingerings(['C', 'not-a-chord', 'G']);
        expect(out.map((f) => f.name)).toEqual(['C', 'G']);
    });
});
