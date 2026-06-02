// 表單草稿暫存工具 — 把使用者打到一半的表單內容存進 localStorage，
// 避免誤關 / 切走 / 重新整理就整篇消失。所有操作都包 try/catch：
// 無痕模式、localStorage 被停用、配額爆掉時靜默失敗，不影響表單主流程。

/** 讀取草稿；解析失敗或不存在回 null。 */
export function loadDraft<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/** 寫入草稿。 */
export function saveDraft<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // 配額 / 隱私模式 → 放棄暫存，不影響輸入
    }
}

/** 清除草稿（送出成功 / 內容清空時呼叫）。 */
export function clearDraft(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}
