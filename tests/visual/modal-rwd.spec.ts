/**
 * modal-rwd.spec.ts — sheet-style modal 的行動端版面回歸測試
 *
 * 目的：守住反覆出現的「modal 在手機跑版、底部 CTA 看不到/點不到」問題。
 * 策略：開啟 modal → 斷言「主要 CTA」落在 viewport 內且可點、modal 無橫向溢出。
 *
 * ⚠️ CI 限制：CI 跑 Playwright 時沒有 Firestore 設定，App 會停在載入畫面，
 *    觸發按鈕不會出現。此時以 test.skip() 優雅略過（與既有 FAB 測試一致）；
 *    本機（有 Firestore 設定）開發時則會真正執行斷言。
 *    未來若導入 Firestore mock 讓 App 在 CI 也能進入主畫面，這些斷言就會在 CI 生效。
 */
import { test, expect, type Page, type Locator } from '@playwright/test';

const BASE = '/song/';

async function gotoHome(page: Page) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('body > #root > *', { timeout: 10_000 });
}

/** 斷言某元素完整落在 viewport 內（可見、可點，不被裁切/瀏覽器列遮住） */
async function expectWithinViewport(page: Page, el: Locator, label: string) {
    await expect(el, `${label} 應該可見`).toBeVisible();
    const box = await el.boundingBox();
    expect(box, `${label} 應有版面框`).not.toBeNull();
    if (!box) return;
    const vw = page.viewportSize()!.width;
    const vh = page.viewportSize()!.height;
    expect(box.x, `${label} 超出左邊界`).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width, `${label} 超出右邊界`).toBeLessThanOrEqual(vw + 1);
    expect(box.y, `${label} 超出上邊界`).toBeGreaterThanOrEqual(-1);
    expect(box.y + box.height, `${label} 底部被裁切/遮住`).toBeLessThanOrEqual(vh + 1);
}

test.describe('建議新歌 modal 行動端版面', () => {
    test('送出建議按鈕在 viewport 內可見可點', async ({ page }) => {
        await gotoHome(page);

        const trigger = page.getByRole('button', { name: /建議新歌/ }).first();
        const reachable = await trigger.isVisible().catch(() => false);
        if (!reachable) {
            test.skip(true, 'App 未進入主畫面或觸發鈕不可見（CI 無 Firestore），略過 modal 斷言');
            return;
        }
        await trigger.click();

        const submit = page.getByRole('button', { name: /送出建議/ });
        await expectWithinViewport(page, submit.first(), '送出建議按鈕');
    });
});

test.describe('分享點歌 modal 行動端版面', () => {
    test('分享卡內容無橫向溢出且關閉鈕可見', async ({ page }) => {
        await gotoHome(page);

        const trigger = page.getByRole('button', { name: '分享點歌系統' }).first();
        const reachable = await trigger.isVisible().catch(() => false);
        if (!reachable) {
            test.skip(true, 'App 未進入主畫面或觸發鈕不可見（CI 無 Firestore），略過 modal 斷言');
            return;
        }
        await trigger.click();

        const dialog = page.locator('.share-cassette-dialog');
        await expect(dialog).toBeVisible();

        // modal 本身不應橫向溢出
        const overflow = await dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
        expect(overflow, '分享卡橫向溢出').toBe(false);

        // 自訂關閉鈕須落在 viewport 內
        await expectWithinViewport(page, page.getByRole('button', { name: '關閉分享點歌系統' }), '分享卡關閉鈕');
    });
});
