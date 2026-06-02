// useMissedHypeReplay 測試 — 被抑制事件補播佇列
import { renderHook, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useMissedHypeReplay } from './useMissedHypeReplay';
import type { DarkHorseEvent } from './useDarkHorse';
import type { HypeEvent } from './useGlobalHype';

afterEach(() => cleanup());

function darkHorse(triggeredAt: number, songTitle = '測試歌', toRank = 2): DarkHorseEvent {
    return { songId: 's' + triggeredAt, songTitle, songArtist: 'a', fromRank: 8, toRank, voteCount: 10, triggeredAt };
}
function hype(triggeredAt: number, level: 1 | 2 | 3 = 2, count = 100): HypeEvent {
    return { level, count, triggeredAt };
}

type Props = Parameters<typeof useMissedHypeReplay>[0];

describe('useMissedHypeReplay', () => {
    it('hard 期間的黑馬 → 不立即回呼；hard 結束時補播', () => {
        const onReplay = vi.fn();
        const { rerender } = renderHook((p: Props) => useMissedHypeReplay(p), {
            initialProps: { composingLevel: 'hard', darkHorseEvent: null, hypeEvent: null, onReplay } as Props,
        });

        // hard 期間發生黑馬
        rerender({ composingLevel: 'hard', darkHorseEvent: darkHorse(1, '小幸運', 2), hypeEvent: null, onReplay });
        expect(onReplay).not.toHaveBeenCalled();

        // 打完字（hard → null）→ 補播
        rerender({ composingLevel: null, darkHorseEvent: darkHorse(1, '小幸運', 2), hypeEvent: null, onReplay });
        expect(onReplay).toHaveBeenCalledTimes(1);
        expect(onReplay.mock.calls[0][0][0]).toContain('小幸運');
        expect(onReplay.mock.calls[0][0][0]).toContain('黑馬');
    });

    it('非 hard（null/soft）期間發生的事件不算錯過', () => {
        const onReplay = vi.fn();
        const { rerender } = renderHook((p: Props) => useMissedHypeReplay(p), {
            initialProps: { composingLevel: null, darkHorseEvent: null, hypeEvent: null, onReplay } as Props,
        });

        // 沒在 hard → 黑馬照常（不記錄）
        rerender({ composingLevel: null, darkHorseEvent: darkHorse(1), hypeEvent: null, onReplay });
        // soft 期間也不算錯過
        rerender({ composingLevel: 'soft', darkHorseEvent: darkHorse(2), hypeEvent: null, onReplay });
        rerender({ composingLevel: null, darkHorseEvent: darkHorse(2), hypeEvent: null, onReplay });

        expect(onReplay).not.toHaveBeenCalled();
    });

    it('同一事件（相同 triggeredAt）只記一次', () => {
        const onReplay = vi.fn();
        const ev = darkHorse(7);
        const { rerender } = renderHook((p: Props) => useMissedHypeReplay(p), {
            initialProps: { composingLevel: 'hard', darkHorseEvent: null, hypeEvent: null, onReplay } as Props,
        });

        rerender({ composingLevel: 'hard', darkHorseEvent: ev, hypeEvent: null, onReplay });
        // 同一事件物件多次 render（triggeredAt 不變）→ 不重複記
        rerender({ composingLevel: 'hard', darkHorseEvent: ev, hypeEvent: null, onReplay });
        rerender({ composingLevel: null, darkHorseEvent: ev, hypeEvent: null, onReplay });

        expect(onReplay).toHaveBeenCalledTimes(1);
        expect(onReplay.mock.calls[0][0]).toHaveLength(1);
    });

    it('黑馬 + 全站熱度都會被補播（最多 3 筆，取最新）', () => {
        const onReplay = vi.fn();
        const { rerender } = renderHook((p: Props) => useMissedHypeReplay(p), {
            initialProps: { composingLevel: 'hard', darkHorseEvent: null, hypeEvent: null, onReplay } as Props,
        });

        rerender({ composingLevel: 'hard', darkHorseEvent: darkHorse(1, 'A'), hypeEvent: null, onReplay });
        rerender({ composingLevel: 'hard', darkHorseEvent: darkHorse(1, 'A'), hypeEvent: hype(2, 3, 200), onReplay });
        rerender({ composingLevel: null, darkHorseEvent: darkHorse(1, 'A'), hypeEvent: hype(2, 3, 200), onReplay });

        expect(onReplay).toHaveBeenCalledTimes(1);
        const labels = onReplay.mock.calls[0][0];
        expect(labels.length).toBe(2);
        expect(labels.some((l: string) => l.includes('黑馬'))).toBe(true);
        expect(labels.some((l: string) => l.includes('失控狀態') || l.includes('200'))).toBe(true);
    });

    it('hard → soft 也視為結束 → 補播', () => {
        const onReplay = vi.fn();
        const { rerender } = renderHook((p: Props) => useMissedHypeReplay(p), {
            initialProps: { composingLevel: 'hard', darkHorseEvent: null, hypeEvent: null, onReplay } as Props,
        });
        rerender({ composingLevel: 'hard', darkHorseEvent: darkHorse(1), hypeEvent: null, onReplay });
        rerender({ composingLevel: 'soft', darkHorseEvent: darkHorse(1), hypeEvent: null, onReplay });
        expect(onReplay).toHaveBeenCalledTimes(1);
    });
});
