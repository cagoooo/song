// 相似建議分組（純函式，便於測試）
//
// 同一首歌常被多人用略不同的寫法推薦。複用 duplicateSong 的標準化 + Dice 相似度，
// 把相似的推薦聚成一組，方便管理員一次處理 + 看到合計票數（群眾訊號）。
import { normalizeTitle, titleSimilarity } from '@/lib/duplicateSong';
import type { SongSuggestion } from '@/lib/firestore';

export interface SuggestionGroup {
    /** 代表標題（標準化後），作為群組 key */
    key: string;
    /** 顯示用：群組第一筆的原始標題 */
    title: string;
    items: SongSuggestion[];
    totalUpvotes: number;
}

/**
 * 把相似的建議分組（僅回傳 2 筆以上的群組，依組員數遞減排序）。
 * @param threshold 相似度門檻（預設 0.8，與送出端一致）
 */
export function groupSimilarSuggestions(
    suggestions: SongSuggestion[],
    threshold = 0.8,
): SuggestionGroup[] {
    const buckets: { norm: string; title: string; items: SongSuggestion[] }[] = [];

    for (const s of suggestions) {
        const norm = normalizeTitle(s.title);
        if (!norm) continue;
        const hit = buckets.find(
            (b) => b.norm === norm || titleSimilarity(b.norm, norm) >= threshold,
        );
        if (hit) hit.items.push(s);
        else buckets.push({ norm, title: s.title, items: [s] });
    }

    return buckets
        .filter((b) => b.items.length >= 2)
        .map((b) => ({
            key: b.norm,
            title: b.title,
            items: b.items,
            totalUpvotes: b.items.reduce((sum, x) => sum + (x.upvotes ?? 0), 0),
        }))
        .sort((a, b) => b.items.length - a.items.length);
}
