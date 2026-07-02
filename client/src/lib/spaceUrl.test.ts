import { describe, expect, it, vi } from 'vitest';

// getActiveTenant 由各測試個別控制
const firebaseMock = vi.hoisted(() => ({
    getActiveTenant: vi.fn<[], string | null>(() => null),
}));
vi.mock('./firebase', () => firebaseMock);

import { buildSpacePublicUrl, buildSpaceStageUrl, getCurrentSpacePublicUrl } from './spaceUrl';

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
