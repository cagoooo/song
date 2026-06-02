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
import { useSyncExternalStore } from 'react';

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
