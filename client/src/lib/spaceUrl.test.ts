import { describe, expect, it, vi } from 'vitest';

// getActiveTenant 由各測試個別控制
const firebaseMock = vi.hoisted(() => ({
    getActiveTenant: vi.fn<[], string | null>(() => null),
}));
vi.mock('./firebase', () => firebaseMock);

import { buildSpacePublicUrl, buildSpaceStageUrl, getCurrentSpacePublicUrl, isValidSlug, normalizeSlug } from './spaceUrl';
import { isFirebaseUid, isValidSpaceParam } from './spaceIds';

describe('buildSpacePublicUrl', () => {
    it('根空間回傳乾淨站台網址（不帶參數）', () => {
        expect(buildSpacePublicUrl('https://cagoooo.github.io', '/song/', null))
            .toBe('https://cagoooo.github.io/song/');
    });

    it('租戶空間帶 ?space={uid}', () => {
        expect(buildSpacePublicUrl('https://cagoooo.github.io', '/song/', 'abc123XYZ'))
            .toBe('https://cagoooo.github.io/song/?space=abc123XYZ');
    });

    it('特殊字元會被 URL encode（防注入）', () => {
        expect(buildSpacePublicUrl('https://x.tw', '/', 'a&b=c'))
            .toBe('https://x.tw/?space=a%26b%3Dc');
    });
});

describe('buildSpaceStageUrl', () => {
    it('根空間只有 mode=stage', () => {
        expect(buildSpaceStageUrl(null)).toBe('?mode=stage');
    });

    it('租戶空間帶 space 參數 — 投影裝置未登入也落在正確空間', () => {
        expect(buildSpaceStageUrl('uid_42')).toBe('?mode=stage&space=uid_42');
    });
});

describe('getCurrentSpacePublicUrl', () => {
    it('依 activeTenant 組出目前空間的公開網址', () => {
        firebaseMock.getActiveTenant.mockReturnValue('tenant-abc');
        const url = getCurrentSpacePublicUrl();
        expect(url).toBe(`${window.location.origin}${window.location.pathname}?space=tenant-abc`);
    });

    it('根空間不帶 space 參數', () => {
        firebaseMock.getActiveTenant.mockReturnValue(null);
        const url = getCurrentSpacePublicUrl();
        expect(url).toBe(`${window.location.origin}${window.location.pathname}`);
    });
});

describe('isValidSlug', () => {
    it('接受小寫英數字與 dash', () => {
        expect(isValidSlug('my-band-2026')).toBe(true);
        expect(isValidSlug('kai')).toBe(true);
    });

    it('拒絕太短（< 3 碼）', () => {
        expect(isValidSlug('ab')).toBe(false);
    });

    it('拒絕大寫字母（避免同代碼大小寫混淆）', () => {
        expect(isValidSlug('MyBand')).toBe(false);
    });

    it('拒絕開頭/結尾/連續 dash', () => {
        expect(isValidSlug('-band')).toBe(false);
        expect(isValidSlug('band-')).toBe(false);
        expect(isValidSlug('my--band')).toBe(false);
    });

    it('拒絕超過 32 碼', () => {
        expect(isValidSlug('a'.repeat(33))).toBe(false);
    });
});

describe('spaceIds — 網址解析與 slug 規則必須一致', () => {
    it('任何合法 slug 都必須通過 ?space= 網址解析（2026-07-03 bobby 事件：5 碼 slug 曾被網址解析丟棄）', () => {
        for (const slug of ['bob', 'bobby', 'my-band-2026', 'a1b2c3', 'x'.repeat(32)]) {
            expect(isValidSlug(slug), `slug: ${slug}`).toBe(true);
            expect(isValidSpaceParam(slug), `spaceParam: ${slug}`).toBe(true);
        }
    });

    it('Firebase uid（28 碼）通過網址解析且被辨識為 uid（不查對照表直連）', () => {
        const uid = 'wnozzUrl2CaM9Lw2x5PziQraQXs2';
        expect(uid).toHaveLength(28);
        expect(isValidSpaceParam(uid)).toBe(true);
        expect(isFirebaseUid(uid)).toBe(true);
    });

    it('slug 不會被誤認成 uid（含 dash 或非 28 碼）', () => {
        expect(isFirebaseUid('bobby')).toBe(false);
        expect(isFirebaseUid('my-band-2026')).toBe(false);
    });

    it('太短或含非法字元的參數擋掉', () => {
        expect(isValidSpaceParam('ab')).toBe(false);
        expect(isValidSpaceParam('a b')).toBe(false);
        expect(isValidSpaceParam('<script>')).toBe(false);
    });
});

describe('normalizeSlug', () => {
    it('轉小寫、空白轉 dash', () => {
        expect(normalizeSlug('My Band 2026')).toBe('my-band-2026');
    });

    it('去除不合法字元（中文、符號）', () => {
        expect(normalizeSlug('阿凱的 Band!')).toBe('band');
    });

    it('去除頭尾 dash 與連續 dash', () => {
        expect(normalizeSlug('  --my--band--  ')).toBe('my-band');
    });
});
