// 行動裝置鍵盤遮擋處理
//
// 手機鍵盤彈出時，會蓋住畫面下半部，導致使用者正在打字的欄位（尤其是表單底部的
// 多行欄位、送出鈕）被擋住看不到。此 hook 在「啟用時」監聽輸入框聚焦與
// visualViewport 變化（鍵盤升起），把目前聚焦的欄位自動捲進可視區中央。
//
// 只在觸控 / 小螢幕介入；桌機不處理，避免聚焦時畫面無謂跳動。
//
// 用法：在表單開啟期間啟用 → `useScrollFocusedIntoView(isOpen)`。
import { useEffect } from 'react';

function isTypingElement(el: Element | null): boolean {
    if (!el) return false;
    const node = el as HTMLElement;
    if (node.isContentEditable) return true;
    return node.tagName === 'TEXTAREA' || node.tagName === 'INPUT';
}

export function useScrollFocusedIntoView(enabled: boolean): void {
    useEffect(() => {
        if (!enabled || typeof window === 'undefined') return;

        // 只在觸控 / 小螢幕處理（桌機沒有鍵盤遮擋問題，介入只會造成跳動）
        const isTouchOrSmall =
            window.matchMedia?.('(pointer: coarse)')?.matches || window.innerWidth < 768;
        if (!isTouchOrSmall) return;

        const scrollActiveIntoView = () => {
            const el = document.activeElement;
            if (!isTypingElement(el)) return;
            (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
        };

        let focusTimer: ReturnType<typeof setTimeout> | undefined;
        const onFocusIn = () => {
            if (!isTypingElement(document.activeElement)) return;
            // 延遲等鍵盤動畫完成再捲，否則位置會算錯
            clearTimeout(focusTimer);
            focusTimer = setTimeout(scrollActiveIntoView, 300);
        };

        const vv = window.visualViewport;
        document.addEventListener('focusin', onFocusIn);
        // 鍵盤升起 / 收合會觸發 visualViewport resize → 重新把聚焦欄位捲回可視區
        vv?.addEventListener('resize', scrollActiveIntoView);

        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener('focusin', onFocusIn);
            vv?.removeEventListener('resize', scrollActiveIntoView);
        };
    }, [enabled]);
}
