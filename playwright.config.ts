import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 視覺回歸 + RWD 版面測試
 * 執行：npx playwright test
 * 更新截圖基準：npx playwright test --update-snapshots
 *
 * 測試目標
 *   - 375px (iPhone SE)  — 最小手機尺寸，最容易爆版
 *   - 430px (iPhone 15 Pro) — 主流大手機
 *   - 768px (iPad Mini) — 平板最小斷點
 *
 * CI 注意：截圖基準以 Linux/Chromium 為準，macOS/Windows 需加 --update-snapshots 重建。
 */
export default defineConfig({
    testDir: './tests/visual',
    timeout: 30_000,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'on-failure' }]],
    use: {
        baseURL: 'http://localhost:5173',
        headless: true,
        screenshot: 'only-on-failure',
        video: 'off',
        /* 不等 Firebase 實際登入，只測版面 */
        javaScriptEnabled: true,
    },
    projects: [
        {
            name: 'mobile-375',
            use: {
                ...devices['iPhone SE'],
                viewport: { width: 375, height: 667 },
            },
        },
        {
            name: 'mobile-430',
            use: {
                ...devices['iPhone 15 Pro'],
                viewport: { width: 430, height: 932 },
            },
        },
        {
            name: 'tablet-768',
            use: {
                ...devices['iPad Mini'],
                viewport: { width: 768, height: 1024 },
            },
        },
    ],
    webServer: {
        command: 'npm run dev -- --port 5173',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
    },
});
