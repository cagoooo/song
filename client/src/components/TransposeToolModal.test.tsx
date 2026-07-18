import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransposeToolModal } from './TransposeToolModal';
import { addSongWithChart, updateSongChart } from '@/lib/firestore';

vi.mock('@/lib/firestore', () => ({
    addSongWithChart: vi.fn(),
    updateSongChart: vi.fn(),
}));

describe('TransposeToolModal 全螢幕看譜', () => {
    beforeEach(() => {
        vi.mocked(addSongWithChart).mockReset();
        vi.mocked(updateSongChart).mockReset().mockResolvedValue();
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
            configurable: true,
            value: vi.fn(function scrollTo(this: HTMLElement, options: ScrollToOptions) {
                this.scrollLeft = options.left ?? 0;
                this.scrollTop = options.top ?? 0;
            }),
        });
    });

    it('從歌單歌曲開啟時自動帶入資料，並以選定調性覆寫原歌曲吉他譜', async () => {
        render(
            <TransposeToolModal
                isOpen
                onClose={vi.fn()}
                isAdmin
                sourceSong={{ id: 'song-123', title: '我還有個夢', artist: '小宇', notes: '現場版' }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: '＋ 載入範例' }));
        fireEvent.click(within(screen.getByRole('group', { name: '目標調' })).getByRole('button', { name: 'D' }));
        fireEvent.click(screen.getByRole('button', { name: '💾 存進歌庫' }));

        expect(screen.getByLabelText('歌名')).toHaveValue('我還有個夢');
        expect(screen.getByLabelText('歌手')).toHaveValue('小宇');
        expect(screen.getByLabelText('主理人筆記')).toHaveValue('現場版');
        expect(screen.getByText(/將覆寫「我還有個夢－小宇」/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '確認更新' }));
        await waitFor(() => {
            expect(updateSongChart).toHaveBeenCalledWith('song-123', expect.objectContaining({
                title: '我還有個夢',
                artist: '小宇',
                songKey: 'D',
            }));
        });
        expect(addSongWithChart).not.toHaveBeenCalled();
        expect(await screen.findByText(/已更新「我還有個夢」的吉他譜（D調）/)).toBeInTheDocument();
    });

    it('使用獨立 Dialog 鋪滿視窗，重設縮放時同步回到左上原點', async () => {
        render(<TransposeToolModal isOpen onClose={vi.fn()} isAdmin />);

        fireEvent.click(screen.getByRole('button', { name: '＋ 載入範例' }));
        fireEvent.click(screen.getByRole('button', { name: '⛶ 放大全螢幕' }));

        const originalDialog = screen.getByRole('dialog', { name: '快速轉調工具' });
        const fullscreenDialog = await screen.findByRole('dialog', { name: '全螢幕看譜' });
        expect(originalDialog).not.toContainElement(fullscreenDialog);
        expect(fullscreenDialog).toHaveClass('ttm-fullscreen-dialog');
        expect(screen.getByLabelText('全螢幕看譜功能列')).toBeInTheDocument();
        expect(screen.getByText('字級')).toBeInTheDocument();
        expect(screen.getByText('畫面')).toBeInTheDocument();

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
