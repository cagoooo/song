// liveRecap 測試 — 「現場回顧」即時亮點 store
import { renderHook, act, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { recordHighlight, markAllSeen, resetRecap, useLiveRecap } from './liveRecap';

beforeEach(() => resetRecap());
afterEach(() => { cleanup(); resetRecap(); });

function hl(id: string, missed = false) {
    return { id, kind: 'darkhorse' as const, title: 't', detail: 'd', missed };
}

describe('liveRecap', () => {
    it('recordHighlight 新增並累計未讀', () => {
        const { result } = renderHook(() => useLiveRecap());
        act(() => recordHighlight(hl('a')));
        act(() => recordHighlight(hl('b')));
        expect(result.current.items).toHaveLength(2);
        expect(result.current.unseen).toBe(2);
        // 最新在前
        expect(result.current.items[0].id).toBe('b');
    });

    it('依 id 去重', () => {
        const { result } = renderHook(() => useLiveRecap());
        act(() => recordHighlight(hl('x')));
        act(() => recordHighlight(hl('x')));
        expect(result.current.items).toHaveLength(1);
    });

    it('markAllSeen 歸零未讀（items 保留）', () => {
        const { result } = renderHook(() => useLiveRecap());
        act(() => recordHighlight(hl('a')));
        act(() => markAllSeen());
        expect(result.current.unseen).toBe(0);
        expect(result.current.items).toHaveLength(1);
    });

    it('保留 missed 旗標', () => {
        const { result } = renderHook(() => useLiveRecap());
        act(() => recordHighlight(hl('m', true)));
        expect(result.current.items[0].missed).toBe(true);
    });

    it('getSnapshot 穩定參考（無變更不換 reference）', () => {
        const { result, rerender } = renderHook(() => useLiveRecap());
        act(() => recordHighlight(hl('a')));
        const first = result.current;
        rerender();
        expect(result.current).toBe(first);
    });

    it('最多保留 20 筆', () => {
        const { result } = renderHook(() => useLiveRecap());
        act(() => {
            for (let i = 0; i < 25; i++) recordHighlight(hl('n' + i));
        });
        expect(result.current.items).toHaveLength(20);
    });
});
