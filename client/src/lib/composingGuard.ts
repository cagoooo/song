// 「專注輸入」防干擾旗標（分級版）
//
// 使用者在輸入框打字時，全站即時投票會觸發連擊大字、黑馬慶祝、全站熱度、
// 互動動畫等全螢幕覆蓋層（z-index 9997~9999），蓋在輸入框上造成干擾。
// 此模組提供全域、可重入、分級的旗標：
//   - 'hard'（表單）：完全暫停那些覆蓋層 — 專心填表，不被任何東西打斷。
//   - 'soft'（搜尋）：覆蓋層不消失，只降低存在感（淡化），讓使用者搜尋時
//     仍感受得到現場熱度，但不糊臉。
// 多個 'hard' 同時存在以 hard 為準（hard 優先於 soft）。
//
// 用法：
//   - 輸入端：`const release = beginComposing('hard' | 'soft')`，cleanup 呼叫 release()。
//   - 顯示端：`const level = useComposingLevel()` → 'hard' 不渲染、'soft' 淡化、null 正常；
//     或沿用 `useIsComposing()`（任一等級都為 true）。
import { useEffect, useSyncExternalStore } from 'react';

export type ComposingLevel = 'hard' | 'soft';

// 分等級計數 — 允許多個來源各自 enter/exit 而不互相干擾
let hardCount = 0;
let softCount = 0;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((l) => l());
}

// 有效等級：hard 優先於 soft
function currentLevel(): ComposingLevel | null {
    if (hardCount > 0) return 'hard';
    if (softCount > 0) return 'soft';
    return null;
}

/**
 * 進入「專注輸入」模式（可重入）。
 * @param level 'hard'（預設，完全暫停覆蓋層）或 'soft'（僅淡化）。
 * @returns 解除函式；重複呼叫只生效一次，可安全用於 effect cleanup。
 */
export function beginComposing(level: ComposingLevel = 'hard'): () => void {
    if (level === 'hard') hardCount += 1;
    else softCount += 1;
    emit();

    let released = false;
    return () => {
        if (released) return;
        released = true;
        if (level === 'hard') hardCount = Math.max(0, hardCount - 1);
        else softCount = Math.max(0, softCount - 1);
        emit();
    };
}

function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

/** 目前的專注輸入等級：'hard' | 'soft' | null。 */
export function useComposingLevel(): ComposingLevel | null {
    return useSyncExternalStore(subscribe, currentLevel, currentLevel);
}

/** 是否正處於「專注輸入」模式（hard 或 soft 任一都為 true）。 */
export function useIsComposing(): boolean {
    return useComposingLevel() !== null;
}

// 視為「文字輸入」的元素：input（文字類型）、textarea、contentEditable
function isTextEntry(el: Element | null): boolean {
    if (!el) return false;
    const node = el as HTMLElement;
    if (node.isContentEditable) return true;
    const tag = node.tagName;
    if (tag === 'TEXTAREA') return true;
    if (tag === 'INPUT') {
        const type = (node as HTMLInputElement).type;
        // 只擋會打字的類型，排除 checkbox / radio / button / range / file / color 等
        return ['text', 'search', 'email', 'password', 'number', 'tel', 'url', ''].includes(type);
    }
    return false;
}

// 判斷某元素應觸發的等級：
//  - 非文字輸入 → null（不觸發）
//  - 搜尋框（type=search）→ 'soft'（搜尋短暫，淡化即可，保留現場感）
//  - 可用 data-dnd="soft|hard" 屬性顯式覆寫（掛在元素或其祖先）
//  - 其餘文字輸入 → 'hard'（專心填表）
function levelForElement(el: Element | null): ComposingLevel | null {
    if (!isTextEntry(el)) return null;
    const node = el as HTMLElement;
    const override = node.closest('[data-dnd]')?.getAttribute('data-dnd');
    if (override === 'off') return null; // 顯式例外：此輸入框完全不觸發防干擾（覆蓋層照常顯示）
    if (override === 'soft' || override === 'hard') return override;
    if (node.tagName === 'INPUT' && (node as HTMLInputElement).type === 'search') return 'soft';
    return 'hard';
}

/**
 * 全域焦點監聽：任一文字輸入框獲得焦點即進入對應等級的「專注輸入」模式，失焦即解除。
 * 只需在 App 樹中掛載「一次」（例如首頁）即可讓全站輸入框自動防干擾，無需逐一接線。
 * 搜尋框 → soft（淡化）、其餘輸入框 → hard（暫停）。
 * 在輸入框之間切換時以短延遲合併 focusout→focusin，避免覆蓋層閃現。
 */
export function useComposingWhileTyping(): void {
    useEffect(() => {
        let release: (() => void) | null = null;
        let activeLevel: ComposingLevel | null = null;
        let blurTimer: ReturnType<typeof setTimeout> | undefined;

        // 切換到目標等級（null = 解除）；等級相同則維持，不重新登記（避免閃現）
        const applyLevel = (level: ComposingLevel | null) => {
            if (level === activeLevel) return;
            if (release) {
                release();
                release = null;
            }
            activeLevel = level;
            if (level) release = beginComposing(level);
        };

        const onFocusIn = () => {
            clearTimeout(blurTimer);
            applyLevel(levelForElement(document.activeElement));
        };
        const onFocusOut = () => {
            // 延遲再判斷 — 在兩個輸入框之間切換時，focusout 與 focusin 會接連觸發，
            // 延遲可避免中間短暫無焦點造成覆蓋層閃一下
            clearTimeout(blurTimer);
            blurTimer = setTimeout(() => {
                applyLevel(levelForElement(document.activeElement));
            }, 120);
        };

        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('focusout', onFocusOut);
        // 掛載當下若已聚焦在輸入框（例如熱重載）也要同步
        applyLevel(levelForElement(document.activeElement));

        return () => {
            clearTimeout(blurTimer);
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('focusout', onFocusOut);
            applyLevel(null);
        };
    }, []);
}
