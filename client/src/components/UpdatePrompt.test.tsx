import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdatePrompt } from './UpdatePrompt';

const swMocks = vi.hoisted(() => ({
    applyUpdate: vi.fn(() => Promise.resolve()),
    dismissUpdate: vi.fn(),
}));

vi.mock('@/hooks/useServiceWorkerUpdate', () => ({
    useServiceWorkerUpdate: () => ({
        updateAvailable: true,
        currentVersion: '4.19.1-old',
        applyUpdate: swMocks.applyUpdate,
        dismissUpdate: swMocks.dismissUpdate,
    }),
}));

vi.mock('@/lib/changelog', () => ({
    getLatestChangelog: () => ({ items: ['測試更新內容'] }),
}));

describe('UpdatePrompt PWA 更新復原', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        swMocks.applyUpdate.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('更新事件逾時後解除鎖定並允許再試一次', async () => {
        render(<UpdatePrompt />);

        fireEvent.click(screen.getByRole('button', { name: '立即更新' }));
        expect(swMocks.applyUpdate).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: '更新中…' })).toBeDisabled();

        await act(async () => {
            vi.advanceTimersByTime(8000);
        });

        expect(screen.getByRole('button', { name: '再試一次' })).toBeEnabled();
        expect(screen.getByText(/更新尚未完成/)).toBeInTheDocument();
    });

    it('Service Worker 會延長 SKIP_WAITING 訊息事件生命週期', () => {
        const swSource = readFileSync(resolve(process.cwd(), 'client/public/sw.js'), 'utf8');
        expect(swSource).toContain('event.waitUntil(self.skipWaiting())');
    });
});
