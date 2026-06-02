// 「專注輸入」防干擾旗標
//
// 使用者在表單（如：推薦新歌）打字時，全站即時投票會觸發連擊大字、黑馬慶祝、
// 全站熱度、互動動畫等全螢幕覆蓋層（z-index 9997~9999），整個蓋在輸入框上方
// 造成視覺衝擊、干擾輸入。此模組提供一個全域可重入的旗標：表單開啟時登記
// 「正在輸入」，這段期間畫面暫停那些慶祝／互動覆蓋層；表單關閉即恢復。
//
// 用法：
//   - 輸入端：在表單開啟的 effect 裡呼叫 `const release = beginComposing()`，
//     並於 cleanup 呼叫 `release()`。
//   - 顯示端：`const isComposing = useIsComposing()`，為 true 時不渲染干擾性覆蓋層。
import { useEffect, useSyncExternalStore } from 'react';

// 計數而非布林 — 允許多個來源（多個表單）各自 enter/exit 而不互相干擾
let composingCount = 0;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((l) => l());
}

/**
 * 進入「專注輸入」模式（可重入）。
 * @returns 解除函式；重複呼叫只生效一次，可安全用於 effect cleanup。
 */
export function beginComposing(): () => void {
    composingCount += 1;
    emit();

    let released = false;
    return () => {
        if (released) return;
        released = true;
        composingCount = Math.max(0, composingCount - 1);
        emit();
    };
}

function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

function getSnapshot(): boolean {
    return composingCount > 0;
}

/** 是否正處於「專注輸入」模式（任一表單正在輸入）。 */
export function useIsComposing(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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

/**
 * 全域焦點監聽：只要任一文字輸入框獲得焦點即進入「專注輸入」模式，失焦即解除。
 * 只需在 App 樹中掛載「一次」（例如首頁），即可讓全站所有輸入框自動防干擾，
 * 無需逐一接線。在輸入框之間切換時以短延遲合併 focusout→focusin，避免覆蓋層閃現。
 */
export function useComposingWhileTyping(): void {
    useEffect(() => {
        let release: (() => void) | null = null;
        let blurTimer: ReturnType<typeof setTimeout> | undefined;

        const enter = () => {
            if (!release) release = beginComposing();
        };
        const exit = () => {
            if (release) {
                release();
                release = null;
            }
        };

        const onFocusIn = () => {
            clearTimeout(blurTimer);
            if (isTextEntry(document.activeElement)) enter();
            else exit();
        };
        const onFocusOut = () => {
            // 延遲再判斷 — 在兩個輸入框之間切換時，focusout 與 focusin 會接連觸發，
            // 延遲可避免中間短暫無焦點造成覆蓋層閃一下
            clearTimeout(blurTimer);
            blurTimer = setTimeout(() => {
                if (!isTextEntry(document.activeElement)) exit();
            }, 120);
        };

        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('focusout', onFocusOut);
        // 掛載當下若已聚焦在輸入框（例如熱重載）也要同步
        if (isTextEntry(document.activeElement)) enter();

        return () => {
            clearTimeout(blurTimer);
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('focusout', onFocusOut);
            exit();
        };
    }, []);
}
