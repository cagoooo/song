// 防干擾「端到端」整合測試（輕量版，沿用 vitest + @testing-library，無新 dependency）
//
// composingGuard.test.ts 已單獨測過旗標與焦點監聽；本檔補測「Home 的 gating 契約」：
// 真實聚焦輸入框 → useComposingWhileTyping 判等級 → 覆蓋層群組依等級渲染/淡化/消失。
// 下方 OverlayHarness 忠實複刻 client/src/pages/Home.tsx 的覆蓋層 gating
//   {composingLevel !== 'hard' && (<div className={soft ? 'opacity-30…' : undefined}>…overlays…</div>)}
// 若未來改動該 gating 契約（例如 soft 不再淡化、hard 不再移除），本測試會亮紅燈。
import { render, screen, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useComposingLevel, useComposingWhileTyping } from './composingGuard';

// 與 Home 相同的 gating：hard→不渲染、soft→淡化(opacity-30)、null→正常
function OverlayHarness() {
    useComposingWhileTyping();
    const composingLevel = useComposingLevel();
    return (
        <div>
            <input data-testid="search" type="search" placeholder="搜尋" />
            <input data-testid="formfield" type="text" placeholder="表單欄位" />
            {composingLevel !== 'hard' && (
                <div
                    data-testid="overlay-wrap"
                    className={composingLevel === 'soft' ? 'opacity-30 transition-opacity duration-300' : undefined}
                >
                    <div data-testid="combo-overlay">COMBO ×3</div>
                </div>
            )}
        </div>
    );
}

function focusInput(el: HTMLElement) {
    el.focus();
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
}
function blurInput(el: HTMLElement) {
    el.blur();
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
}

beforeEach(() => {
    vi.useFakeTimers();
});
afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
});

describe('防干擾整合 — 聚焦輸入框 → 覆蓋層 gating', () => {
    it('初始（無焦點）：覆蓋層正常顯示、未淡化', () => {
        render(<OverlayHarness />);
        const wrap = screen.getByTestId('overlay-wrap');
        expect(screen.getByTestId('combo-overlay')).toBeInTheDocument();
        expect(wrap.className).not.toContain('opacity-30');
    });

    it('聚焦搜尋框（soft）：覆蓋層「仍在」但被淡化', () => {
        render(<OverlayHarness />);
        act(() => focusInput(screen.getByTestId('search')));

        const wrap = screen.getByTestId('overlay-wrap');
        // 仍渲染（不像 hard 整組消失）
        expect(screen.getByTestId('combo-overlay')).toBeInTheDocument();
        // 但套上淡化 class
        expect(wrap.className).toContain('opacity-30');
    });

    it('聚焦一般文字框（hard）：覆蓋層整組消失', () => {
        render(<OverlayHarness />);
        act(() => focusInput(screen.getByTestId('formfield')));

        expect(screen.queryByTestId('overlay-wrap')).not.toBeInTheDocument();
        expect(screen.queryByTestId('combo-overlay')).not.toBeInTheDocument();
    });

    it('搜尋框失焦後（延遲判斷）：覆蓋層恢復正常、不再淡化', () => {
        render(<OverlayHarness />);
        const search = screen.getByTestId('search');

        act(() => focusInput(search));
        expect(screen.getByTestId('overlay-wrap').className).toContain('opacity-30');

        act(() => blurInput(search));
        act(() => vi.advanceTimersByTime(150)); // 等 120ms 延遲判斷
        expect(screen.getByTestId('overlay-wrap').className).not.toContain('opacity-30');
    });

    it('從搜尋框（soft）切到表單框（hard）：覆蓋層從淡化變成完全消失', () => {
        render(<OverlayHarness />);
        const search = screen.getByTestId('search');
        const form = screen.getByTestId('formfield');

        act(() => focusInput(search));
        expect(screen.getByTestId('overlay-wrap').className).toContain('opacity-30');

        // 切換到表單欄位 → 升級為 hard → 整組移除
        act(() => {
            blurInput(search);
            focusInput(form);
        });
        expect(screen.queryByTestId('overlay-wrap')).not.toBeInTheDocument();
    });
});
