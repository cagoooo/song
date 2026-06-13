// 個人慣用調記憶 — 單元測試
import { describe, it, expect, beforeEach } from 'vitest';
import { getRememberedSteps, rememberSteps, sheetMemoryKey } from './transposeMemory';

beforeEach(() => {
    localStorage.clear();
});

describe('rememberSteps / getRememberedSteps', () => {
    it('記住後讀得到', () => {
        rememberSteps('song:abc', 3);
        expect(getRememberedSteps('song:abc')).toBe(3);
    });

    it('負位移也記得', () => {
        rememberSteps('song:x', -2);
        expect(getRememberedSteps('song:x')).toBe(-2);
    });

    it('沒記錄回 null', () => {
        expect(getRememberedSteps('song:none')).toBeNull();
    });

    it('存 0 = 刪除記錄（回原調不佔空間）', () => {
        rememberSteps('song:y', 5);
        rememberSteps('song:y', 0);
        expect(getRememberedSteps('song:y')).toBeNull();
    });

    it('覆寫更新', () => {
        rememberSteps('song:z', 2);
        rememberSteps('song:z', 7);
        expect(getRememberedSteps('song:z')).toBe(7);
    });

    it('多 id 各自獨立', () => {
        rememberSteps('song:a', 1);
        rememberSteps('song:b', -4);
        expect(getRememberedSteps('song:a')).toBe(1);
        expect(getRememberedSteps('song:b')).toBe(-4);
    });

    it('空 id 不炸', () => {
        expect(() => rememberSteps('', 3)).not.toThrow();
        expect(getRememberedSteps('')).toBeNull();
    });
});

describe('sheetMemoryKey', () => {
    it('同內容 → 同 key', () => {
        expect(sheetMemoryKey('C G Am F')).toBe(sheetMemoryKey('C G Am F'));
    });

    it('忽略空白差異與大小寫', () => {
        expect(sheetMemoryKey('C   G  Am')).toBe(sheetMemoryKey('c g am'));
        expect(sheetMemoryKey(' C G Am ')).toBe(sheetMemoryKey('C G Am'));
    });

    it('不同內容 → 不同 key', () => {
        expect(sheetMemoryKey('C G Am')).not.toBe(sheetMemoryKey('D A Bm'));
    });

    it('key 帶 sheet: 前綴', () => {
        expect(sheetMemoryKey('C G').startsWith('sheet:')).toBe(true);
    });

    it('整合：用譜 key 記住位移', () => {
        const key = sheetMemoryKey('[A] C G Am F');
        rememberSteps(key, 2);
        expect(getRememberedSteps(sheetMemoryKey('[a]  c  g  am  f'))).toBe(2);
    });
});
