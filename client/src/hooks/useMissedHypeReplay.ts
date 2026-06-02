// 被抑制事件補播佇列
//
// 使用者填表單（hard 防干擾）時，全螢幕慶祝覆蓋層被完全暫停，可能剛好錯過
// 「黑馬時刻」「全站熱度」這類現場高潮。此 hook 在 hard 期間把這些重要事件
// 記進佇列，等使用者打完字（hard 結束）再用一則精簡提示補播「剛剛你錯過了…」。
//
// 只攔 hard（表單）；soft（搜尋）覆蓋層仍淡化可見、不算錯過。
// 連擊（combo）由使用者自己投票觸發，打字時不會發生，故不納入。
import { useEffect, useRef } from 'react';
import type { ComposingLevel } from '@/lib/composingGuard';
import type { DarkHorseEvent } from './useDarkHorse';
import { HYPE_META, type HypeEvent } from './useGlobalHype';

interface UseMissedHypeReplayOptions {
    composingLevel: ComposingLevel | null;
    darkHorseEvent: DarkHorseEvent | null;
    hypeEvent: HypeEvent | null;
    /** hard 結束時若有錯過的事件，會帶著精簡標籤清單回呼（最多 3 筆，新到舊） */
    onReplay: (missedLabels: string[]) => void;
}

export function useMissedHypeReplay({
    composingLevel,
    darkHorseEvent,
    hypeEvent,
    onReplay,
}: UseMissedHypeReplayOptions): void {
    const missed = useRef<string[]>([]);
    const seenDarkHorseAt = useRef<number>(0);
    const seenHypeAt = useRef<number>(0);
    const prevLevel = useRef<ComposingLevel | null>(composingLevel);

    // hard 期間發生的黑馬時刻 → 記進佇列（用 triggeredAt 去重）
    useEffect(() => {
        if (composingLevel !== 'hard' || !darkHorseEvent) return;
        if (darkHorseEvent.triggeredAt === seenDarkHorseAt.current) return;
        seenDarkHorseAt.current = darkHorseEvent.triggeredAt;
        missed.current.push(`🐎 黑馬時刻：「${darkHorseEvent.songTitle}」衝進第 ${darkHorseEvent.toRank} 名`);
    }, [composingLevel, darkHorseEvent]);

    // hard 期間發生的全站熱度 → 記進佇列
    useEffect(() => {
        if (composingLevel !== 'hard' || !hypeEvent) return;
        if (hypeEvent.triggeredAt === seenHypeAt.current) return;
        seenHypeAt.current = hypeEvent.triggeredAt;
        const meta = HYPE_META[hypeEvent.level];
        missed.current.push(`${meta.emoji} ${meta.label}：全站 ${hypeEvent.count} 票`);
    }, [composingLevel, hypeEvent]);

    // hard → 非 hard 轉換：若有錯過事件就補播（最多列 3 筆，取最新）
    useEffect(() => {
        const was = prevLevel.current;
        prevLevel.current = composingLevel;
        if (was === 'hard' && composingLevel !== 'hard' && missed.current.length > 0) {
            const labels = missed.current.slice(-3);
            missed.current = [];
            onReplay(labels);
        }
    }, [composingLevel, onReplay]);
}
