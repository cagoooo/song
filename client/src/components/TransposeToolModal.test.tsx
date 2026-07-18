import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransposeToolModal } from './TransposeToolModal';

vi.mock('@/lib/firestore', () => ({
    addSongWithChart: vi.fn(),
}));

describe('TransposeToolModal 全螢幕看譜', () => {
    beforeEach(() => {
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
            configurable: true,
            value: vi.fn(function scrollTo(this: HTMLElement, options: ScrollToOptions) {
                this.scrollLeft = options.left ?? 0;
                this.scrollTop = options.top ?? 0;
            }),
        });
    });

    it('使用獨立 Dialog 鋪滿視窗，重設縮放時同步回到左上原點', async () => {
        render(<TransposeToolModal isOpen onClose={vi.fn()} isAdmin />);

        fireEvent.click(screen.getByRole('button', { name: '＋ 載入範例' }));
        fireEvent.click(screen.getByRole('button', { name: '⛶ 放大全螢幕' }));

        const originalDialog = screen.getByRole('dialog', { name: '快速轉調工具' });
        const fullscreenDialog = await screen.findByRole('dialog', { name: '全螢幕看譜' });
        expect(originalDialog).not.toContainElement(fullscreenDialog);
        expect(fullscreenDialog).toHaveClass('ttm-fullscreen-dialog');

        const scrollArea = fullscreenDialog.querySelector<HTMLElement>('.ttm-fullscreen-scroll');
        expect(scrollArea).not.toBeNull();
        scrollArea!.scrollLeft = 120;
        scrollArea!.scrollTop = 240;

        fireEvent.pointerDown(screen.getByRole('button', { name: '放大看譜' }));
        await screen.findByText('110%');
        fireEvent.pointerDown(screen.getByRole('button', { name: '重設看譜縮放' }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: '重設看譜縮放' })).toHaveTextContent('100%');
            expect(scrollArea!.scrollLeft).toBe(0);
            expect(scrollArea!.scrollTop).toBe(0);
        });
    });
});
