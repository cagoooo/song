// composingGuard 測試 — 「專注輸入」防干擾旗標
//
// 因為模組持有全域計數（composingCount），每個 test 用 vi.resetModules() + 動態 import
// 取得乾淨的模組狀態，避免測試之間互相污染。
import { renderHook, cleanup, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type GuardModule = typeof import('./composingGuard');

let guard: GuardModule;

beforeEach(async () => {
    vi.resetModules();
    guard = await import('./composingGuard');
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    // 清掉測試中可能殘留在 body 的節點
    document.body.innerHTML = '';
});

describe('composingGuard — beginComposing / useIsComposing', () => {
    it('初始狀態應為 false', () => {
        const { result } = renderHook(() => guard.useIsComposing());
        expect(result.current).toBe(false);
    });

    it('beginComposing() 後應變為 true，release() 後回到 false', () => {
        const { result } = renderHook(() => guard.useIsComposing());

        let release!: () => void;
        act(() => {
            release = guard.beginComposing();
        });
        expect(result.current).toBe(true);

        act(() => {
            release();
        });
        expect(result.current).toBe(false);
    });

    it('可重入：兩個來源各自 enter，釋放一個仍為 true，全部釋放才 false', () => {
        const { result } = renderHook(() => guard.useIsComposing());

        let releaseA!: () => void;
        let releaseB!: () => void;
        act(() => {
            releaseA = guard.beginComposing();
            releaseB = guard.beginComposing();
        });
        expect(result.current).toBe(true);

        act(() => {
            releaseA();
        });
        // 還有 B 沒釋放 → 維持 true
        expect(result.current).toBe(true);

        act(() => {
            releaseB();
        });
        expect(result.current).toBe(false);
    });

    it('release() 具冪等性：重複呼叫只生效一次，不會把計數扣成負', () => {
        const { result } = renderHook(() => guard.useIsComposing());

        let releaseA!: () => void;
        let releaseB!: () => void;
        act(() => {
            releaseA = guard.beginComposing();
            releaseB = guard.beginComposing();
        });

        act(() => {
            releaseA();
            releaseA(); // 重複釋放 A — 應為 no-op
        });
        // 若沒有冪等保護，計數會變 0（誤判 false）；正確應仍為 true（B 還在）
        expect(result.current).toBe(true);

        act(() => {
            releaseB();
        });
        expect(result.current).toBe(false);
    });
});

describe('composingGuard — 分級（hard / soft）', () => {
    it('預設等級為 hard', () => {
        const { result } = renderHook(() => guard.useComposingLevel());
        expect(result.current).toBe(null);

        let release!: () => void;
        act(() => {
            release = guard.beginComposing();
        });
        expect(result.current).toBe('hard');

        act(() => release());
        expect(result.current).toBe(null);
    });

    it('beginComposing("soft") → 等級為 soft', () => {
        const { result } = renderHook(() => guard.useComposingLevel());
        let release!: () => void;
        act(() => {
            release = guard.beginComposing('soft');
        });
        expect(result.current).toBe('soft');
        act(() => release());
        expect(result.current).toBe(null);
    });

    it('hard 優先於 soft：同時存在時等級為 hard，hard 釋放後降為 soft', () => {
        const { result } = renderHook(() => guard.useComposingLevel());

        let releaseSoft!: () => void;
        let releaseHard!: () => void;
        act(() => {
            releaseSoft = guard.beginComposing('soft');
            releaseHard = guard.beginComposing('hard');
        });
        expect(result.current).toBe('hard');

        act(() => releaseHard());
        // hard 沒了 → 剩 soft
        expect(result.current).toBe('soft');

        act(() => releaseSoft());
        expect(result.current).toBe(null);
    });
});

describe('composingGuard — useComposingWhileTyping（焦點監聽）', () => {
    // 建立並聚焦一個元素，同時派發會冒泡到 document 的 focus 事件，
    // 模擬真實使用者點擊輸入框（程式化 .focus() 在某些環境不會派發冒泡 focusin）
    function focusEl(el: HTMLElement) {
        document.body.appendChild(el);
        el.focus();
        el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    }
    function blurEl(el: HTMLElement) {
        el.blur();
        el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    }

    function makeInput(type = 'text') {
        const input = document.createElement('input');
        input.type = type;
        return input;
    }

    it('聚焦文字 input → 進入專注輸入模式', () => {
        const { result } = renderHook(() => {
            guard.useComposingWhileTyping();
            return guard.useIsComposing();
        });
        expect(result.current).toBe(false);

        const input = makeInput('text');
        act(() => focusEl(input));
        expect(result.current).toBe(true);
    });

    it('聚焦 textarea / search / email 等打字類型 → 進入專注輸入模式', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => {
            guard.useComposingWhileTyping();
            return guard.useIsComposing();
        });

        for (const make of [
            () => document.createElement('textarea'),
            () => makeInput('search'),
            () => makeInput('email'),
            () => makeInput('password'),
        ]) {
            const el = make() as HTMLElement;
            act(() => focusEl(el));
            expect(result.current).toBe(true);
            act(() => blurEl(el));
            act(() => vi.advanceTimersByTime(150));
        }
    });

    it('聚焦非打字元素（button / checkbox）→ 不觸發', () => {
        const { result } = renderHook(() => {
            guard.useComposingWhileTyping();
            return guard.useIsComposing();
        });

        const button = document.createElement('button');
        act(() => focusEl(button));
        expect(result.current).toBe(false);

        const checkbox = makeInput('checkbox');
        act(() => focusEl(checkbox));
        expect(result.current).toBe(false);
    });

    it('失焦後（延遲判斷）應解除專注輸入模式', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => {
            guard.useComposingWhileTyping();
            return guard.useIsComposing();
        });

        const input = makeInput('text');
        act(() => focusEl(input));
        expect(result.current).toBe(true);

        act(() => blurEl(input));
        // 延遲 120ms 才判斷 → 還沒到時間仍為 true
        act(() => vi.advanceTimersByTime(50));
        expect(result.current).toBe(true);

        act(() => vi.advanceTimersByTime(120));
        expect(result.current).toBe(false);
    });

    it('在兩個輸入框之間切換不應短暫掉出專注模式（避免覆蓋層閃現）', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => {
            guard.useComposingWhileTyping();
            return guard.useIsComposing();
        });

        const a = makeInput('text');
        const b = makeInput('text');
        document.body.appendChild(a);
        document.body.appendChild(b);

        act(() => {
            a.focus();
            a.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        });
        expect(result.current).toBe(true);

        // 模擬切換：A 失焦 → B 立刻聚焦（focusout 後 focusin 在延遲內到達）
        act(() => {
            a.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
            b.focus();
            b.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        });
        // 切換期間應持續 true
        expect(result.current).toBe(true);

        // 即使延遲時間到了，因為 B 仍聚焦 → 維持 true
        act(() => vi.advanceTimersByTime(150));
        expect(result.current).toBe(true);
    });

    it('聚焦搜尋框 → soft 等級；聚焦一般文字框 → hard 等級', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => {
            guard.useComposingWhileTyping();
            return guard.useComposingLevel();
        });

        const search = makeInput('search');
        act(() => focusEl(search));
        expect(result.current).toBe('soft');
        act(() => blurEl(search));
        act(() => vi.advanceTimersByTime(150));
        expect(result.current).toBe(null);

        const text = makeInput('text');
        act(() => focusEl(text));
        expect(result.current).toBe('hard');
    });

    it('data-dnd="off" 讓輸入框完全不觸發防干擾（搜尋框例外）', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => {
            guard.useComposingWhileTyping();
            return guard.useComposingLevel();
        });

        // 模擬 SearchBar：search 框掛 data-dnd="off"
        const search = makeInput('search');
        search.setAttribute('data-dnd', 'off');
        document.body.appendChild(search);

        act(() => {
            search.focus();
            search.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        });
        // 預設 search→soft，但 data-dnd="off" 覆寫 → null（不觸發）
        expect(result.current).toBe(null);
    });

    it('data-dnd="soft" 祖先可把一般輸入框降為 soft', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => {
            guard.useComposingWhileTyping();
            return guard.useComposingLevel();
        });

        const wrap = document.createElement('div');
        wrap.setAttribute('data-dnd', 'soft');
        const text = makeInput('text');
        wrap.appendChild(text);
        document.body.appendChild(wrap);

        act(() => {
            text.focus();
            text.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        });
        expect(result.current).toBe('soft');
    });

    it('unmount 後應解除登記並移除監聽（不殘留專注模式）', () => {
        vi.useFakeTimers();
        const { result, unmount } = renderHook(() => {
            guard.useComposingWhileTyping();
            return guard.useIsComposing();
        });

        const input = makeInput('text');
        act(() => focusEl(input));
        expect(result.current).toBe(true);

        // 卸載 → effect cleanup 應呼叫 release，並移除 document 監聽
        act(() => {
            unmount();
        });

        // 用另一個觀察者確認全域計數已歸零
        const { result: observer } = renderHook(() => guard.useIsComposing());
        expect(observer.current).toBe(false);
    });
});
