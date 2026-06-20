/**
 * mobile-layout.spec.ts — 手機 RWD 版面回歸測試
 *
 * 策略：不比對像素截圖（平台差異大），改用 DOM assertions：
 *   • 無橫向溢出（scrollWidth <= clientWidth）
 *   • 關鍵 UI 元素在 viewport 內可見
 *   • FAB stack 不超出右邊界
 *
 * 若需要加入截圖比對，改用 expect(page).toHaveScreenshot() 並執行一次
 * `npx playwright test --update-snapshots` 建立基準。
 */
import { test, expect } from '@playwright/test';

const BASE = '/song/';

// 等待頁面關鍵元素出現（首頁 Hero 卡帶標題）
async function waitForHome(page: Parameters<typeof test>[1]['page']) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    // 等 React 渲染出主要內容（body 不再是空殼）
    await page.waitForSelector('body > #root > *', { timeout: 10_000 });
}

test.describe('無橫向溢出', () => {
    test('首頁 body 無橫向捲動', async ({ page }) => {
        await waitForHome(page);

        const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasOverflow, '頁面出現橫向溢出').toBe(false);
    });

    test('body max-width 100% 已套用', async ({ page }) => {
        await waitForHome(page);

        const bodyOverflow = await page.evaluate(() => {
            const body = document.body;
            return body.scrollWidth > body.clientWidth;
        });
        expect(bodyOverflow, 'body 橫向溢出').toBe(false);
    });
});

test.describe('FAB stack 不遮擋右邊界', () => {
    test('FloatingStack 不超出 viewport 右邊', async ({ page }) => {
        await waitForHome(page);

        // 等待可能出現的 FAB 按鈕（返回頂部或管理員登入）
        const fabStack = page.locator('.fab-stack');
        const count = await fabStack.count();
        if (count === 0) {
            test.skip();
            return;
        }

        const box = await fabStack.boundingBox();
        if (!box) return;

        const viewportWidth = page.viewportSize()!.width;
        expect(box.x + box.width, 'FAB stack 超出 viewport 右邊').toBeLessThanOrEqual(viewportWidth + 1);
    });
});

test.describe('返回頂部按鈕行為', () => {
    test('初始不顯示返回頂部按鈕', async ({ page }) => {
        await waitForHome(page);
        // 剛進頁面未捲動，不應出現
        const scrollBtn = page.locator('.editorial-scrolltop');
        await expect(scrollBtn).not.toBeVisible();
    });

    test('往下捲後再往上捲，返回頂部按鈕出現', async ({ page }) => {
        await waitForHome(page);

        // 往下捲超過 threshold（300px）
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(100);

        // 此時往下捲，按鈕應隱藏（D14 邏輯）
        const scrollBtnAfterDown = page.locator('.editorial-scrolltop');
        await expect(scrollBtnAfterDown).not.toBeVisible();

        // 再往上捲，按鈕應出現
        await page.evaluate(() => window.scrollBy(0, -100));
        await page.waitForTimeout(200);
        await expect(scrollBtnAfterDown).toBeVisible();
    });
});

test.describe('列印預覽關閉按鈕', () => {
    test('預設狀態沒有列印預覽覆蓋層', async ({ page }) => {
        await waitForHome(page);

        const ppClose = page.locator('.pp-close');
        await expect(ppClose).not.toBeVisible();
    });
});

test.describe('關鍵元素可見性', () => {
    test('首頁根元素存在', async ({ page }) => {
        await waitForHome(page);
        await expect(page.locator('#root')).toBeVisible();
    });
});
