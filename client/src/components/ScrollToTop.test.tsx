import { render, screen, act, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { ScrollToTop } from './ScrollToTop';

// Mock framer-motion：AnimatePresence 直接渲染 children、motion.button 變純 button，
// 讓顯示/隱藏即時生效（避免退場動畫在 jsdom 殘留按鈕造成斷言不穩）。
vi.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
        button: ({
            children,
            // 濾掉 framer 專用 props，避免變成非法 DOM 屬性
            initial: _i, animate: _a, exit: _e, transition: _t,
            whileHover: _wh, whileTap: _wt,
            ...props
        }: { children?: React.ReactNode;[key: string]: unknown }) => (
            <button {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
        ),
    },
}));

/** 模擬捲到指定 y 並觸發 scroll 事件 */
function scrollWindowTo(y: number) {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
    act(() => {
        window.dispatchEvent(new Event('scroll'));
    });
}

describe('ScrollToTop — D14 智慧捲動顯示', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
    });
    afterEach(() => cleanup());

    const findBtn = () => screen.queryByRole('button', { name: '返回頂部' });

    it('初始（頁頂）不顯示', () => {
        render(<ScrollToTop threshold={300} />);
        expect(findBtn()).toBeNull();
    });

    it('往下捲超過 threshold 時不顯示（D14：往下捲要藏）', () => {
        render(<ScrollToTop threshold={300} />);
        scrollWindowTo(500); // 0 → 500，往下
        expect(findBtn()).toBeNull();
    });

    it('往下捲後再往上捲（仍超過 threshold）才顯示', () => {
        render(<ScrollToTop threshold={300} />);
        scrollWindowTo(500); // 往下，藏
        scrollWindowTo(400); // 往上且 > 300，顯示
        expect(findBtn()).not.toBeNull();
    });

    it('往上捲但已接近頁頂（< threshold）仍不顯示', () => {
        render(<ScrollToTop threshold={300} />);
        scrollWindowTo(500);
        scrollWindowTo(400); // 顯示
        scrollWindowTo(100); // 往上但 < 300，藏
        expect(findBtn()).toBeNull();
    });
});
