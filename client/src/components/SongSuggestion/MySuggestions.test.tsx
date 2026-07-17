// MySuggestions 測試 —「我的推薦」狀態比對 + 慶祝
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const toastSpy = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

// 每個 test 取得乾淨的 mySuggestions 模組（避免全域快取在測試間累積）
let MySuggestions: typeof import('./MySuggestions').MySuggestions;
let addMySuggestion: typeof import('@/lib/mySuggestions').addMySuggestion;

beforeEach(async () => {
    localStorage.clear();
    toastSpy.mockClear();
    vi.resetModules();
    ({ addMySuggestion } = await import('@/lib/mySuggestions'));
    ({ MySuggestions } = await import('./MySuggestions'));
});
afterEach(() => cleanup());

// 測試用最小 suggestion 物件
function sug(id: string, status: string, title = 't' + id) {
    return { id, title, artist: 'a', status, suggestedBy: '', notes: '', createdAt: 1 } as never;
}

describe('MySuggestions', () => {
    it('本機無推薦時不渲染', () => {
        const { container } = render(<MySuggestions suggestions={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('顯示我的推薦 + 對應即時狀態徽章', () => {
        addMySuggestion({ id: 'X', title: '小幸運', artist: '田馥甄', ts: 1, seenStatus: 'pending' });
        render(<MySuggestions suggestions={[sug('X', 'pending', '小幸運')]} />);
        expect(screen.getByText('小幸運')).toBeInTheDocument();
        expect(screen.getByText('待審核')).toBeInTheDocument();
    });

    it('被採納時顯示「已採納」徽章並彈出慶祝 toast', () => {
        addMySuggestion({ id: 'Y', title: '崇拜', artist: '', ts: 1, seenStatus: 'pending' });
        render(<MySuggestions suggestions={[sug('Y', 'approved', '崇拜')]} />);
        expect(screen.getByText('已採納 🎉')).toBeInTheDocument();
        expect(toastSpy).toHaveBeenCalledTimes(1);
        expect(toastSpy.mock.calls[0][0].title).toContain('採納');
    });

    it('加入歌單時顯示「已加入歌單」並慶祝', () => {
        addMySuggestion({ id: 'Z', title: 'APT', artist: '', ts: 1, seenStatus: 'pending' });
        render(<MySuggestions suggestions={[sug('Z', 'added_to_playlist', 'APT')]} />);
        expect(screen.getByText('已加入歌單 🎉')).toBeInTheDocument();
        expect(toastSpy).toHaveBeenCalledTimes(1);
    });

    it('已看過的好狀態不重複慶祝', () => {
        addMySuggestion({ id: 'W', title: '理想', artist: '', ts: 1, seenStatus: 'approved' });
        render(<MySuggestions suggestions={[sug('W', 'approved', '理想')]} />);
        expect(toastSpy).not.toHaveBeenCalled();
    });

    it('歌單找不到（被刪）顯示「已下架」', () => {
        addMySuggestion({ id: 'gone', title: '消失的歌', artist: '', ts: 1, seenStatus: 'pending' });
        render(<MySuggestions suggestions={[sug('other', 'pending')]} />);
        expect(screen.getByText('已下架')).toBeInTheDocument();
        expect(screen.getByText('消失的歌')).toBeInTheDocument();
    });

    it('向左滑超過門檻會移除本機推薦追蹤', () => {
        addMySuggestion({ id: 'swipe', title: '滑掉這首', artist: '歌手', ts: 1, seenStatus: 'pending' });
        render(<MySuggestions suggestions={[sug('swipe', 'pending', '滑掉這首')]} />);

        const row = screen.getByText('滑掉這首').closest('li');
        expect(row).not.toBeNull();
        fireEvent.touchStart(row!, { touches: [{ clientX: 180, clientY: 20 }] });
        fireEvent.touchMove(row!, { touches: [{ clientX: 80, clientY: 22 }] });
        fireEvent.touchEnd(row!, { changedTouches: [{ clientX: 80, clientY: 22 }] });

        expect(screen.queryByText('滑掉這首')).not.toBeInTheDocument();
        expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: '已移除「滑掉這首」' }));
    });
});
