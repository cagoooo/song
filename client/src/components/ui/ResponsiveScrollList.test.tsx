// ResponsiveScrollList 測試 — 響應式長清單捲動容器
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { ResponsiveScrollList } from './ResponsiveScrollList';

afterEach(() => cleanup());

describe('ResponsiveScrollList', () => {
    it('渲染 children', () => {
        render(
            <ResponsiveScrollList>
                <div>項目一</div>
                <div>項目二</div>
            </ResponsiveScrollList>
        );
        expect(screen.getByText('項目一')).toBeInTheDocument();
        expect(screen.getByText('項目二')).toBeInTheDocument();
    });

    it('套用桌機限高 + 原生捲動 + 細捲軸 class', () => {
        const { container } = render(<ResponsiveScrollList>x</ResponsiveScrollList>);
        const el = container.firstChild as HTMLElement;
        // 預設限高
        expect(el.className).toContain('sm:max-h-[520px]');
        // 桌機原生捲動
        expect(el.className).toContain('sm:overflow-y-auto');
        expect(el.className).toContain('sm:overscroll-contain');
        // 細捲軸
        expect(el.className).toContain('[scrollbar-width:thin]');
    });

    it('可自訂 maxHeightClass', () => {
        const { container } = render(
            <ResponsiveScrollList maxHeightClass="sm:max-h-[300px]">x</ResponsiveScrollList>
        );
        const el = container.firstChild as HTMLElement;
        expect(el.className).toContain('sm:max-h-[300px]');
        expect(el.className).not.toContain('sm:max-h-[520px]');
    });

    it('合併外部 className（如 grid 版面）', () => {
        const { container } = render(
            <ResponsiveScrollList className="grid grid-cols-1 md:grid-cols-2 gap-4">x</ResponsiveScrollList>
        );
        const el = container.firstChild as HTMLElement;
        expect(el.className).toContain('grid');
        expect(el.className).toContain('md:grid-cols-2');
    });

    it('透傳原生 div 屬性（如 data-testid / aria-label）', () => {
        render(
            <ResponsiveScrollList data-testid="scroll-list" aria-label="清單">
                x
            </ResponsiveScrollList>
        );
        const el = screen.getByTestId('scroll-list');
        expect(el).toHaveAttribute('aria-label', '清單');
    });
});
