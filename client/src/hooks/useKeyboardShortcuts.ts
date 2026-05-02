import { useEffect } from 'react';

export type ShortcutHandler = (e: KeyboardEvent) => void;

export interface Shortcut {
    /** 'cmd+k', 'shift+/', '/', '?', 'escape' (lower-case 字串) */
    keys: string;
    handler: ShortcutHandler;
    /** 描述 — 用於 help modal */
    description: string;
    /** 即使在 input/textarea focused 也觸發（如 Esc） */
    allowInInput?: boolean;
}

function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

function matches(e: KeyboardEvent, keys: string): boolean {
    const parts = keys.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const needCmd = parts.includes('cmd') || parts.includes('ctrl');
    const needShift = parts.includes('shift');
    const needAlt = parts.includes('alt');

    const cmdHeld = e.metaKey || e.ctrlKey;
    if (needCmd !== cmdHeld) return false;
    if (needShift !== e.shiftKey) return false;
    if (needAlt !== e.altKey) return false;

    return e.key.toLowerCase() === key;
}

/**
 * 註冊全域鍵盤快捷鍵。
 * - 預設在 input/textarea/contentEditable 內不觸發（除非 allowInInput=true）
 * - 多重快捷鍵共用一個 listener，效能好
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const inInput = isTypingTarget(e.target);
            for (const sc of shortcuts) {
                if (inInput && !sc.allowInInput) continue;
                if (matches(e, sc.keys)) {
                    e.preventDefault();
                    sc.handler(e);
                    return;
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [shortcuts]);
}
