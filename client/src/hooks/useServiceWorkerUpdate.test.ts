import { describe, expect, it } from 'vitest';
import { isNewerSwVersion } from './useServiceWorkerUpdate';

describe('isNewerSwVersion — SW 假更新過濾', () => {
    it('版本字串完全相同 → 不是新版', () => {
        expect(isNewerSwVersion('4.19.13-c0080e9-ab3x', '4.19.13-c0080e9-ab3x')).toBe(false);
    });

    it('同 semver 同 hash、只差 build 時間戳 → 同 code 重 build，不是新版', () => {
        expect(isNewerSwVersion('4.19.13-c0080e9-zzzz', '4.19.13-c0080e9-ab3x')).toBe(false);
    });

    it('semver 較舊（CDN 殘留舊版 sw.js）→ 不是新版', () => {
        expect(isNewerSwVersion('4.19.12-d9ee523-ypaf', '4.19.13-c0080e9-ab3x')).toBe(false);
        expect(isNewerSwVersion('4.18.0-abc1234-aaaa', '4.19.13-c0080e9-ab3x')).toBe(false);
    });

    it('semver 較新 → 是新版', () => {
        expect(isNewerSwVersion('4.19.13-c0080e9-ab3x', '4.19.12-d9ee523-ypaf')).toBe(true);
        expect(isNewerSwVersion('4.20.0-abc1234-aaaa', '4.19.13-c0080e9-ab3x')).toBe(true);
        expect(isNewerSwVersion('5.0.0-abc1234-aaaa', '4.19.13-c0080e9-ab3x')).toBe(true);
    });

    it('同 semver 不同 git hash（沒 bump 版本的新 commit）→ 是新版', () => {
        expect(isNewerSwVersion('4.19.12-a5a6d43-bbbb', '4.19.12-d9ee523-ypaf')).toBe(true);
    });

    it('版本格式解析不了 → 寬鬆放行（不擋真更新）', () => {
        expect(isNewerSwVersion('dev', '4.19.13-c0080e9-ab3x')).toBe(true);
        expect(isNewerSwVersion('4.19.13-c0080e9-ab3x', 'unknown')).toBe(true);
    });

    it('semver 位數比較是數值不是字串（4.9.x vs 4.10.x）', () => {
        expect(isNewerSwVersion('4.10.0-abc1234-aaaa', '4.9.9-abc1234-aaaa')).toBe(true);
        expect(isNewerSwVersion('4.9.9-abc1234-aaaa', '4.10.0-abc1234-aaaa')).toBe(false);
    });
});
