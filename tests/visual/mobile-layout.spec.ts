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

test.describe('返回頂部按鈕初始狀態', () => {
    test('剛進頁面（未捲動）不顯示返回頂部按鈕', async ({ page }) => {
        await waitForHome(page);
        // 捲動方向行為（往下藏、往上顯示）改由 ScrollToTop.test.tsx 元件測試精準驗證，
        // E2E 只確認版面與初始狀態（頁面內容高度在 CI 不固定，不適合做捲動行為斷言）。
        const scrollBtn = page.locator('.editorial-scrolltop');
        await expect(scrollBtn).not.toBeVisible();
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
